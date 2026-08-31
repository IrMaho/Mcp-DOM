import { BaseEvent } from '../types/events';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
export type NetworkEventCallback = (event: BaseEvent) => void;
export declare class NetworkMonitor {
    private privacy;
    private sequenceCounter;
    private callback;
    private sessionId;
    private isInstrumented;
    private originalFetch;
    private originalXHROpen;
    private originalXHRSend;
    private cleanups;
    constructor(privacy: PrivacyEngine, sequenceCounter: SequenceCounter, callback: NetworkEventCallback, sessionId?: string);
    setSessionId(sessionId: string): void;
    start(): void;
    stop(): void;
    private instrumentFetch;
    private instrumentXHR;
}
//# sourceMappingURL=network-monitor.d.ts.map