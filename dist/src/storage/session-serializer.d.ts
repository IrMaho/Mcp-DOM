import { SessionExportBundle } from './storage-interface';
import { SessionMetadata } from '../types/session';
import { BaseEvent } from '../types/events';
import { DOMSnapshot } from '../types/dom-node';
import { SnapshotCheckpoint } from '../types/checkpoint';
import { Annotation } from '../types/session';
export interface IntegrityReport {
    isValid: boolean;
    sessionId: string;
    schemaVersion: string;
    totalEvents: number;
    totalCheckpoints: number;
    isSequenceMonotonic: boolean;
    missingSequences: number[];
    hasInitialSnapshot: boolean;
    corruptNodeReferences: number[];
    errors: string[];
    warnings: string[];
}
export declare class SessionSerializer {
    static exportBundle(metadata: SessionMetadata, initialSnapshot: DOMSnapshot, events: BaseEvent[], checkpoints: SnapshotCheckpoint[], annotations?: Annotation[]): SessionExportBundle;
    static exportToJson(bundle: SessionExportBundle, pretty?: boolean): string;
    static importFromJson(jsonString: string): SessionExportBundle;
    static validateIntegrity(bundle: SessionExportBundle): IntegrityReport;
}
//# sourceMappingURL=session-serializer.d.ts.map