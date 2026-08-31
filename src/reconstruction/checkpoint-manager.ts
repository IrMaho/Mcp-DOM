import { SnapshotCheckpoint } from '../types/checkpoint';

export class CheckpointManager {
  private checkpoints: SnapshotCheckpoint[] = [];

  constructor(initialCheckpoints: SnapshotCheckpoint[] = []) {
    this.checkpoints = [...initialCheckpoints].sort((a, b) => a.sequence - b.sequence);
  }

  public addCheckpoint(checkpoint: SnapshotCheckpoint): void {
    this.checkpoints.push(checkpoint);
    this.checkpoints.sort((a, b) => a.sequence - b.sequence);
  }

  public getCheckpoints(): SnapshotCheckpoint[] {
    return this.checkpoints;
  }

  public getCheckpointCount(): number {
    return this.checkpoints.length;
  }

  public getCheckpoint(checkpointId: string): SnapshotCheckpoint | undefined {
    return this.checkpoints.find((c) => c.checkpointId === checkpointId);
  }

  public findNearestCheckpoint(target: { timestamp?: number; sequence?: number }): SnapshotCheckpoint | null {
    if (this.checkpoints.length === 0) return null;

    if (typeof target.sequence === 'number') {
      const targetSeq = target.sequence;
      let best: SnapshotCheckpoint = this.checkpoints[0];

      for (let i = 0; i < this.checkpoints.length; i++) {
        const cp = this.checkpoints[i];
        if (cp.sequence <= targetSeq) {
          best = cp;
        } else {
          break;
        }
      }
      return best;
    }

    if (typeof target.timestamp === 'number') {
      const targetTime = target.timestamp;
      let best: SnapshotCheckpoint = this.checkpoints[0];

      for (let i = 0; i < this.checkpoints.length; i++) {
        const cp = this.checkpoints[i];
        if (cp.timestamp <= targetTime) {
          best = cp;
        } else {
          break;
        }
      }
      return best;
    }

    return this.checkpoints[0] || null;
  }

  public clear(): void {
    this.checkpoints = [];
  }
}
