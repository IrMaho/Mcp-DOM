import { SnapshotCheckpoint } from '../types/checkpoint';
export declare class CheckpointManager {
    private checkpoints;
    constructor(initialCheckpoints?: SnapshotCheckpoint[]);
    addCheckpoint(checkpoint: SnapshotCheckpoint): void;
    getCheckpoints(): SnapshotCheckpoint[];
    getCheckpointCount(): number;
    getCheckpoint(checkpointId: string): SnapshotCheckpoint | undefined;
    findNearestCheckpoint(target: {
        timestamp?: number;
        sequence?: number;
    }): SnapshotCheckpoint | null;
    clear(): void;
}
//# sourceMappingURL=checkpoint-manager.d.ts.map