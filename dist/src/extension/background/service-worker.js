import { IndexedDBStorageProvider } from '../../storage/indexeddb-storage';
const storage = new IndexedDBStorageProvider('ForensicExtensionDB');
let wsBridge = null;
function connectBridge() {
    try {
        if (typeof WebSocket !== 'undefined') {
            const ws = new WebSocket('ws://localhost:3847');
            ws.onopen = () => {
                wsBridge = ws;
            };
            ws.onclose = () => {
                wsBridge = null;
                setTimeout(connectBridge, 5000);
            };
            ws.onerror = () => {
                wsBridge = null;
            };
        }
    }
    catch {
        // Bridge might not be running locally
    }
}
connectBridge();
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        (async () => {
            try {
                if (message.type === 'FORENSIC_SESSION_START') {
                    await storage.saveSession(message.metadata);
                    if (message.initialSnapshot) {
                        await storage.saveInitialSnapshot(message.metadata.id, message.initialSnapshot);
                    }
                    if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
                        wsBridge.send(JSON.stringify(message));
                    }
                    sendResponse({ success: true });
                }
                else if (message.type === 'FORENSIC_EVENTS_CHUNK') {
                    await storage.appendEvents(message.sessionId, message.events);
                    if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
                        wsBridge.send(JSON.stringify(message));
                    }
                    sendResponse({ success: true });
                }
                else if (message.type === 'FORENSIC_CHECKPOINT') {
                    await storage.saveCheckpoint(message.checkpoint);
                    if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
                        wsBridge.send(JSON.stringify(message));
                    }
                    sendResponse({ success: true });
                }
                else if (message.type === 'FORENSIC_SESSION_STOP') {
                    const session = await storage.getSession(message.sessionId);
                    if (session) {
                        session.status = 'stopped';
                        session.endTime = Date.now();
                        if (message.metadata?.durationMs) {
                            session.durationMs = message.metadata.durationMs;
                        }
                        await storage.saveSession(session);
                    }
                    if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
                        wsBridge.send(JSON.stringify(message));
                    }
                    sendResponse({ success: true });
                }
                else if (message.type === 'CAPTURE_SCREENSHOT') {
                    if (chrome.tabs?.captureVisibleTab) {
                        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
                            sendResponse({ success: !!dataUrl, dataUrl });
                        });
                        return;
                    }
                    sendResponse({ success: false, error: 'Screenshot capture unsupported' });
                }
            }
            catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true; // Keep message channel open for async response
    });
}
//# sourceMappingURL=service-worker.js.map