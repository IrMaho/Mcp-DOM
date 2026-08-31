import { CheckpointManager } from './checkpoint-manager';
import { VirtualTreeBuilder } from './tree-builder';
export class StateReconstructor {
    checkpointManager;
    events = [];
    cache = new Map();
    maxCacheSize = 50;
    constructor(checkpoints = [], events = []) {
        this.checkpointManager = new CheckpointManager(checkpoints);
        this.events = [...events].sort((a, b) => a.sequence - b.sequence);
    }
    setCheckpoints(checkpoints) {
        this.checkpointManager = new CheckpointManager(checkpoints);
        this.cache.clear();
    }
    setEvents(events) {
        this.events = [...events].sort((a, b) => a.sequence - b.sequence);
        this.cache.clear();
    }
    addEvent(event) {
        this.events.push(event);
        this.cache.clear();
    }
    addCheckpoint(checkpoint) {
        this.checkpointManager.addCheckpoint(checkpoint);
        this.cache.clear();
    }
    getStateAt(target) {
        let targetSequence = target.sequence;
        let targetTimestamp = target.timestamp;
        if (target.eventId) {
            const foundEvt = this.events.find((e) => e.id === target.eventId);
            if (foundEvt) {
                targetSequence = foundEvt.sequence;
                targetTimestamp = foundEvt.timestamp;
            }
        }
        if (typeof targetSequence !== 'number' && typeof targetTimestamp === 'number') {
            // Find latest event at or before timestamp
            const eventsBefore = this.events.filter((e) => e.timestamp <= targetTimestamp);
            targetSequence = eventsBefore.length > 0 ? eventsBefore[eventsBefore.length - 1].sequence : 0;
        }
        const effectiveSequence = targetSequence || 0;
        // Check cache
        if (this.cache.has(effectiveSequence)) {
            return this.cache.get(effectiveSequence);
        }
        // 1. Locate nearest preceding checkpoint
        const checkpoint = this.checkpointManager.findNearestCheckpoint({ sequence: effectiveSequence });
        if (!checkpoint) {
            throw new Error('No baseline checkpoint or initial snapshot available for reconstruction');
        }
        // 2. Initialize VirtualTreeBuilder with checkpoint snapshot
        const treeBuilder = new VirtualTreeBuilder(checkpoint.snapshot.nodes, checkpoint.snapshot.rootId);
        // 3. Find subsequent events between checkpoint.sequence and effectiveSequence
        const deltaEvents = this.events.filter((e) => e.sequence > checkpoint.sequence && e.sequence <= effectiveSequence);
        // 4. Sequentially apply mutation events
        let currentUrl = checkpoint.snapshot.url;
        let currentTitle = checkpoint.snapshot.title;
        for (let i = 0; i < deltaEvents.length; i++) {
            const evt = deltaEvents[i];
            switch (evt.type) {
                case 'DOM_MUTATION_ADD':
                    treeBuilder.applyAdd(evt.payload);
                    break;
                case 'DOM_MUTATION_REMOVE':
                    treeBuilder.applyRemove(evt.payload);
                    break;
                case 'DOM_MUTATION_MOVE':
                    treeBuilder.applyMove(evt.payload);
                    break;
                case 'DOM_MUTATION_ATTR':
                    treeBuilder.applyAttrChange(evt.payload);
                    break;
                case 'DOM_MUTATION_TEXT':
                    treeBuilder.applyTextChange(evt.payload);
                    break;
                case 'NAV_PUSH_STATE':
                case 'NAV_REPLACE_STATE':
                case 'NAV_POPSTATE':
                case 'NAV_HASHCHANGE':
                    if (evt.payload.url)
                        currentUrl = evt.payload.url;
                    if (evt.payload.title)
                        currentTitle = evt.payload.title;
                    break;
            }
        }
        const reconstructedNodes = treeBuilder.getNodes();
        const activeNodesCount = Object.values(reconstructedNodes).filter((n) => !n.isDetached).length;
        const resultSnapshot = {
            snapshotId: `recon_${effectiveSequence}_${Date.now()}`,
            sessionId: checkpoint.sessionId,
            timestamp: targetTimestamp ?? checkpoint.timestamp,
            sequence: effectiveSequence,
            rootId: treeBuilder.getRootId(),
            nodes: reconstructedNodes,
            title: currentTitle,
            url: currentUrl,
            origin: checkpoint.snapshot.origin,
            viewport: { ...checkpoint.snapshot.viewport },
            doctype: checkpoint.snapshot.doctype,
            totalNodeCount: activeNodesCount,
        };
        // Store in cache
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined)
                this.cache.delete(firstKey);
        }
        this.cache.set(effectiveSequence, resultSnapshot);
        return resultSnapshot;
    }
    getStateAround(timestamp, windowMs = 200) {
        const tBefore = Math.max(0, timestamp - windowMs);
        const tAfter = timestamp + windowMs;
        return {
            stateBefore: this.getStateAt({ timestamp: tBefore }),
            stateTarget: this.getStateAt({ timestamp }),
            stateAfter: this.getStateAt({ timestamp: tAfter }),
        };
    }
}
//# sourceMappingURL=state-reconstructor.js.map