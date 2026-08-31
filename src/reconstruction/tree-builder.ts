import { LogicalNodeId, VirtualDOMNode, VirtualDOMNodeType } from '../types/dom-node';
import {
  DOMAddNodePayload,
  DOMAttrChangePayload,
  DOMMoveNodePayload,
  DOMRemoveNodePayload,
  DOMTextChangePayload,
} from '../types/events';

export class VirtualTreeBuilder {
  private nodes: Record<LogicalNodeId, VirtualDOMNode> = {};
  private rootId: LogicalNodeId;

  constructor(initialNodes: Record<LogicalNodeId, VirtualDOMNode> = {}, rootId: LogicalNodeId = 1) {
    this.rootId = rootId;
    this.loadFromNodes(initialNodes);
  }

  public getRootId(): LogicalNodeId {
    return this.rootId;
  }

  public setRootId(rootId: LogicalNodeId): void {
    this.rootId = rootId;
  }

  public getNodes(): Record<LogicalNodeId, VirtualDOMNode> {
    return this.nodes;
  }

  public getNode(id: LogicalNodeId): VirtualDOMNode | undefined {
    return this.nodes[id];
  }

  public hasNode(id: LogicalNodeId): boolean {
    return !!this.nodes[id];
  }

  public loadFromNodes(sourceNodes: Record<LogicalNodeId, VirtualDOMNode>): void {
    this.nodes = {};
    for (const [key, node] of Object.entries(sourceNodes)) {
      const id = Number(key);
      this.nodes[id] = {
        ...node,
        attributes: node.attributes ? { ...node.attributes } : {},
        children: node.children ? [...node.children] : [],
        computedStyles: node.computedStyles ? { ...node.computedStyles } : undefined,
        boundingClientRect: node.boundingClientRect ? { ...node.boundingClientRect } : undefined,
      };
    }
  }

  public clone(): VirtualTreeBuilder {
    const cloned = new VirtualTreeBuilder({}, this.rootId);
    cloned.loadFromNodes(this.nodes);
    return cloned;
  }

  public applyAdd(payload: DOMAddNodePayload): void {
    const node = payload.node;
    if (!node) return;

    // Deep add node and its children recursively if not present
    this.addNodeRecursive(node);

    // Attach to parent
    const parentId = payload.parentId;
    if (parentId && this.nodes[parentId]) {
      const parent = this.nodes[parentId];
      if (!parent.children) parent.children = [];

      node.parentId = parentId;

      // Remove from children if already present
      const existingIdx = parent.children.indexOf(node.id);
      if (existingIdx !== -1) {
        parent.children.splice(existingIdx, 1);
      }

      // Sibling insertion logic
      if (payload.previousSiblingId && this.nodes[payload.previousSiblingId]) {
        const prevIdx = parent.children.indexOf(payload.previousSiblingId);
        if (prevIdx !== -1) {
          parent.children.splice(prevIdx + 1, 0, node.id);
          return;
        }
      }

      if (payload.nextSiblingId && this.nodes[payload.nextSiblingId]) {
        const nextIdx = parent.children.indexOf(payload.nextSiblingId);
        if (nextIdx !== -1) {
          parent.children.splice(nextIdx, 0, node.id);
          return;
        }
      }

      // Index insertion fallback
      if (typeof payload.index === 'number' && payload.index >= 0 && payload.index <= parent.children.length) {
        parent.children.splice(payload.index, 0, node.id);
      } else {
        parent.children.push(node.id);
      }
    }
  }

  public applyRemove(payload: DOMRemoveNodePayload): void {
    const nodeId = payload.nodeId;
    const node = this.nodes[nodeId];
    if (!node) return;

    const parentId = payload.parentId || node.parentId;
    if (parentId && this.nodes[parentId]) {
      const parent = this.nodes[parentId];
      if (parent.children) {
        const idx = parent.children.indexOf(nodeId);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
        }
      }
    }

