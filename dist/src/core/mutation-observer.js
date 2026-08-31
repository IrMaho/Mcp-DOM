export class DOMMutationObserver {
    observer = null;
    registry;
    privacy;
    sequenceCounter;
    snapshotEngine;
    callback;
    sessionId;
    isObserving = false;
    constructor(registry, privacy, sequenceCounter, snapshotEngine, callback, sessionId = '') {
        this.registry = registry;
        this.privacy = privacy;
        this.sequenceCounter = sequenceCounter;
        this.snapshotEngine = snapshotEngine;
        this.callback = callback;
        this.sessionId = sessionId;
    }
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    start(target = document) {
        if (this.isObserving)
            return;
        if (typeof MutationObserver === 'undefined')
            return;
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.observer.observe(target, {
            childList: true,
            attributes: true,
            characterData: true,
            subtree: true,
            attributeOldValue: true,
            characterDataOldValue: true,
        });
        this.isObserving = true;
    }
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isObserving = false;
    }
    takeRecords() {
        if (this.observer) {
            const records = this.observer.takeRecords();
            if (records.length > 0) {
                this.handleMutations(records);
            }
        }
    }
    handleMutations(mutations) {
        const timestamp = this.sequenceCounter.getRelativeTimestamp();
        const wallClockTime = this.sequenceCounter.getWallClock();
        for (let i = 0; i < mutations.length; i++) {
            const record = mutations[i];
            try {
                switch (record.type) {
                    case 'childList':
                        this.handleChildListMutation(record, timestamp, wallClockTime);
                        break;
                    case 'attributes':
                        this.handleAttributeMutation(record, timestamp, wallClockTime);
                        break;
                    case 'characterData':
                        this.handleCharacterDataMutation(record, timestamp, wallClockTime);
                        break;
                }
            }
            catch (err) {
                // Continue handling subsequent mutations safely
                if (typeof console !== 'undefined') {
                    console.error('[DOMMutationObserver] Error processing mutation:', err);
                }
            }
        }
    }
    handleChildListMutation(record, timestamp, wallClockTime) {
        const parent = record.target;
        const parentId = this.registry.getOrCreateId(parent, timestamp);
        const parentElement = parent.nodeType === Node.ELEMENT_NODE ? parent : null;
        const parentSelector = parentElement ? this.registry.computeSelector(parentElement) : undefined;
        // 1. Process Removed Nodes
        if (record.removedNodes && record.removedNodes.length > 0) {
            for (let j = 0; j < record.removedNodes.length; j++) {
                const removedNode = record.removedNodes[j];
                const removedId = this.registry.getId(removedNode);
                if (!removedId)
                    continue;
                const isElement = removedNode.nodeType === Node.ELEMENT_NODE;
                const elem = isElement ? removedNode : null;
                const selectorHint = elem ? this.registry.computeSelector(elem) : undefined;
                const sequence = this.sequenceCounter.nextSequence();
                const removeEvent = {
                    id: this.sequenceCounter.generateEventId('mut_rem'),
                    sessionId: this.sessionId,
                    timestamp,
                    sequence,
                    wallClockTime,
                    type: 'DOM_MUTATION_REMOVE',
                    category: 'DOM',
                    source: 'BROWSER_RUNTIME',
                    targetNodeId: removedId,
                    targetSelector: selectorHint,
                    payload: {
                        nodeId: removedId,
                        tagName: elem ? elem.tagName.toLowerCase() : undefined,
                        parentId,
                        index: j,
                        selectorHint,
                        removedSubtreeNodeCount: isElement ? elem.querySelectorAll('*').length + 1 : 1,
                    },
                };
                this.callback(removeEvent);
            }
        }
        // 2. Process Added Nodes
        if (record.addedNodes && record.addedNodes.length > 0) {
            for (let j = 0; j < record.addedNodes.length; j++) {
                const addedNode = record.addedNodes[j];
                if (addedNode.nodeType === Node.ELEMENT_NODE && this.privacy.shouldBlockNode(addedNode)) {
                    continue;
                }
                const nodesAcc = {};
                const addedId = this.snapshotEngine.serializeNode(addedNode, parentId, nodesAcc, timestamp);
                if (!addedId || !nodesAcc[addedId])
                    continue;
                const prevSibling = record.previousSibling ? this.registry.getId(record.previousSibling) : null;
                const nextSibling = record.nextSibling ? this.registry.getId(record.nextSibling) : null;
                const isElement = addedNode.nodeType === Node.ELEMENT_NODE;
                const elem = isElement ? addedNode : null;
                const selectorHint = elem ? this.registry.computeSelector(elem) : undefined;
                const sequence = this.sequenceCounter.nextSequence();
                const addEvent = {
                    id: this.sequenceCounter.generateEventId('mut_add'),
                    sessionId: this.sessionId,
                    timestamp,
                    sequence,
                    wallClockTime,
                    type: 'DOM_MUTATION_ADD',
                    category: 'DOM',
                    source: 'BROWSER_RUNTIME',
                    targetNodeId: addedId,
                    targetSelector: selectorHint,
                    payload: {
                        node: nodesAcc[addedId],
                        parentId,
                        previousSiblingId: prevSibling,
                        nextSiblingId: nextSibling,
                        index: j,
                    },
                };
                this.callback(addEvent);
            }
        }
    }
    handleAttributeMutation(record, timestamp, wallClockTime) {
        const target = record.target;
        if (target.nodeType !== Node.ELEMENT_NODE)
            return;
        const element = target;
        if (this.privacy.shouldBlockNode(element))
            return;
        const nodeId = this.registry.getOrCreateId(element, timestamp);
        const attrName = record.attributeName;
        if (!attrName)
            return;
        let newValue = element.getAttribute(attrName);
        if (attrName.toLowerCase() === 'value' && element.tagName.toLowerCase() === 'input') {
            const input = element;
            newValue = this.privacy.maskValue(input.value, input.type, input.name);
        }
        const oldValue = record.oldValue;
        if (oldValue === newValue)
            return; // Deduplicate identical attribute values
        const selector = this.registry.computeSelector(element);
        const sequence = this.sequenceCounter.nextSequence();
        const attrEvent = {
            id: this.sequenceCounter.generateEventId('mut_attr'),
            sessionId: this.sessionId,
            timestamp,
            sequence,
            wallClockTime,
            type: 'DOM_MUTATION_ATTR',
            category: 'DOM',
            source: 'BROWSER_RUNTIME',
            targetNodeId: nodeId,
            targetSelector: selector,
            payload: {
                nodeId,
                attributeName: attrName,
                oldValue,
                newValue,
                selectorHint: selector,
            },
        };
        this.callback(attrEvent);
    }
    handleCharacterDataMutation(record, timestamp, wallClockTime) {
        const target = record.target;
        const nodeId = this.registry.getOrCreateId(target, timestamp);
        const parentElement = target.parentElement;
        const parentId = parentElement ? this.registry.getId(parentElement) || null : null;
        const isMasked = parentElement ? this.privacy.shouldMaskText(parentElement) : false;
        const newRawText = target.textContent || '';
        const newText = this.privacy.sanitizeText(newRawText, isMasked);
        const oldText = record.oldValue ? this.privacy.sanitizeText(record.oldValue, isMasked) : '';
        if (oldText === newText)
            return;
        const sequence = this.sequenceCounter.nextSequence();
        const textEvent = {
            id: this.sequenceCounter.generateEventId('mut_txt'),
            sessionId: this.sessionId,
            timestamp,
            sequence,
            wallClockTime,
            type: 'DOM_MUTATION_TEXT',
            category: 'DOM',
            source: 'BROWSER_RUNTIME',
            targetNodeId: nodeId,
            targetSelector: parentElement ? this.registry.computeSelector(parentElement) : undefined,
            payload: {
                nodeId,
                parentId,
                oldText,
                newText,
            },
        };
        this.callback(textEvent);
    }
}
//# sourceMappingURL=mutation-observer.js.map