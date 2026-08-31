import { BaseEvent } from '../types/events';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
export type DiagnosticCallback = (event: BaseEvent) => void;
export declare class RuntimeDiagnostics {
    private privacy;
    private sequenceCounter;
    private callback;
    private sessionId;
    private isInstrumented;
    private originalConsole;
    private originalOnError;
    private cleanups;
    constructor(privacy: PrivacyEngine, sequenceCounter: SequenceCounter, callback: DiagnosticCallback, sessionId?: string);
    setSessionId(sessionId: string): void;
    start(): void;
    stop(): void;
    private instrumentConsole;
    private recordConsole;
    private instrumentGlobalErrors;
    private instrumentUnhandledRejections;
}
//# sourceMappingURL=runtime-diagnostics.d.ts.map