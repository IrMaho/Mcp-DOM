import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
import { SnapshotEngine } from './snapshot-engine';
import { DOMMutationObserver } from './mutation-observer';
import { EventCollector } from './event-collector';
import { RuntimeDiagnostics } from './runtime-diagnostics';
import { NetworkMonitor } from './network-monitor';
export class ForensicRecorder {
    sequenceCounter;
    registry;
    privacy;
    snapshotEngine;
    mutationObserver;
    eventCollector;
    diagnostics;
    networkMonitor;
    metadata;
    isRecording = false;
    isPaused = false;
    eventListeners = new Set();
    checkpointListeners = new Set();
    lastCheckpointSequence = 0;
    lastCheckpointTimestamp = 0;
    checkpointTimer = null;
    checkpointIntervalEvents = 200;
    checkpointIntervalMs = 30000;
    constructor(options = {}) {
        this.sequenceCounter = new SequenceCounter();
        this.registry = new NodeRegistry();
        this.privacy = new PrivacyEngine(options.privacy);
        this.snapshotEngine = new SnapshotEngine(this.registry, this.privacy, this.sequenceCounter);
        const eventHandler = (event) => this.handleEvent(event);
        this.mutationObserver = new DOMMutationObserver(this.registry, this.privacy, this.sequenceCounter, this.snapshotEngine, eventHandler);
        this.eventCollector = new EventCollector(this.registry, this.privacy, this.sequenceCounter, eventHandler);
        this.diagnostics = new RuntimeDiagnostics(this.privacy, this.sequenceCounter, eventHandler);
        this.networkMonitor = new NetworkMonitor(this.privacy, this.sequenceCounter, eventHandler);
        if (options.checkpointIntervalEvents) {
            this.checkpointIntervalEvents = options.checkpointIntervalEvents;
        }
        if (options.checkpointIntervalMs) {
            this.checkpointIntervalMs = options.checkpointIntervalMs;
        }
        const sessionId = options.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        this.metadata = this.createInitialMetadata(sessionId, options.sessionName);
    }
    getSessionId() {
        return this.metadata.id;
    }
    getMetadata() {
        return {
            ...this.metadata,
            durationMs: this.sequenceCounter.getRelativeTimestamp(),
            endTime: this.metadata.endTime || Date.now(),
        };
    }
    getRegistry() {
        return this.registry;
    }
    onEvent(listener) {
        this.eventListeners.add(listener);
        return () => this.eventListeners.delete(listener);
    }
    onCheckpoint(listener) {
        this.checkpointListeners.add(listener);
        return () => this.checkpointListeners.delete(listener);
    }
    start(doc = typeof document !== 'undefined' ? document : {}) {
        if (this.isRecording) {
            throw new Error(`Recorder session ${this.metadata.id} is already active`);
        }
        this.sequenceCounter.reset();
        this.registry.reset();
        this.isRecording = true;
        this.isPaused = false;
        this.metadata.status = 'recording';
        this.metadata.startTime = Date.now();
        // Propagate session id
        this.mutationObserver.setSessionId(this.metadata.id);
        this.eventCollector.setSessionId(this.metadata.id);
        this.diagnostics.setSessionId(this.metadata.id);
        this.networkMonitor.setSessionId(this.metadata.id);
        // 1. Initial Snapshot
        const initialSnapshot = this.snapshotEngine.captureSnapshot(doc, this.metadata.id);
        this.metadata.stats.nodeCount = initialSnapshot.totalNodeCount;
        const snapshotEvent = {
            id: this.sequenceCounter.generateEventId('snap_init'),
            sessionId: this.metadata.id,
            timestamp: initialSnapshot.timestamp,
            sequence: initialSnapshot.sequence,
            wallClockTime: Date.now(),
            type: 'DOM_SNAPSHOT',
            category: 'DOM',
            source: 'PAGE',
            payload: { snapshot: initialSnapshot },
        };
        // 2. Initial Checkpoint
        this.createCheckpoint(initialSnapshot, 'INITIAL');
        // 3. Start Collectors & Observers
        this.mutationObserver.start(doc);
        this.eventCollector.start();
        this.diagnostics.start();
        this.networkMonitor.start();
        // 4. Emit initial snapshot event
        this.handleEvent(snapshotEvent);
        // Periodic Checkpoint Timer
        if (this.checkpointIntervalMs > 0 && typeof setInterval !== 'undefined') {
            this.checkpointTimer = setInterval(() => {
                if (this.isRecording && !this.isPaused) {
                    this.captureCheckpoint('PERIODIC', doc);
                }
            }, this.checkpointIntervalMs);
        }
        return initialSnapshot;
    }
    stop() {
        if (!this.isRecording)
            return this.getMetadata();
        // Flush any pending mutations
        this.mutationObserver.takeRecords();
        // Stop observers and collectors
        this.mutationObserver.stop();
        this.eventCollector.stop();
        this.diagnostics.stop();
        this.networkMonitor.stop();
        if (this.checkpointTimer) {
            clearInterval(this.checkpointTimer);
            this.checkpointTimer = null;
        }
        this.isRecording = false;
        this.metadata.status = 'stopped';
        this.metadata.endTime = Date.now();
        this.metadata.durationMs = this.sequenceCounter.getRelativeTimestamp();
        return this.getMetadata();
    }
    pause() {
        if (!this.isRecording || this.isPaused)
            return;
        this.isPaused = true;
        this.metadata.status = 'paused';
    }
    resume() {
        if (!this.isRecording || !this.isPaused)
            return;
        this.isPaused = false;
        this.metadata.status = 'recording';
    }
    captureCheckpoint(trigger = 'MANUAL', doc = document) {
        if (!this.isRecording)
            return null;
        const snapshot = this.snapshotEngine.captureSnapshot(doc, this.metadata.id);
        return this.createCheckpoint(snapshot, trigger);
    }
    recordCustomEvent(type, payload, targetNodeId, targetSelector) {
        const timestamp = this.sequenceCounter.getRelativeTimestamp();
        const wallClockTime = this.sequenceCounter.getWallClock();
        const sequence = this.sequenceCounter.nextSequence();
        const event = {
            id: this.sequenceCounter.generateEventId('ext'),
            sessionId: this.metadata.id,
            timestamp,
            sequence,
            wallClockTime,
            type,
            category: 'EXTENSION',
            source: 'CONTENT_SCRIPT',
            targetNodeId,
            targetSelector,
            payload,
        };
        this.handleEvent(event);
        return event;
    }
    recordScreenshot(dataUrl, triggerReason = 'MANUAL') {
        const timestamp = this.sequenceCounter.getRelativeTimestamp();
        const wallClockTime = this.sequenceCounter.getWallClock();
        const sequence = this.sequenceCounter.nextSequence();
        const event = {
            id: this.sequenceCounter.generateEventId('scr'),
            sessionId: this.metadata.id,
            timestamp,
            sequence,
            wallClockTime,
            type: 'SCREENSHOT_CHECKPOINT',
            category: 'SCREENSHOT',
            source: 'BROWSER_RUNTIME',
            payload: {
                screenshotId: `shot_${sequence}`,
                dataUrl,
                viewport: {
                    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
                    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
                    scrollX: typeof window !== 'undefined' ? window.scrollX : 0,
                    scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
                    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
                },
                triggerReason,
            },
        };
        this.handleEvent(event);
        return event;
    }
    addAnnotation(label, comment, author = 'AGENT', nodeId) {
        const timestamp = this.sequenceCounter.getRelativeTimestamp();
        const sequence = this.sequenceCounter.nextSequence();
        const annotation = {
            id: `ann_${sequence}_${Math.random().toString(36).substring(2, 6)}`,
            sessionId: this.metadata.id,
            timestamp,
            sequence,
            nodeId,
            author,
            label,
            comment,
            createdAt: Date.now(),
        };
        const event = {
            id: annotation.id,
            sessionId: this.metadata.id,
            timestamp,
            sequence,
            wallClockTime: Date.now(),
            type: 'ANNOTATION',
            category: 'ANNOTATION',
            source: author === 'USER' ? 'USER_INTERACTION' : 'BROWSER_RUNTIME',
            targetNodeId: nodeId,
            payload: { annotation },
        };
        this.handleEvent(event);
        return annotation;
    }
    createCheckpoint(snapshot, trigger) {
        const eventsSince = this.sequenceCounter.getSequence() - this.lastCheckpointSequence;
        this.lastCheckpointSequence = this.sequenceCounter.getSequence();
        this.lastCheckpointTimestamp = snapshot.timestamp;
        this.metadata.stats.checkpointCount += 1;
        const checkpoint = {
            checkpointId: `chk_${snapshot.sequence}_${Date.now()}`,
            sessionId: this.metadata.id,
            timestamp: snapshot.timestamp,
            sequence: snapshot.sequence,
            wallClockTime: Date.now(),
            snapshot,
            eventIndex: this.metadata.stats.eventCount,
            eventsSinceLastCheckpoint: eventsSince,
            trigger,
        };
        const checkpointEvent = {
            id: checkpoint.checkpointId,
            sessionId: this.metadata.id,
            timestamp: snapshot.timestamp,
            sequence: snapshot.sequence,
            wallClockTime: checkpoint.wallClockTime,
            type: 'CHECKPOINT',
            category: 'CHECKPOINT',
            source: 'BROWSER_RUNTIME',
            payload: {
                checkpointId: checkpoint.checkpointId,
                snapshot,
                eventsSinceLastCheckpoint: eventsSince,
                totalEventsSoFar: this.metadata.stats.eventCount,
            },
        };
        // Emit Checkpoint object
        this.checkpointListeners.forEach((listener) => {
            try {
                listener(checkpoint);
            }
            catch (err) {
                console.error('[ForensicRecorder] Checkpoint listener error:', err);
            }
        });
        // Also emit as a regular stream event
        this.handleEvent(checkpointEvent);
        return checkpoint;
    }
    handleEvent(event) {
        if (this.isPaused && event.type !== 'CHECKPOINT' && event.type !== 'ANNOTATION') {
            return;
        }
        // Update Stats
        this.metadata.stats.eventCount += 1;
        if (event.category === 'DOM')
            this.metadata.stats.mutationCount += 1;
        if (event.category === 'ERROR')
            this.metadata.stats.errorCount += 1;
        if (event.category === 'CONSOLE')
            this.metadata.stats.consoleCount += 1;
        if (event.category === 'NETWORK')
            this.metadata.stats.networkCount += 1;
        if (event.category === 'SCREENSHOT')
            this.metadata.stats.screenshotCount += 1;
        // Check adaptive checkpoint trigger based on event count threshold
        if (this.isRecording &&
            event.type !== 'CHECKPOINT' &&
            event.type !== 'DOM_SNAPSHOT' &&
            this.sequenceCounter.getSequence() - this.lastCheckpointSequence >= this.checkpointIntervalEvents) {
            if (typeof document !== 'undefined') {
                this.captureCheckpoint('PERIODIC');
            }
        }
        // Dispatch to all subscribers
        this.eventListeners.forEach((listener) => {
            try {
                listener(event);
            }
            catch (err) {
                console.error('[ForensicRecorder] Event listener error:', err);
            }
        });
    }
    createInitialMetadata(sessionId, name) {
        const health = {
            domRecording: typeof MutationObserver !== 'undefined' ? 'HEALTHY' : 'UNAVAILABLE',
            userEvents: typeof window !== 'undefined' ? 'HEALTHY' : 'UNAVAILABLE',
            console: typeof console !== 'undefined' ? 'HEALTHY' : 'UNAVAILABLE',
            network: typeof window !== 'undefined' && typeof window.fetch !== 'undefined' ? 'HEALTHY' : 'PARTIAL',
            screenshots: 'HEALTHY',
            shadowDom: typeof Element !== 'undefined' && 'attachShadow' in Element.prototype ? 'HEALTHY' : 'RESTRICTED',
            iframes: 'PARTIAL',
        };
        const stats = {
            eventCount: 0,
            mutationCount: 0,
            errorCount: 0,
            consoleCount: 0,
            networkCount: 0,
            checkpointCount: 0,
            screenshotCount: 0,
            nodeCount: 0,
        };
        return {
            id: sessionId,
            name: name || `Recording ${new Date().toLocaleTimeString()}`,
            url: typeof window !== 'undefined' ? window.location.href : 'about:blank',
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            title: typeof document !== 'undefined' ? document.title : 'Forensic Session',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js/ForensicAgent',
            schemaVersion: '2.0.0',
            recorderVersion: '2.0.0',
            extensionVersion: '2.0.0',
            startTime: Date.now(),
            status: 'recording',
            health,
            stats,
        };
    }
}
//# sourceMappingURL=recorder.js.map