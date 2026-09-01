import {
  BaseEvent,
  DOMAddEvent,
  DOMAttrEvent,
  DOMRemoveEvent,
  DOMTextEvent,
} from '../types/events';
import { LogicalNodeId, VirtualDOMNode } from '../types/dom-node';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
import { SnapshotEngine } from './snapshot-engine';

export type MutationEventCallback = (event: BaseEvent) => void;

export class DOMMutationObserver {
  private observer: MutationObserver | null = null;
  private registry: NodeRegistry;
  private privacy: PrivacyEngine;
  private sequenceCounter: SequenceCounter;
  private snapshotEngine: SnapshotEngine;
  private callback: MutationEventCallback;
  private sessionId: string;
  private isObserving: boolean = false;

  constructor(
    registry: NodeRegistry,
    privacy: PrivacyEngine,
    sequenceCounter: SequenceCounter,
    snapshotEngine: SnapshotEngine,
    callback: MutationEventCallback,
    sessionId: string = ''
  ) {
    this.registry = registry;
    this.privacy = privacy;
    this.sequenceCounter = sequenceCounter;
    this.snapshotEngine = snapshotEngine;
    this.callback = callback;
    this.sessionId = sessionId;
  }

  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  public start(target: Node = document): void {
    if (this.isObserving) return;
    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(target, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    });
    this.isObserving = true;
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isObserving = false;
  }

  public takeRecords(): void {
    if (this.observer) {
      const records = this.observer.takeRecords();
      if (records.length > 0) {
        this.handleMutations(records);
      }
    }
  }

  private handleMutations(mutations: MutationRecord[]): void {
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();

    for (let i = 0; i < mutations.length; i++) {
      const record = mutations[i];
      try {
        switch (record.type) {
          case 'childList':
            this.handleChildListMutation(record, timestamp, wallClockTime);
            break;
          case 'attributes':
            this.handleAttributeMutation(record, timestamp, wallClockTime);
            break;
          case 'characterData':
            this.handleCharacterDataMutation(record, timestamp, wallClockTime);
            break;
        }
      } catch (err) {
        // Continue handling subsequent mutations safely
        if (typeof console !== 'undefined') {
          console.error('[DOMMutationObserver] Error processing mutation:', err);
        }
      }
    }
  }

  private handleChildListMutation(
    record: MutationRecord,
    timestamp: number,
    wallClockTime: number
  ): void {
    const parent = record.target;
    const parentId = this.registry.getOrCreateId(parent, timestamp);
    const parentElement = parent.nodeType === Node.ELEMENT_NODE ? (parent as Element) : null;
    const parentSelector = parentElement ? this.registry.computeSelector(parentElement) : undefined;

    // 1. Process Removed Nodes
    if (record.removedNodes && record.removedNodes.length > 0) {
      for (let j = 0; j < record.removedNodes.length; j++) {
        const removedNode = record.removedNodes[j];
        const removedId = this.registry.getId(removedNode);
        if (!removedId) continue;

        const isElement = removedNode.nodeType === Node.ELEMENT_NODE;
        const elem = isElement ? (removedNode as Element) : null;
        const selectorHint = elem ? this.registry.computeSelector(elem) : undefined;

        const sequence = this.sequenceCounter.nextSequence();
        const removeEvent: DOMRemoveEvent = {
          id: this.sequenceCounter.generateEventId('mut_rem'),
          sessionId: this.sessionId,
          timestamp,
          sequence,
          wallClockTime,
          type: 'DOM_MUTATION_REMOVE',
          category: 'DOM',
          source: 'BROWSER_RUNTIME',
          targetNodeId: removedId,
          targetSelector: selectorHint,
          payload: {
            nodeId: removedId,
            tagName: elem ? elem.tagName.toLowerCase() : undefined,
            parentId,
            index: j,
            selectorHint,
            removedSubtreeNodeCount: isElement ? elem!.querySelectorAll('*').length + 1 : 1,
          },
        };

        this.callback(removeEvent);
      }
    }

    // 2. Process Added Nodes
    if (record.addedNodes && record.addedNodes.length > 0) {
      for (let j = 0; j < record.addedNodes.length; j++) {
        const addedNode = record.addedNodes[j];

        if (addedNode.nodeType === Node.ELEMENT_NODE && this.privacy.shouldBlockNode(addedNode as Element)) {
          continue;
        }

        const nodesAcc: Record<LogicalNodeId, VirtualDOMNode> = {};
        const addedId = this.snapshotEngine.serializeNode(addedNode, parentId, nodesAcc, timestamp);
        if (!addedId || !nodesAcc[addedId]) continue;

        const prevSibling = record.previousSibling ? this.registry.getId(record.previousSibling) : null;
        const nextSibling = record.nextSibling ? this.registry.getId(record.nextSibling) : null;

        const isElement = addedNode.nodeType === Node.ELEMENT_NODE;
        const elem = isElement ? (addedNode as Element) : null;
        const selectorHint = elem ? this.registry.computeSelector(elem) : undefined;

        const sequence = this.sequenceCounter.nextSequence();
        const addEvent: DOMAddEvent = {
          id: this.sequenceCounter.generateEventId('mut_add'),
          sessionId: this.sessionId,
          timestamp,
          sequence,
          wallClockTime,
          type: 'DOM_MUTATION_ADD',
          category: 'DOM',
          source: 'BROWSER_RUNTIME',
          targetNodeId: addedId,
          targetSelector: selectorHint,
          payload: {
            node: nodesAcc[addedId],
            parentId,
            previousSiblingId: prevSibling,
            nextSiblingId: nextSibling,
            index: j,
          },
        };

        this.callback(addEvent);
      }
    }
  }

  private handleAttributeMutation(
    record: MutationRecord,
    timestamp: number,
    wallClockTime: number
  ): void {
    const target = record.target;
    if (target.nodeType !== Node.ELEMENT_NODE) return;

    const element = target as HTMLElement;
    if (this.privacy.shouldBlockNode(element)) return;

    const nodeId = this.registry.getOrCreateId(element, timestamp);
    const attrName = record.attributeName;
    if (!attrName) return;

    let newValue = element.getAttribute(attrName);
    if (attrName.toLowerCase() === 'value' && element.tagName.toLowerCase() === 'input') {
      const input = element as HTMLInputElement;
      newValue = this.privacy.maskValue(input.value, input.type, input.name);
    }

    const oldValue = record.oldValue;
    if (oldValue === newValue) return; // Deduplicate identical attribute values

    const selector = this.registry.computeSelector(element);
    const sequence = this.sequenceCounter.nextSequence();

    const attrEvent: DOMAttrEvent = {
      id: this.sequenceCounter.generateEventId('mut_attr'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type: 'DOM_MUTATION_ATTR',
      category: 'DOM',
      source: 'BROWSER_RUNTIME',
      targetNodeId: nodeId,
      targetSelector: selector,
      payload: {
        nodeId,
        attributeName: attrName,
        oldValue,
        newValue,
        selectorHint: selector,
      },
    };

    this.callback(attrEvent);
  }

  private handleCharacterDataMutation(
    record: MutationRecord,
    timestamp: number,
    wallClockTime: number
  ): void {
    const target = record.target;
    const parentElement = target.parentElement;
    if (parentElement && this.privacy.shouldBlockNode(parentElement)) {
      return;
    }
    const nodeId = this.registry.getOrCreateId(target, timestamp);
    const parentId = parentElement ? this.registry.getId(parentElement) || null : null;
    const isMasked = parentElement ? this.privacy.shouldMaskText(parentElement) : false;

    const newRawText = target.textContent || '';
    const newText = this.privacy.sanitizeText(newRawText, isMasked);
    const oldText = record.oldValue ? this.privacy.sanitizeText(record.oldValue, isMasked) : '';

    if (oldText === newText) return;

    const sequence = this.sequenceCounter.nextSequence();
    const textEvent: DOMTextEvent = {
      id: this.sequenceCounter.generateEventId('mut_txt'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type: 'DOM_MUTATION_TEXT',
      category: 'DOM',
      source: 'BROWSER_RUNTIME',
      targetNodeId: nodeId,
      targetSelector: parentElement ? this.registry.computeSelector(parentElement) : undefined,
      payload: {
        nodeId,
        parentId,
        oldText,
        newText,
      },
    };

    this.callback(textEvent);
  }
}
