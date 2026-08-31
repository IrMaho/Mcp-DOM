import { BaseEvent, EventCategory } from '../types/events';
export type TimeChangeCallback = (timestamp: number, sequence?: number, event?: BaseEvent) => void;
export declare class TimeController {
    private currentTime;
    private duration;
    private speed;
    private isPlaying;
    private events;
    private callbacks;
    private animationFrameId;
    private lastRafTime;
    constructor(events?: BaseEvent[], duration?: number);
    setEvents(events: BaseEvent[], duration?: number): void;
    onTimeChange(cb: TimeChangeCallback): () => void;
    getCurrentTime(): number;
    getDuration(): number;
    getIsPlaying(): boolean;
    setSpeed(speed: number): void;
    getSpeed(): number;
    play(): void;
    pause(): void;
    seek(timestamp: number): void;
    stepForward(): void;
    stepBackward(): void;
    jumpToNext(category?: EventCategory): void;
    jumpToPrevious(category?: EventCategory): void;
    private tick;
    private notify;
}
//# sourceMappingURL=time-controller.d.ts.map