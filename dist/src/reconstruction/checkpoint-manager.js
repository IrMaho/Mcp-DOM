export class CheckpointManager {
    checkpoints = [];
    constructor(initialCheckpoints = []) {
        this.checkpoints = [...initialCheckpoints].sort((a, b) => a.sequence - b.sequence);
    }
    addCheckpoint(checkpoint) {
        this.checkpoints.push(checkpoint);
        this.checkpoints.sort((a, b) => a.sequence - b.sequence);
    }
    getCheckpoints() {
        return this.checkpoints;
    }
    getCheckpointCount() {
        return this.checkpoints.length;
    }
    getCheckpoint(checkpointId) {
        return this.checkpoints.find((c) => c.checkpointId === checkpointId);
    }
    findNearestCheckpoint(target) {
        if (this.checkpoints.length === 0)
            return null;
        if (typeof target.sequence === 'number') {
            const targetSeq = target.sequence;
            let best = this.checkpoints[0];
            for (let i = 0; i < this.checkpoints.length; i++) {
                const cp = this.checkpoints[i];
                if (cp.sequence <= targetSeq) {
                    best = cp;
                }
                else {
                    break;
                }
            }
            return best;
        }
        if (typeof target.timestamp === 'number') {
            const targetTime = target.timestamp;
            let best = this.checkpoints[0];
            for (let i = 0; i < this.checkpoints.length; i++) {
                const cp = this.checkpoints[i];
                if (cp.timestamp <= targetTime) {
                    best = cp;
                }
                else {
                    break;
                }
            }
            return best;
        }
        return this.checkpoints[0] || null;
    }
    clear() {
        this.checkpoints = [];
    }
}
//# sourceMappingURL=checkpoint-manager.js.map