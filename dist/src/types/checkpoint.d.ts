import { DOMSnapshot } from './dom-node';
export interface SnapshotCheckpoint {
    checkpointId: string;
    sessionId: string;
    timestamp: number;
    sequence: number;
    wallClockTime: number;
    snapshot: DOMSnapshot;
    eventIndex: number;
    eventsSinceLastCheckpoint: number;
    trigger: 'INITIAL' | 'PERIODIC' | 'SIGNIFICANT_MUTATION' | 'MANUAL' | 'NAVIGATION';
    byteSize?: number;
}
//# sourceMappingURL=checkpoint.d.ts.map