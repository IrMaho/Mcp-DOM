import { LogicalNodeId, VirtualDOMNode } from '../types/dom-node';
export declare class VirtualQueryEngine {
    static matches(node: VirtualDOMNode, selector: string): boolean;
    static querySelector(selector: string, rootId: LogicalNodeId, nodes: Record<LogicalNodeId, VirtualDOMNode>): VirtualDOMNode | null;
    static querySelectorAll(selector: string, rootId: LogicalNodeId, nodes: Record<LogicalNodeId, VirtualDOMNode>, limit?: number): VirtualDOMNode[];
    static getElementById(id: string, nodes: Record<LogicalNodeId, VirtualDOMNode>): VirtualDOMNode | null;
    static computeSelector(node: VirtualDOMNode, nodes: Record<LogicalNodeId, VirtualDOMNode>): string;
    private static matchesCompound;
    private static matchesSimple;
}
//# sourceMappingURL=virtual-query.d.ts.map