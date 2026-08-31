export declare class SequenceCounter {
    private currentSequence;
    private sessionStartTime;
    private sessionStartWallClock;
    constructor();
    nextSequence(): number;
    getSequence(): number;
    getRelativeTimestamp(): number;
    getWallClock(): number;
    generateEventId(prefix?: string): string;
    reset(): void;
}
//# sourceMappingURL=sequence-counter.d.ts.map