import { Annotation, SessionMetadata } from '../types/session';
import { BaseEvent, ScreenshotEvent } from '../types/events';
import { DOMSnapshot } from '../types/dom-node';
import { SnapshotCheckpoint } from '../types/checkpoint';
import { PrivacyConfig } from '../types/privacy';
import { NodeRegistry } from './node-registry';
export interface RecorderOptions {
    sessionId?: string;
    sessionName?: string;
    privacy?: Partial<PrivacyConfig>;
    captureScreenshots?: boolean;
    checkpointIntervalEvents?: number;
    checkpointIntervalMs?: number;
}
export type EventListener = (event: BaseEvent) => void;
export type CheckpointListener = (checkpoint: SnapshotCheckpoint) => void;
export declare class ForensicRecorder {
    private sequenceCounter;
    private registry;
    private privacy;
    private snapshotEngine;
    private mutationObserver;
    private eventCollector;
    private diagnostics;
    private networkMonitor;
    private metadata;
    private isRecording;
    private isPaused;
    private eventListeners;
    private checkpointListeners;
    private lastCheckpointSequence;
    private lastCheckpointTimestamp;
    private checkpointTimer;
    private checkpointIntervalEvents;
    private checkpointIntervalMs;
    constructor(options?: RecorderOptions);
    getSessionId(): string;
    getMetadata(): SessionMetadata;
    getRegistry(): NodeRegistry;
    onEvent(listener: EventListener): () => void;
    onCheckpoint(listener: CheckpointListener): () => void;
    start(doc?: Document): DOMSnapshot;
    stop(): SessionMetadata;
    pause(): void;
    resume(): void;
    captureCheckpoint(trigger?: 'PERIODIC' | 'SIGNIFICANT_MUTATION' | 'MANUAL' | 'NAVIGATION', doc?: Document): SnapshotCheckpoint | null;
    recordCustomEvent(type: 'EXTENSION_INJECT_UI' | 'EXTENSION_MUTATION' | 'EXTENSION_CLEANUP' | 'EXTENSION_MESSAGE', payload: Record<string, unknown>, targetNodeId?: number, targetSelector?: string): BaseEvent;
    recordScreenshot(dataUrl: string, triggerReason?: 'INITIAL' | 'PERIODIC' | 'MUTATION_SPIKE' | 'ERROR' | 'MANUAL'): ScreenshotEvent;
    addAnnotation(label: string, comment: string, author?: 'USER' | 'AGENT' | 'SYSTEM', nodeId?: number): Annotation;
    private createCheckpoint;
    private handleEvent;
    private createInitialMetadata;
}
//# sourceMappingURL=recorder.d.ts.map