    node.isDetached = true;
    node.parentId = null;
    // Note: we keep the node in this.nodes with isDetached=true so historical queries and diffs can inspect it
  }

  public applyMove(payload: DOMMoveNodePayload): void {
    const node = this.nodes[payload.nodeId];
    if (!node) return;

    // Remove from old parent
    const oldParentId = payload.oldParentId || node.parentId;
    if (oldParentId && this.nodes[oldParentId]) {
      const oldParent = this.nodes[oldParentId];
      if (oldParent.children) {
        const idx = oldParent.children.indexOf(payload.nodeId);
        if (idx !== -1) {
          oldParent.children.splice(idx, 1);
        }
      }
    }

    // Add to new parent
    const newParentId = payload.newParentId;
    if (newParentId && this.nodes[newParentId]) {
      const newParent = this.nodes[newParentId];
      if (!newParent.children) newParent.children = [];

      node.parentId = newParentId;
      node.isDetached = false;

      if (typeof payload.newIndex === 'number' && payload.newIndex >= 0 && payload.newIndex <= newParent.children.length) {
        newParent.children.splice(payload.newIndex, 0, payload.nodeId);
      } else {
        newParent.children.push(payload.nodeId);
      }
    }
  }

  public applyAttrChange(payload: DOMAttrChangePayload): void {
    const node = this.nodes[payload.nodeId];
    if (!node) return;

    if (!node.attributes) {
      node.attributes = {};
    }

    if (payload.newValue === null) {
      delete node.attributes[payload.attributeName];
    } else {
      node.attributes[payload.attributeName] = payload.newValue;
    }

    // Check style / class impacts on visibility
    if (payload.attributeName.toLowerCase() === 'class') {
      const classVal = payload.newValue || '';
      if (/\b(hidden|hide|d-none|invisible|sr-only|collapsed)\b/i.test(classVal)) {
        node.isHidden = true;
      }
    } else if (payload.attributeName.toLowerCase() === 'style') {
      const styleVal = payload.newValue || '';
      if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(styleVal)) {
        node.isHidden = true;
      }
    }
  }

  public applyTextChange(payload: DOMTextChangePayload): void {
    const node = this.nodes[payload.nodeId];
    if (!node) return;
    node.textContent = payload.newText;
  }

  private addNodeRecursive(node: VirtualDOMNode): void {
    this.nodes[node.id] = {
      ...node,
      attributes: node.attributes ? { ...node.attributes } : {},
      children: node.children ? [...node.children] : [],
      isDetached: false,
    };
  }

  public toHTML(nodeId: LogicalNodeId = this.rootId, indent: number = 0): string {
    const node = this.nodes[nodeId];
    if (!node) return '';

    const spacing = '  '.repeat(indent);

    if (node.nodeType === VirtualDOMNodeType.DOCUMENT_NODE) {
      return (node.children || []).map((c) => this.toHTML(c, indent)).join('\n');
    }

    if (node.nodeType === VirtualDOMNodeType.DOCUMENT_TYPE_NODE) {
      return `<!DOCTYPE ${node.tagName || 'html'}>`;
    }

    if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === VirtualDOMNodeType.COMMENT_NODE) {
      return `${spacing}<!-- ${node.textContent || ''} -->`;
    }

    if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
      const tag = node.tagName || 'div';
      const attrs = Object.entries(node.attributes || {})
        .map(([k, v]) => `${k}="${this.escapeHtmlAttr(v)}"`)
        .join(' ');
      const attrStr = attrs.length > 0 ? ` ${attrs}` : '';

      const isSelfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag);
      if (isSelfClosing) {
        return `${spacing}<${tag}${attrStr} />`;
      }

      const children = node.children || [];
      if (children.length === 0) {
        if (node.textContent) {
          return `${spacing}<${tag}${attrStr}>${this.escapeHtmlText(node.textContent)}</${tag}>`;
        }
        return `${spacing}<${tag}${attrStr}></${tag}>`;
      }

      // If single text child
      if (children.length === 1 && this.nodes[children[0]]?.nodeType === VirtualDOMNodeType.TEXT_NODE) {
        const text = this.nodes[children[0]].textContent || '';
        return `${spacing}<${tag}${attrStr}>${this.escapeHtmlText(text)}</${tag}>`;
      }

      const inner = children.map((c) => this.toHTML(c, indent + 1)).join('\n');
      return `${spacing}<${tag}${attrStr}>\n${inner}\n${spacing}</${tag}>`;
    }

    return '';
  }

  private escapeHtmlAttr(str: string): string {
    return str.replace(/"/g, '&quot;');
  }

  private escapeHtmlText(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
