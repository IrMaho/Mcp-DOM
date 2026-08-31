import { describe, it, expect } from 'vitest';
import { ForensicMCPServer } from '../../src/mcp/server';
import { MemoryStorageProvider } from '../../src/storage/memory-storage';
import { VirtualDOMNodeType } from '../../src/types/dom-node';
describe('ForensicMCPServer', () => {
    it('should handle initialize and return valid protocol version and capabilities', async () => {
        const storage = new MemoryStorageProvider();
        const server = new ForensicMCPServer(storage);
        const res = await server.handleRequest({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
        });
        expect(res).not.toBeNull();
        expect(res?.result).toHaveProperty('protocolVersion');
        expect(res?.result).toHaveProperty('capabilities');
        expect((res?.result).serverInfo.name).toBe('browser-forensic-mcp');
    });
    it('should list all available MCP debugging tools', async () => {
        const storage = new MemoryStorageProvider();
        const server = new ForensicMCPServer(storage);
        const res = await server.handleRequest({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
        });
        expect(res).not.toBeNull();
        const tools = (res?.result).tools;
        expect(Array.isArray(tools)).toBe(true);
        const toolNames = tools.map((t) => t.name);
        expect(toolNames).toContain('list_sessions');
        expect(toolNames).toContain('get_dom_state');
        expect(toolNames).toContain('diff_dom');
        expect(toolNames).toContain('trace_element');
        expect(toolNames).toContain('why_did_element_disappear');
    });
    it('should execute get_dom_state and diff_dom tools accurately', async () => {
        const storage = new MemoryStorageProvider();
        const sessionId = 'test_mcp_sess';
        // Set up mock session in memory storage
        await storage.saveSession({
            id: sessionId,
            name: 'MCP Test Session',
            url: 'https://test.local',
            origin: 'https://test.local',
            title: 'MCP Test',
            userAgent: 'Agent',
            schemaVersion: '2.0.0',
            recorderVersion: '2.0.0',
            extensionVersion: '2.0.0',
            startTime: 1000,
            durationMs: 500,
            status: 'stopped',
            health: {
                domRecording: 'HEALTHY',
                userEvents: 'HEALTHY',
                console: 'HEALTHY',
                network: 'HEALTHY',
                screenshots: 'HEALTHY',
                shadowDom: 'HEALTHY',
                iframes: 'HEALTHY',
            },
            stats: {
                eventCount: 2,
                mutationCount: 1,
                errorCount: 0,
                consoleCount: 0,
                networkCount: 0,
                checkpointCount: 1,
                screenshotCount: 0,
                nodeCount: 3,
            },
        });
        const initSnapshot = {
            snapshotId: 'snap_init',
            sessionId,
            timestamp: 0,
            sequence: 1,
            rootId: 1,
            nodes: {
                1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
                2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'body', attributes: {}, children: [3], parentId: 1 },
                3: { id: 3, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'h1', attributes: {}, textContent: 'Initial Title', children: [], parentId: 2 },
            },
            title: 'MCP Test',
            url: 'https://test.local',
            origin: 'https://test.local',
            viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
            totalNodeCount: 3,
        };
        await storage.saveInitialSnapshot(sessionId, initSnapshot);
        await storage.saveCheckpoint({
            checkpointId: 'chk_1',
            sessionId,
            timestamp: 0,
            sequence: 1,
            wallClockTime: 1000,
            snapshot: initSnapshot,
            eventIndex: 0,
            eventsSinceLastCheckpoint: 0,
            trigger: 'INITIAL',
        });
        // Add mutation event at T=200
        await storage.appendEvents(sessionId, [
            {
                id: 'mut_add_1',
                sessionId,
                timestamp: 200,
                sequence: 2,
                wallClockTime: 1200,
                type: 'DOM_MUTATION_ADD',
                category: 'DOM',
                source: 'PAGE',
                targetNodeId: 4,
                payload: {
                    node: {
                        id: 4,
                        nodeType: VirtualDOMNodeType.ELEMENT_NODE,
                        tagName: 'div',
                        attributes: { class: 'injected-banner' },
                        children: [],
                        parentId: 2,
                    },
                    parentId: 2,
                    index: 1,
                },
            },
        ]);
        const server = new ForensicMCPServer(storage);
        // Call get_dom_state at T=250
        const stateRes = await server.handleRequest({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'get_dom_state',
                arguments: { sessionId, timestamp: 250, format: 'html' },
            },
        });
        expect(stateRes?.result).toBeDefined();
        const content = (stateRes?.result).content[0].text;
        expect(content).toContain('<div class="injected-banner">');
        // Call diff_dom between T=0 and T=250
        const diffRes = await server.handleRequest({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
                name: 'diff_dom',
                arguments: { sessionId, t1: 0, t2: 250 },
            },
        });
        expect(diffRes?.result).toBeDefined();
        const diffText = (diffRes?.result).content[0].text;
        expect(diffText).toContain('Added Nodes');
        expect(diffText).toContain('injected-banner');
    });
});
//# sourceMappingURL=mcp-server.test.js.map