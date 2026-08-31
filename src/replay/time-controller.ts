import { BaseEvent, EventCategory } from '../types/events';

export type TimeChangeCallback = (timestamp: number, sequence?: number, event?: BaseEvent) => void;

export class TimeController {
  private currentTime: number = 0;
  private duration: number = 0;
  private speed: number = 1.0;
  private isPlaying: boolean = false;
  private events: BaseEvent[] = [];
  private callbacks: Set<TimeChangeCallback> = new Set();
  private animationFrameId: number | null = null;
  private lastRafTime: number = 0;

  constructor(events: BaseEvent[] = [], duration: number = 0) {
    this.setEvents(events, duration);
  }

  public setEvents(events: BaseEvent[], duration?: number): void {
    this.events = [...events].sort((a, b) => a.sequence - b.sequence);
    if (typeof duration === 'number' && duration > 0) {
      this.duration = duration;
    } else if (this.events.length > 0) {
      this.duration = this.events[this.events.length - 1].timestamp;
    } else {
      this.duration = 0;
    }
  }

  public onTimeChange(cb: TimeChangeCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
  }

  public getSpeed(): number {
    return this.speed;
  }

  public play(): void {
    if (this.isPlaying) return;
    if (this.currentTime >= this.duration) {
      this.currentTime = 0;
    }
    this.isPlaying = true;
    this.lastRafTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.tick();
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public seek(timestamp: number): void {
    const clamped = Math.max(0, Math.min(this.duration, timestamp));
    this.currentTime = clamped;
    this.notify();
  }

  public stepForward(): void {
    this.pause();
    const nextEvt = this.events.find((e) => e.timestamp > this.currentTime);
    if (nextEvt) {
      this.seek(nextEvt.timestamp);
    } else {
      this.seek(this.duration);
    }
  }

  public stepBackward(): void {
    this.pause();
    const prevEvents = this.events.filter((e) => e.timestamp < this.currentTime - 1);
    if (prevEvents.length > 0) {
      const prevEvt = prevEvents[prevEvents.length - 1];
      this.seek(prevEvt.timestamp);
    } else {
      this.seek(0);
    }
  }

  public jumpToNext(category?: EventCategory): void {
    this.pause();
    const candidates = this.events.filter(
      (e) => e.timestamp > this.currentTime && (!category || e.category === category)
    );
    if (candidates.length > 0) {
      this.seek(candidates[0].timestamp);
    }
  }

  public jumpToPrevious(category?: EventCategory): void {
    this.pause();
    const candidates = this.events.filter(
      (e) => e.timestamp < this.currentTime - 1 && (!category || e.category === category)
    );
    if (candidates.length > 0) {
      this.seek(candidates[candidates.length - 1].timestamp);
    }
  }

  private tick = (): void => {
    if (!this.isPlaying) return;

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
    } else {
      setTimeout(this.tick, 16);
    }
  };

  private notify(): void {
    const matchingEvt = this.events
      .filter((e) => e.timestamp <= this.currentTime)
      .pop();

    this.callbacks.forEach((cb) => {
      try {
        cb(this.currentTime, matchingEvt?.sequence, matchingEvt);
      } catch (err) {
        console.error('[TimeController] Callback error:', err);
      }
    });
  }
}
