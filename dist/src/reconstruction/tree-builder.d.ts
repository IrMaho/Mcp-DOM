import { LogicalNodeId, VirtualDOMNode } from '../types/dom-node';
import { DOMAddNodePayload, DOMAttrChangePayload, DOMMoveNodePayload, DOMRemoveNodePayload, DOMTextChangePayload } from '../types/events';
export declare class VirtualTreeBuilder {
    private nodes;
    private rootId;
    constructor(initialNodes?: Record<LogicalNodeId, VirtualDOMNode>, rootId?: LogicalNodeId);
    getRootId(): LogicalNodeId;
    setRootId(rootId: LogicalNodeId): void;
    getNodes(): Record<LogicalNodeId, VirtualDOMNode>;
    getNode(id: LogicalNodeId): VirtualDOMNode | undefined;
    hasNode(id: LogicalNodeId): boolean;
    loadFromNodes(sourceNodes: Record<LogicalNodeId, VirtualDOMNode>): void;
    clone(): VirtualTreeBuilder;
    applyAdd(payload: DOMAddNodePayload): void;
    applyRemove(payload: DOMRemoveNodePayload): void;
    applyMove(payload: DOMMoveNodePayload): void;
    applyAttrChange(payload: DOMAttrChangePayload): void;
    applyTextChange(payload: DOMTextChangePayload): void;
    private addNodeRecursive;
    toHTML(nodeId?: LogicalNodeId, indent?: number): string;
    private escapeHtmlAttr;
    private escapeHtmlText;
}
//# sourceMappingURL=tree-builder.d.ts.map