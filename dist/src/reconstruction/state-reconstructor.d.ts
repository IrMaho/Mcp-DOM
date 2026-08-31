import { DOMSnapshot } from '../types/dom-node';
import { BaseEvent } from '../types/events';
import { SnapshotCheckpoint } from '../types/checkpoint';
export declare class StateReconstructor {
    private checkpointManager;
    private events;
    private cache;
    private maxCacheSize;
    constructor(checkpoints?: SnapshotCheckpoint[], events?: BaseEvent[]);
    setCheckpoints(checkpoints: SnapshotCheckpoint[]): void;
    setEvents(events: BaseEvent[]): void;
    addEvent(event: BaseEvent): void;
    addCheckpoint(checkpoint: SnapshotCheckpoint): void;
    getStateAt(target: {
        timestamp?: number;
        sequence?: number;
        eventId?: string;
    }): DOMSnapshot;
    getStateAround(timestamp: number, windowMs?: number): {
        stateBefore: DOMSnapshot;
        stateTarget: DOMSnapshot;
        stateAfter: DOMSnapshot;
    };
}
//# sourceMappingURL=state-reconstructor.d.ts.map