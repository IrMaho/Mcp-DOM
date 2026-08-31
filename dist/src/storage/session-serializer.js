export class SessionSerializer {
    static exportBundle(metadata, initialSnapshot, events, checkpoints, annotations = []) {
        return {
            schemaVersion: '2.0.0',
            exportedAt: Date.now(),
            metadata: { ...metadata },
            initialSnapshot: { ...initialSnapshot },
            events: [...events].sort((a, b) => a.sequence - b.sequence),
            checkpoints: [...checkpoints].sort((a, b) => a.sequence - b.sequence),
            annotations: [...annotations],
        };
    }
    static exportToJson(bundle, pretty = true) {
        return JSON.stringify(bundle, null, pretty ? 2 : undefined);
    }
    static importFromJson(jsonString) {
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        }
        catch (err) {
            throw new Error(`Failed to parse JSON recording: ${err.message}`);
        }
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid recording format: root must be an object');
        }
        if (!parsed.metadata || !parsed.metadata.id) {
            throw new Error('Invalid recording format: missing session metadata');
        }
        if (!parsed.initialSnapshot || !parsed.initialSnapshot.nodes) {
            throw new Error('Invalid recording format: missing initial DOM snapshot');
        }
        if (!Array.isArray(parsed.events)) {
            parsed.events = [];
        }
        if (!Array.isArray(parsed.checkpoints)) {
            parsed.checkpoints = [];
        }
        if (!Array.isArray(parsed.annotations)) {
            parsed.annotations = [];
        }
        return parsed;
    }
    static validateIntegrity(bundle) {
        const errors = [];
        const warnings = [];
        const missingSequences = [];
        const corruptNodeReferences = [];
        const metadata = bundle.metadata;
        const events = bundle.events || [];
        const checkpoints = bundle.checkpoints || [];
        const initialSnapshot = bundle.initialSnapshot;
        if (!metadata || !metadata.id) {
            errors.push('Missing session metadata or session ID');
        }
        const hasInitialSnapshot = !!initialSnapshot && !!initialSnapshot.nodes;
        if (!hasInitialSnapshot) {
            errors.push('Initial baseline snapshot is missing');
        }
        // Verify monotonic sequence numbering
        let isMonotonic = true;
        let expectedSeq = 1;
        for (let i = 0; i < events.length; i++) {
            const evt = events[i];
            if (typeof evt.sequence !== 'number' || evt.sequence <= 0) {
                errors.push(`Event at index ${i} has invalid sequence: ${evt.sequence}`);
                isMonotonic = false;
            }
            if (i > 0 && evt.sequence <= events[i - 1].sequence) {
                errors.push(`Non-increasing sequence at index ${i}: prev=${events[i - 1].sequence}, curr=${evt.sequence}`);
                isMonotonic = false;
            }
        }
        // Check referenced node IDs in initial snapshot
        if (hasInitialSnapshot) {
            for (const [idStr, node] of Object.entries(initialSnapshot.nodes)) {
                if (node.children) {
                    for (const childId of node.children) {
                        if (!initialSnapshot.nodes[childId]) {
                            corruptNodeReferences.push(childId);
                            warnings.push(`Initial snapshot node ${idStr} references non-existent child ID ${childId}`);
                        }
                    }
                }
            }
        }
        return {
            isValid: errors.length === 0,
            sessionId: metadata?.id || 'unknown',
            schemaVersion: bundle.schemaVersion || 'unknown',
            totalEvents: events.length,
            totalCheckpoints: checkpoints.length,
            isSequenceMonotonic: isMonotonic,
            missingSequences,
            corruptNodeReferences,
            hasInitialSnapshot,
            errors,
            warnings,
        };
    }
}
//# sourceMappingURL=session-serializer.js.map