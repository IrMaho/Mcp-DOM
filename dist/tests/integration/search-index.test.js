import { describe, it, expect } from 'vitest';
import { SessionIndex } from '../../src/storage/session-index';
describe('SessionIndex', () => {
    it('should index and perform multi-dimensional keyword and selector search', () => {
        const events = [
            {
                id: 'e1',
                sessionId: 's1',
                timestamp: 10,
                sequence: 1,
                wallClockTime: 1010,
                type: 'DOM_MUTATION_ADD',
                category: 'DOM',
                source: 'CONTENT_SCRIPT',
                targetNodeId: 42,
                targetSelector: '.injected-modal',
                payload: { tagName: 'div', class: 'injected-modal' },
            },
            {
                id: 'e2',
                sessionId: 's1',
                timestamp: 50,
                sequence: 2,
                wallClockTime: 1050,
                type: 'RUNTIME_ERROR',
                category: 'ERROR',
                source: 'PAGE',
                payload: { message: 'Failed to execute querySelector on document' },
            },
            {
                id: 'e3',
                sessionId: 's1',
                timestamp: 120,
                sequence: 3,
                wallClockTime: 1120,
                type: 'NETWORK_RESPONSE_COMPLETE',
                category: 'NETWORK',
                source: 'PAGE',
                payload: { url: 'https://api.test/v1/auth/session', status: 401 },
            },
        ];
        const index = new SessionIndex(events);
        // Search by selector
        const selectorMatches = index.search({ selector: 'injected-modal' });
        expect(selectorMatches.length).toBe(1);
        expect(selectorMatches[0].eventId).toBe('e1');
        // Search by error text
        const errorMatches = index.search({ text: 'querySelector' });
        expect(errorMatches.length).toBe(1);
        expect(errorMatches[0].eventId).toBe('e2');
        // Search by network url
        const netMatches = index.search({ text: 'auth/session' });
        expect(netMatches.length).toBe(1);
        expect(netMatches[0].eventId).toBe('e3');
        // Search by nodeId
        const nodeMatches = index.search({ nodeId: 42 });
        expect(nodeMatches.length).toBe(1);
        expect(nodeMatches[0].eventId).toBe('e1');
    });
});
//# sourceMappingURL=search-index.test.js.map