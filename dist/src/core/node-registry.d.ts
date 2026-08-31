import { LogicalNodeId, NodeIdentity } from '../types/dom-node';
export declare class NodeRegistry {
    private nextId;
    private nodeToIdMap;
    private idToNodeMap;
    private identities;
    private parentHistory;
    getOrCreateId(node: Node, timestamp?: number): LogicalNodeId;
    getId(node: Node): LogicalNodeId | undefined;
    getNode(id: LogicalNodeId): Node | undefined;
    getIdentity(id: LogicalNodeId): NodeIdentity | undefined;
    recordParent(nodeId: LogicalNodeId, parentId: LogicalNodeId | null): void;
    getParentHistory(nodeId: LogicalNodeId): LogicalNodeId[];
    computeSelector(element: Element): string;
    computeFullSelectorPath(element: Element): string;
    removeNode(id: LogicalNodeId): void;
    reset(): void;
}
//# sourceMappingURL=node-registry.d.ts.map