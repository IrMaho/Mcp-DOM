import { BaseEvent } from '../types/events';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
import { SnapshotEngine } from './snapshot-engine';
export type MutationEventCallback = (event: BaseEvent) => void;
export declare class DOMMutationObserver {
    private observer;
    private registry;
    private privacy;
    private sequenceCounter;
    private snapshotEngine;
    private callback;
    private sessionId;
    private isObserving;
    constructor(registry: NodeRegistry, privacy: PrivacyEngine, sequenceCounter: SequenceCounter, snapshotEngine: SnapshotEngine, callback: MutationEventCallback, sessionId?: string);
    setSessionId(sessionId: string): void;
    start(target?: Node): void;
    stop(): void;
    takeRecords(): void;
    private handleMutations;
    private handleChildListMutation;
    private handleAttributeMutation;
    private handleCharacterDataMutation;
}
//# sourceMappingURL=mutation-observer.d.ts.map