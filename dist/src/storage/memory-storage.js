export class MemoryStorageProvider {
    sessions = new Map();
    events = new Map();
    checkpoints = new Map();
    initialSnapshots = new Map();
    annotations = new Map();
    async saveSession(metadata) {
        this.sessions.set(metadata.id, { ...metadata });
        if (!this.events.has(metadata.id))
            this.events.set(metadata.id, []);
        if (!this.checkpoints.has(metadata.id))
            this.checkpoints.set(metadata.id, []);
        if (!this.annotations.has(metadata.id))
            this.annotations.set(metadata.id, []);
    }
    async getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    async listSessions() {
        return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
    }
    async deleteSession(sessionId) {
        this.sessions.delete(sessionId);
        this.events.delete(sessionId);
        this.checkpoints.delete(sessionId);
        this.initialSnapshots.delete(sessionId);
        this.annotations.delete(sessionId);
        return true;
    }
    async appendEvents(sessionId, newEvents) {
        const list = this.events.get(sessionId) || [];
        list.push(...newEvents);
        this.events.set(sessionId, list);
        const session = this.sessions.get(sessionId);
        if (session) {
            session.stats.eventCount = list.length;
        }
    }
    async getEvents(sessionId, filter) {
        const all = this.events.get(sessionId) || [];
        if (!filter)
            return [...all];
        let filtered = all.filter((e) => {
            if (filter.category && e.category !== filter.category)
                return false;
            if (filter.type && e.type !== filter.type)
                return false;
            if (typeof filter.fromTimestamp === 'number' && e.timestamp < filter.fromTimestamp)
                return false;
            if (typeof filter.toTimestamp === 'number' && e.timestamp > filter.toTimestamp)
                return false;
            if (typeof filter.fromSequence === 'number' && e.sequence < filter.fromSequence)
                return false;
            if (typeof filter.toSequence === 'number' && e.sequence > filter.toSequence)
                return false;
            if (typeof filter.targetNodeId === 'number' && e.targetNodeId !== filter.targetNodeId)
                return false;
            if (filter.targetSelector && e.targetSelector && !e.targetSelector.includes(filter.targetSelector))
                return false;
            if (filter.searchQuery) {
                const query = filter.searchQuery.toLowerCase();
                const strPayload = JSON.stringify(e.payload).toLowerCase();
                if (!strPayload.includes(query) && !e.type.toLowerCase().includes(query)) {
                    return false;
                }
            }
            return true;
        });
        if (typeof filter.offset === 'number') {
            filtered = filtered.slice(filter.offset);
        }
        if (typeof filter.limit === 'number') {
            filtered = filtered.slice(0, filter.limit);
        }
        return filtered;
    }
    async getEventCount(sessionId) {
        return (this.events.get(sessionId) || []).length;
    }
    async saveCheckpoint(checkpoint) {
        const list = this.checkpoints.get(checkpoint.sessionId) || [];
        list.push(checkpoint);
        list.sort((a, b) => a.sequence - b.sequence);
        this.checkpoints.set(checkpoint.sessionId, list);
    }
    async getCheckpoints(sessionId) {
        return this.checkpoints.get(sessionId) || [];
    }
    async saveInitialSnapshot(sessionId, snapshot) {
        this.initialSnapshots.set(sessionId, snapshot);
    }
    async getInitialSnapshot(sessionId) {
        return this.initialSnapshots.get(sessionId) || null;
    }
    async addAnnotation(annotation) {
        const list = this.annotations.get(annotation.sessionId) || [];
        list.push(annotation);
        this.annotations.set(annotation.sessionId, list);
    }
    async getAnnotations(sessionId) {
        return this.annotations.get(sessionId) || [];
    }
    clearAll() {
        this.sessions.clear();
        this.events.clear();
        this.checkpoints.clear();
        this.initialSnapshots.clear();
        this.annotations.clear();
    }
}
//# sourceMappingURL=memory-storage.js.map