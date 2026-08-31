import { LogicalNodeId, NodeIdentity, VirtualDOMNodeType } from '../types/dom-node';

export class NodeRegistry {
  private nextId: LogicalNodeId = 1;
  private nodeToIdMap = new WeakMap<Node, LogicalNodeId>();
  private idToNodeMap = new Map<LogicalNodeId, Node>();
  private identities = new Map<LogicalNodeId, NodeIdentity>();
  private parentHistory = new Map<LogicalNodeId, LogicalNodeId[]>();

  public getOrCreateId(node: Node, timestamp: number = 0): LogicalNodeId {
    if (this.nodeToIdMap.has(node)) {
      return this.nodeToIdMap.get(node)!;
    }

    const id = this.nextId++;
    this.nodeToIdMap.set(node, id);
    this.idToNodeMap.set(id, node);

    const isElement = node.nodeType === VirtualDOMNodeType.ELEMENT_NODE || node.nodeType === 1;
    const element = isElement ? (node as Element) : null;
    const tagName = element && element.tagName ? element.tagName.toLowerCase() : undefined;
    const isCustomElement = tagName ? tagName.includes('-') : false;

    const identity: NodeIdentity = {
      id,
      nodeType: node.nodeType as VirtualDOMNodeType,
      tagName,
      createdAt: timestamp,
      initialSelectorHint: element ? this.computeSelector(element) : undefined,
      isCustomElement,
    };

    this.identities.set(id, identity);
    return id;
  }

  public getId(node: Node): LogicalNodeId | undefined {
    return this.nodeToIdMap.get(node);
  }

  public getNode(id: LogicalNodeId): Node | undefined {
    return this.idToNodeMap.get(id);
  }

  public getIdentity(id: LogicalNodeId): NodeIdentity | undefined {
    return this.identities.get(id);
  }

  public recordParent(nodeId: LogicalNodeId, parentId: LogicalNodeId | null): void {
    if (!parentId) return;
    const history = this.parentHistory.get(nodeId) || [];
    if (history[history.length - 1] !== parentId) {
      history.push(parentId);
      this.parentHistory.set(nodeId, history);
    }
  }

  public getParentHistory(nodeId: LogicalNodeId): LogicalNodeId[] {
    return this.parentHistory.get(nodeId) || [];
  }

  public computeSelector(element: Element): string {
    try {
      if (element.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(element.id)) {
        return `#${element.id}`;
      }

      const tagName = element.tagName.toLowerCase();
      if (tagName === 'body' || tagName === 'html' || tagName === 'head') {
        return tagName;
      }

      let classSelector = '';
      if (element.classList && element.classList.length > 0) {
        const classes = Array.from(element.classList)
          .filter((c) => /^[a-zA-Z0-9_-]+$/.test(c) && !c.startsWith('ng-') && !c.startsWith('_ng'))
          .slice(0, 3);
        if (classes.length > 0) {
          classSelector = '.' + classes.join('.');
        }
      }

      if (element.parentElement) {
        const siblings = Array.from(element.parentElement.children).filter(
          (s) => s.tagName.toLowerCase() === tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          return `${tagName}${classSelector}:nth-of-type(${index})`;
        }
      }

      return `${tagName}${classSelector}`;
    } catch {
      return element.tagName.toLowerCase();
    }
  }

  public computeFullSelectorPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current.tagName && current.tagName.toLowerCase() !== 'html') {
      const selector = this.computeSelector(current);
      path.unshift(selector);
      if (current.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(current.id)) {
        break; // Stop at stable ID
      }
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  public removeNode(id: LogicalNodeId): void {
    const node = this.idToNodeMap.get(id);
    if (node) {
      this.idToNodeMap.delete(id);
    }
  }

  public reset(): void {
    this.nextId = 1;
    this.nodeToIdMap = new WeakMap<Node, LogicalNodeId>();
    this.idToNodeMap.clear();
    this.identities.clear();
    this.parentHistory.clear();
  }
}
