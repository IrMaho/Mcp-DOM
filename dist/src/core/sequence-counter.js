export class SequenceCounter {
    currentSequence = 0;
    sessionStartTime;
    sessionStartWallClock;
    constructor() {
        this.sessionStartTime = typeof performance !== 'undefined' ? performance.now() : 0;
        this.sessionStartWallClock = Date.now();
    }
    nextSequence() {
        this.currentSequence += 1;
        return this.currentSequence;
    }
    getSequence() {
        return this.currentSequence;
    }
    getRelativeTimestamp() {
        if (typeof performance !== 'undefined') {
            return Math.round((performance.now() - this.sessionStartTime) * 100) / 100;
        }
        return Date.now() - this.sessionStartWallClock;
    }
    getWallClock() {
        return Date.now();
    }
    generateEventId(prefix = 'evt') {
        const seq = this.nextSequence();
        const rand = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${seq}_${rand}`;
    }
    reset() {
        this.currentSequence = 0;
        this.sessionStartTime = typeof performance !== 'undefined' ? performance.now() : 0;
        this.sessionStartWallClock = Date.now();
    }
}
//# sourceMappingURL=sequence-counter.js.map