import { DOMSnapshot, LogicalNodeId, VirtualDOMNode } from '../types/dom-node';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
export declare class SnapshotEngine {
    private registry;
    private privacy;
    private sequenceCounter;
    constructor(registry: NodeRegistry, privacy: PrivacyEngine, sequenceCounter: SequenceCounter);
    captureSnapshot(doc?: Document, sessionId?: string): DOMSnapshot;
    serializeNode(node: Node, parentId: LogicalNodeId | null, nodesAcc: Record<LogicalNodeId, VirtualDOMNode>, timestamp: number): LogicalNodeId | null;
    private enrichElementMetrics;
    private getViewportInfo;
}
//# sourceMappingURL=snapshot-engine.d.ts.map