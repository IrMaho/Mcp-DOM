import {
  DOMSnapshot,
  LogicalNodeId,
  VirtualDOMNode,
  VirtualDOMNodeType,
} from '../types/dom-node';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';

export class SnapshotEngine {
  private registry: NodeRegistry;
  private privacy: PrivacyEngine;
  private sequenceCounter: SequenceCounter;

  constructor(registry: NodeRegistry, privacy: PrivacyEngine, sequenceCounter: SequenceCounter) {
    this.registry = registry;
    this.privacy = privacy;
    this.sequenceCounter = sequenceCounter;
  }

  public captureSnapshot(doc: Document = document, sessionId: string = ''): DOMSnapshot {
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const sequence = this.sequenceCounter.nextSequence();
    const nodes: Record<LogicalNodeId, VirtualDOMNode> = {};

    const rootElement = doc.documentElement || doc.body;
    const rootId = this.registry.getOrCreateId(doc, timestamp);

    // Document node
    nodes[rootId] = {
      id: rootId,
      nodeType: VirtualDOMNodeType.DOCUMENT_NODE,
      tagName: '#document',
      children: [],
      parentId: null,
    };

    if (doc.doctype) {
      const doctypeId = this.registry.getOrCreateId(doc.doctype, timestamp);
      nodes[doctypeId] = {
        id: doctypeId,
        nodeType: VirtualDOMNodeType.DOCUMENT_TYPE_NODE,
        tagName: doc.doctype.name || 'html',
        parentId: rootId,
      };
      nodes[rootId].children!.push(doctypeId);
    }

    if (rootElement) {
      const docElementId = this.serializeNode(rootElement, rootId, nodes, timestamp);
      if (docElementId) {
        nodes[rootId].children!.push(docElementId);
      }
    }

    const viewport = this.getViewportInfo();

    return {
      snapshotId: `snap_${sequence}_${Date.now()}`,
      sessionId,
      timestamp,
      sequence,
      rootId,
      nodes,
      title: doc.title || '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      viewport,
      doctype: doc.doctype ? doc.doctype.name : undefined,
      totalNodeCount: Object.keys(nodes).length,
    };
  }

  public serializeNode(
    node: Node,
    parentId: LogicalNodeId | null,
    nodesAcc: Record<LogicalNodeId, VirtualDOMNode>,
    timestamp: number
  ): LogicalNodeId | null {
    if (!node) return null;

    // Check block list for elements
    if (node.nodeType === Node.ELEMENT_NODE && this.privacy.shouldBlockNode(node as Element)) {
      return null;
    }

    const id = this.registry.getOrCreateId(node, timestamp);
    this.registry.recordParent(id, parentId);

    const vNode: VirtualDOMNode = {
      id,
      nodeType: node.nodeType as VirtualDOMNodeType,
      parentId,
    };

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      vNode.tagName = element.tagName.toLowerCase();
      vNode.isCustomElement = vNode.tagName.includes('-');
      vNode.namespaceURI = element.namespaceURI;

      // Extract attributes
      const attributes: Record<string, string> = {};
      if (element.attributes) {
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          let val = attr.value;
          if (attr.name.toLowerCase() === 'value' && element.tagName.toLowerCase() === 'input') {
            const inputType = element.getAttribute('type') || 'text';
            val = this.privacy.maskValue(val, inputType, element.getAttribute('name') || undefined);
          }
          attributes[attr.name] = val;
        }
      }

      // Handle input / textarea / select live values
      if (element.tagName.toLowerCase() === 'input') {
        const input = element as HTMLInputElement;
        const inputType = input.type || 'text';
        attributes['value'] = this.privacy.maskValue(input.value, inputType, input.name);
        if (input.checked) {
          attributes['checked'] = 'true';
        }
      } else if (element.tagName.toLowerCase() === 'textarea') {
        const textarea = element as HTMLTextAreaElement;
        vNode.textContent = this.privacy.maskValue(textarea.value, 'textarea', textarea.name);
      } else if (element.tagName.toLowerCase() === 'select') {
        const select = element as HTMLSelectElement;
        attributes['value'] = select.value;
      }

      vNode.attributes = attributes;

      // Compute visibility and bounding box if in browser window
      this.enrichElementMetrics(element, vNode);

      // Serialize Shadow Root if present
      if (element.shadowRoot) {
        vNode.isShadowHost = true;
        const shadowId = this.registry.getOrCreateId(element.shadowRoot, timestamp);
        const shadowVNode: VirtualDOMNode = {
          id: shadowId,
          nodeType: VirtualDOMNodeType.DOCUMENT_FRAGMENT_NODE,
          isShadowRoot: true,
          shadowMode: element.shadowRoot.mode as 'open' | 'closed',
          parentId: id,
          children: [],
        };
        nodesAcc[shadowId] = shadowVNode;

        for (let i = 0; i < element.shadowRoot.childNodes.length; i++) {
          const childNode = element.shadowRoot.childNodes[i];
          const childId = this.serializeNode(childNode, shadowId, nodesAcc, timestamp);
          if (childId) {
            shadowVNode.children!.push(childId);
          }
        }
      }

      // Serialize standard child nodes
      vNode.children = [];
      for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i];
        const childId = this.serializeNode(childNode, id, nodesAcc, timestamp);
        if (childId) {
          vNode.children.push(childId);
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const parentElement = node.parentElement;
      const isMasked = parentElement ? this.privacy.shouldMaskText(parentElement) : false;
      vNode.textContent = this.privacy.sanitizeText(node.textContent || '', isMasked);
    } else if (node.nodeType === Node.COMMENT_NODE) {
      vNode.textContent = node.textContent || '';
    }

    nodesAcc[id] = vNode;
    return id;
  }

  private enrichElementMetrics(element: HTMLElement, vNode: VirtualDOMNode): void {
    try {
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const style = window.getComputedStyle(element);
        const isDisplayNone = style.display === 'none';
        const isVisibilityHidden = style.visibility === 'hidden' || style.visibility === 'collapse';
        const isOpacityZero = parseFloat(style.opacity || '1') === 0;

        vNode.isHidden = isDisplayNone || isVisibilityHidden || isOpacityZero;

        // Bounding rect
        if (element.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          vNode.boundingClientRect = {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            bottom: Math.round(rect.bottom),
            right: Math.round(rect.right),
          };
        }
      }
    } catch {
      // Ignored for non-standard elements
    }
  }

  private getViewportInfo() {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 };
    }
    return {
      width: window.innerWidth || document.documentElement?.clientWidth || 1920,
      height: window.innerHeight || document.documentElement?.clientHeight || 1080,
      scrollX: window.scrollX || window.pageXOffset || 0,
      scrollY: window.scrollY || window.pageYOffset || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  }
}
