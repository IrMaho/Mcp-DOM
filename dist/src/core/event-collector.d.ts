import { BaseEvent } from '../types/events';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
export type EventCollectorCallback = (event: BaseEvent) => void;
export declare class EventCollector {
    private registry;
    private privacy;
    private sequenceCounter;
    private callback;
    private sessionId;
    private isListening;
    private cleanups;
    constructor(registry: NodeRegistry, privacy: PrivacyEngine, sequenceCounter: SequenceCounter, callback: EventCollectorCallback, sessionId?: string);
    setSessionId(sessionId: string): void;
    start(): void;
    stop(): void;
    private attachUserEventListeners;
    private handlePointerEvent;
    private handleInputEvent;
    private handleSubmitEvent;
    private handleKeyboardEvent;
    private handleFocusBlurEvent;
    private attachNavigationListeners;
    private recordNavigation;
    private attachViewportListeners;
}
//# sourceMappingURL=event-collector.d.ts.map