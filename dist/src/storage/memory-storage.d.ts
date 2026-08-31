import { Annotation, SessionMetadata } from '../types/session';
import { BaseEvent } from '../types/events';
import { SnapshotCheckpoint } from '../types/checkpoint';
import { DOMSnapshot } from '../types/dom-node';
import { EventFilter, ForensicStorageProvider } from './storage-interface';
export declare class MemoryStorageProvider implements ForensicStorageProvider {
    private sessions;
    private events;
    private checkpoints;
    private initialSnapshots;
    private annotations;
    saveSession(metadata: SessionMetadata): Promise<void>;
    getSession(sessionId: string): Promise<SessionMetadata | null>;
    listSessions(): Promise<SessionMetadata[]>;
    deleteSession(sessionId: string): Promise<boolean>;
    appendEvents(sessionId: string, newEvents: BaseEvent[]): Promise<void>;
    getEvents(sessionId: string, filter?: EventFilter): Promise<BaseEvent[]>;
    getEventCount(sessionId: string): Promise<number>;
    saveCheckpoint(checkpoint: SnapshotCheckpoint): Promise<void>;
    getCheckpoints(sessionId: string): Promise<SnapshotCheckpoint[]>;
    saveInitialSnapshot(sessionId: string, snapshot: DOMSnapshot): Promise<void>;
    getInitialSnapshot(sessionId: string): Promise<DOMSnapshot | null>;
    addAnnotation(annotation: Annotation): Promise<void>;
    getAnnotations(sessionId: string): Promise<Annotation[]>;
    clearAll(): void;
}
//# sourceMappingURL=memory-storage.d.ts.map