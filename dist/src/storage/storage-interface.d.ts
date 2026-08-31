import { Annotation, SessionMetadata } from '../types/session';
import { BaseEvent, EventCategory, EventType } from '../types/events';
import { SnapshotCheckpoint } from '../types/checkpoint';
import { DOMSnapshot } from '../types/dom-node';
export interface EventFilter {
    category?: EventCategory;
    type?: EventType;
    fromTimestamp?: number;
    toTimestamp?: number;
    fromSequence?: number;
    toSequence?: number;
    targetNodeId?: number;
    targetSelector?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
}
export interface SessionExportBundle {
    schemaVersion: string;
    exportedAt: number;
    metadata: SessionMetadata;
    initialSnapshot: DOMSnapshot;
    checkpoints: SnapshotCheckpoint[];
    events: BaseEvent[];
    annotations: Annotation[];
}
export interface ForensicStorageProvider {
    saveSession(metadata: SessionMetadata): Promise<void>;
    getSession(sessionId: string): Promise<SessionMetadata | null>;
    listSessions(): Promise<SessionMetadata[]>;
    deleteSession(sessionId: string): Promise<boolean>;
    appendEvents(sessionId: string, events: BaseEvent[]): Promise<void>;
    getEvents(sessionId: string, filter?: EventFilter): Promise<BaseEvent[]>;
    getEventCount(sessionId: string): Promise<number>;
    saveCheckpoint(checkpoint: SnapshotCheckpoint): Promise<void>;
    getCheckpoints(sessionId: string): Promise<SnapshotCheckpoint[]>;
    saveInitialSnapshot(sessionId: string, snapshot: DOMSnapshot): Promise<void>;
    getInitialSnapshot(sessionId: string): Promise<DOMSnapshot | null>;
    addAnnotation(annotation: Annotation): Promise<void>;
    getAnnotations(sessionId: string): Promise<Annotation[]>;
}
//# sourceMappingURL=storage-interface.d.ts.map