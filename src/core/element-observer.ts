import {
  ElementObservationBundle,
  LiveElementInfo,
  LiveElementTarget,
  LiveScreenshotResult,
} from '../types/browser-control';
import { BaseEvent } from '../types/events';
import { DisappearingElementAnalyzer } from '../lifecycle/disappearing-analyzer';
import { LiveDOMInspector } from './live-dom-inspector';
import { NodeRegistry } from './node-registry';
import { SequenceCounter } from './sequence-counter';

export class ElementObserver {
  private activeObservation: {
    observationId: string;
    targetElement: Element;
    targetSelector: string;
    startTime: number;
    initialState: LiveElementInfo;
    observer: MutationObserver;
    events: BaseEvent[];
    screenshots: LiveScreenshotResult[];
  } | null = null;

  private registry?: NodeRegistry;
  private sequenceCounter: SequenceCounter;

  constructor(registry?: NodeRegistry) {
    this.registry = registry;
    this.sequenceCounter = new SequenceCounter();
  }

  public isObserving(): boolean {
    return this.activeObservation !== null;
  }

  /**
   * Start focused observation on a specific element
   */
  public startObservation(
    targetElement: Element,
    doc: Document = document
  ): { observationId: string; initialState: LiveElementInfo } {
    if (this.activeObservation) {
      this.stopObservation(doc);
    }

    const observationId = `obs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();
    const initialState = LiveDOMInspector.inspectElement(targetElement, this.registry);
    const targetSelector = initialState.bestSelector;
    const events: BaseEvent[] = [];

    // Register initial add event in local stream for forensics
    const initialNodeId = this.registry ? this.registry.getOrCreateId(targetElement, 0) : 100;
    events.push({
      id: `evt_init_${observationId}`,
      sessionId: observationId,
      timestamp: 0,
      sequence: 1,
      wallClockTime: startTime,
      type: 'DOM_MUTATION_ADD',
      category: 'DOM',
      source: 'BROWSER_RUNTIME',
      targetNodeId: initialNodeId,
      targetSelector,
      payload: {
        node: {
          id: initialNodeId,
          nodeType: 1,
          tagName: initialState.tag,
          attributes: initialState.attributes,
          textContent: initialState.text,
          children: [],
          parentId: null,
        },
        parentId: null,
        index: 0,
      },
    });

    const observer = new MutationObserver((mutations) => {
      const relTime = Date.now() - startTime;
      for (const mut of mutations) {
        if (mut.type === 'childList') {
          // Check removed nodes
          for (let i = 0; i < mut.removedNodes.length; i++) {
            const removed = mut.removedNodes[i];
            if (removed instanceof Element) {
              const remNodeId = this.registry ? this.registry.getId(removed) || undefined : undefined;
              const parentNodeId = mut.target instanceof Element && this.registry ? this.registry.getId(mut.target) || undefined : undefined;

              events.push({
                id: `evt_rem_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                sessionId: observationId,
                timestamp: relTime,
                sequence: this.sequenceCounter.nextSequence(),
                wallClockTime: Date.now(),
                type: 'DOM_MUTATION_REMOVE',
                category: 'DOM',
                source: 'PAGE',
                targetNodeId: remNodeId,
                targetSelector: LiveDOMInspector.computeBestSelector(removed),
                payload: {
                  nodeId: remNodeId || 0,
                  parentId: parentNodeId || null,
                  index: i,
                  removedSubtreeNodeCount: 1,
                },
              });
            }
          }

          // Check added nodes
          for (let i = 0; i < mut.addedNodes.length; i++) {
            const added = mut.addedNodes[i];
            if (added instanceof Element) {
              const addNodeId = this.registry ? this.registry.getOrCreateId(added, relTime) : undefined;
              events.push({
                id: `evt_add_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                sessionId: observationId,
                timestamp: relTime,
                sequence: this.sequenceCounter.nextSequence(),
                wallClockTime: Date.now(),
                type: 'DOM_MUTATION_ADD',
                category: 'DOM',
                source: 'PAGE',
                targetNodeId: addNodeId,
                targetSelector: LiveDOMInspector.computeBestSelector(added),
                payload: {
                  node: {
                    id: addNodeId || 0,
                    nodeType: 1,
                    tagName: added.tagName.toLowerCase(),
                    attributes: {},
                    children: [],
                    parentId: null,
                  },
                  parentId: null,
                  index: i,
                },
              });
            }
          }
        } else if (mut.type === 'attributes' && mut.target instanceof Element) {
          const attrNodeId = this.registry ? this.registry.getId(mut.target) || undefined : undefined;
          const attrName = mut.attributeName || 'class';
          events.push({
            id: `evt_attr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            sessionId: observationId,
            timestamp: relTime,
            sequence: this.sequenceCounter.nextSequence(),
            wallClockTime: Date.now(),
            type: 'DOM_MUTATION_ATTR',
            category: 'DOM',
            source: 'PAGE',
            targetNodeId: attrNodeId,
            targetSelector: LiveDOMInspector.computeBestSelector(mut.target),
            payload: {
              nodeId: attrNodeId || 0,
              attributeName: attrName,
              oldValue: mut.oldValue || '',
              newValue: mut.target.getAttribute(attrName) || '',
            },
          });
        }
      }
    });

    try {
      observer.observe(doc.body || doc.documentElement, {
        childList: true,
        attributes: true,
        attributeOldValue: true,
        subtree: true,
      });
    } catch {
      // Ignored
    }

    this.activeObservation = {
      observationId,
      targetElement,
      targetSelector,
      startTime,
      initialState,
      observer,
      events,
      screenshots: [],
    };

    return { observationId, initialState };
  }

  public recordExternalEvent(event: BaseEvent): void {
    if (this.activeObservation) {
      this.activeObservation.events.push(event);
    }
  }

  public recordScreenshot(screenshot: LiveScreenshotResult): void {
    if (this.activeObservation) {
      this.activeObservation.screenshots.push(screenshot);
    }
  }

  /**
   * Stop focused observation and assemble correlation bundle
   */
  public stopObservation(doc: Document = document): ElementObservationBundle {
    if (!this.activeObservation) {
      throw new Error('No active element observation in progress');
    }

    const {
      observationId,
      targetElement,
      targetSelector,
      startTime,
      initialState,
      observer,
      events,
      screenshots,
    } = this.activeObservation;

    observer.disconnect();
    this.activeObservation = null;

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // Check if target is still connected in document
    const isStillAttached = doc.contains(targetElement);
    let finalState: LiveElementInfo | null = null;
    let disappeared = false;
    let disappearanceReason: string | undefined = undefined;

    if (isStillAttached) {
      finalState = LiveDOMInspector.inspectElement(targetElement, this.registry);
      if (
        finalState.visibility.display === 'none' ||
        finalState.visibility.visibility === 'hidden' ||
        finalState.visibility.opacity === 0
      ) {
        disappeared = true;
        disappearanceReason = `Element remains attached but is visually obscured (display: ${finalState.visibility.display}, opacity: ${finalState.visibility.opacity})`;
      }
    } else {
      disappeared = true;
      disappearanceReason = 'Element was unmounted/removed from the live DOM tree';
    }

    // Correlate with DisappearingElementAnalyzer if disappeared
    let correlationReport: ElementObservationBundle['correlationReport'] = undefined;
    if (disappeared && events.length > 0) {
      correlationReport = DisappearingElementAnalyzer.analyze(targetSelector, events);
    }

    return {
      observationId,
      targetSelector,
      targetNodeId: initialState.forensics?.logicalNodeId || undefined,
      startTime,
      endTime,
      durationMs,
      initialState,
      finalState,
      disappeared,
      disappearanceReason,
      mutations: events.filter((e) => e.category === 'DOM'),
      diagnostics: events.filter((e) => e.category === 'ERROR' || e.category === 'CONSOLE'),
      networkEvents: events.filter((e) => e.category === 'NETWORK'),
      screenshots,
      correlationReport,
    };
  }
}
