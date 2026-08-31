export class TimeController {
    currentTime = 0;
    duration = 0;
    speed = 1.0;
    isPlaying = false;
    events = [];
    callbacks = new Set();
    animationFrameId = null;
    lastRafTime = 0;
    constructor(events = [], duration = 0) {
        this.setEvents(events, duration);
    }
    setEvents(events, duration) {
        this.events = [...events].sort((a, b) => a.sequence - b.sequence);
        if (typeof duration === 'number' && duration > 0) {
            this.duration = duration;
        }
        else if (this.events.length > 0) {
            this.duration = this.events[this.events.length - 1].timestamp;
        }
        else {
            this.duration = 0;
        }
    }
    onTimeChange(cb) {
        this.callbacks.add(cb);
        return () => this.callbacks.delete(cb);
    }
    getCurrentTime() {
        return this.currentTime;
    }
    getDuration() {
        return this.duration;
    }
    getIsPlaying() {
        return this.isPlaying;
    }
    setSpeed(speed) {
        this.speed = Math.max(0.1, Math.min(10, speed));
    }
    getSpeed() {
        return this.speed;
    }
    play() {
        if (this.isPlaying)
            return;
        if (this.currentTime >= this.duration) {
            this.currentTime = 0;
        }
        this.isPlaying = true;
        this.lastRafTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.tick();
    }
    pause() {
        this.isPlaying = false;
        if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    seek(timestamp) {
        const clamped = Math.max(0, Math.min(this.duration, timestamp));
        this.currentTime = clamped;
        this.notify();
    }
    stepForward() {
        this.pause();
        const nextEvt = this.events.find((e) => e.timestamp > this.currentTime);
        if (nextEvt) {
            this.seek(nextEvt.timestamp);
        }
        else {
            this.seek(this.duration);
        }
    }
    stepBackward() {
        this.pause();
        const prevEvents = this.events.filter((e) => e.timestamp < this.currentTime - 1);
        if (prevEvents.length > 0) {
            const prevEvt = prevEvents[prevEvents.length - 1];
            this.seek(prevEvt.timestamp);
        }
        else {
            this.seek(0);
        }
    }
    jumpToNext(category) {
        this.pause();
        const candidates = this.events.filter((e) => e.timestamp > this.currentTime && (!category || e.category === category));
        if (candidates.length > 0) {
            this.seek(candidates[0].timestamp);
        }
    }
    jumpToPrevious(category) {
        this.pause();
        const candidates = this.events.filter((e) => e.timestamp < this.currentTime - 1 && (!category || e.category === category));
        if (candidates.length > 0) {
            this.seek(candidates[candidates.length - 1].timestamp);
        }
    }
    tick = () => {
        if (!this.isPlaying)
            return;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const delta = (now - this.lastRafTime) * this.speed;
        this.lastRafTime = now;
        this.currentTime += delta;
        if (this.currentTime >= this.duration) {
            this.currentTime = this.duration;
            this.pause();
            this.notify();
            return;
        }
        this.notify();
        if (typeof requestAnimationFrame !== 'undefined') {
            this.animationFrameId = requestAnimationFrame(this.tick);
        }
        else {
            setTimeout(this.tick, 16);
        }
    };
    notify() {
        const matchingEvt = this.events
            .filter((e) => e.timestamp <= this.currentTime)
            .pop();
        this.callbacks.forEach((cb) => {
            try {
                cb(this.currentTime, matchingEvt?.sequence, matchingEvt);
            }
            catch (err) {
                console.error('[TimeController] Callback error:', err);
            }
        });
    }
}
//# sourceMappingURL=time-controller.js.map