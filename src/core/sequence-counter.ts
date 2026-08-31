export class SequenceCounter {
  private currentSequence: number = 0;
  private sessionStartTime: number;
  private sessionStartWallClock: number;

  constructor() {
    this.sessionStartTime = typeof performance !== 'undefined' ? performance.now() : 0;
    this.sessionStartWallClock = Date.now();
  }

  public nextSequence(): number {
    this.currentSequence += 1;
    return this.currentSequence;
  }

  public getSequence(): number {
    return this.currentSequence;
  }

  public getRelativeTimestamp(): number {
    if (typeof performance !== 'undefined') {
      return Math.round((performance.now() - this.sessionStartTime) * 100) / 100;
    }
    return Date.now() - this.sessionStartWallClock;
  }

  public getWallClock(): number {
    return Date.now();
  }

  public generateEventId(prefix: string = 'evt'): string {
    const seq = this.nextSequence();
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${seq}_${rand}`;
  }

  public reset(): void {
    this.currentSequence = 0;
    this.sessionStartTime = typeof performance !== 'undefined' ? performance.now() : 0;
    this.sessionStartWallClock = Date.now();
  }
}
