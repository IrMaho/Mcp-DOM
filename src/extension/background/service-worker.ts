import { IndexedDBStorageProvider } from '../../storage/indexeddb-storage';
import { BaseEvent } from '../../types/events';

const storage = new IndexedDBStorageProvider('ForensicExtensionDB');
let wsBridge: WebSocket | null = null;

// Tab-specific active recording state
interface ActiveRecording {
  sessionId: string;
  sessionName: string;
  startTime: number;
  initialUrl: string;
  isRecording: boolean;
}

const activeTabRecordings = new Map<number, ActiveRecording>();

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
  } catch {
    // Bridge might not be running locally
  }
}

connectBridge();

// WebNavigation listener to capture reload, back, forward, and link navigations
if (typeof chrome !== 'undefined' && chrome.webNavigation?.onCommitted) {
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    // Only care about top-level frames for active recording tabs
    if (details.frameId !== 0) return;

    const tabId = details.tabId;
    const active = activeTabRecordings.get(tabId);
    if (!active || !active.isRecording) return;

    let navType: 'NAV_RELOAD' | 'NAV_FORWARD_BACK' | 'NAV_LINK' | 'NAV_OTHER' = 'NAV_OTHER';
    if (details.transitionType === 'reload') navType = 'NAV_RELOAD';
    else if (details.transitionQualifiers?.includes('forward_back')) navType = 'NAV_FORWARD_BACK';
    else if (details.transitionType === 'link') navType = 'NAV_LINK';

    const navEvent: BaseEvent = {
      id: `nav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId: active.sessionId,
      timestamp: Date.now() - active.startTime,
      sequence: 999999, // Will be ordered by timestamp
      wallClockTime: Date.now(),
      type: navType as any,
      category: 'NAVIGATION',
      source: 'USER_INTERACTION',
      payload: {
        url: details.url,
        transitionType: details.transitionType,
        transitionQualifiers: details.transitionQualifiers,
        tabId: details.tabId,
      },
    };

    try {
      await storage.appendEvents(active.sessionId, [navEvent]);
      if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
        wsBridge.send(JSON.stringify({ type: 'FORENSIC_EVENTS_CHUNK', sessionId: active.sessionId, events: [navEvent] }));
      }
    } catch {
      // Ignored
    }
  });
}

// Handle runtime messages
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        const tabId = sender.tab?.id ?? message.tabId;

        if (message.type === 'FORENSIC_SESSION_START') {
          if (tabId) {
            activeTabRecordings.set(tabId, {
              sessionId: message.metadata.id,
              sessionName: message.metadata.name,
              startTime: message.metadata.startTime,
              initialUrl: message.metadata.url,
              isRecording: true,
            });
          }

          await storage.saveSession(message.metadata);
          if (message.initialSnapshot) {
            await storage.saveInitialSnapshot(message.metadata.id, message.initialSnapshot);
          }

          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }

          sendResponse({ success: true, sessionId: message.metadata.id });
        } else if (message.type === 'GET_TAB_RECORDING_STATE') {
          const active = tabId ? activeTabRecordings.get(tabId) : null;
          sendResponse({
            isRecording: !!active?.isRecording,
            recording: active || null,
          });
        } else if (message.type === 'FORENSIC_EVENTS_CHUNK') {
          await storage.appendEvents(message.sessionId, message.events);

          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }

          sendResponse({ success: true });
        } else if (message.type === 'FORENSIC_CHECKPOINT') {
          await storage.saveCheckpoint(message.checkpoint);

          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }

          sendResponse({ success: true });
        } else if (message.type === 'FORENSIC_SESSION_STOP') {
          if (tabId) {
            activeTabRecordings.delete(tabId);
          }

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
        } else if (message.type === 'OPEN_DASHBOARD_TAB') {
          const url = chrome.runtime.getURL(`dist/src/ui/index.html${message.sessionId ? `?session=${message.sessionId}` : ''}`);
          chrome.tabs.create({ url });
          sendResponse({ success: true, url });
        } else if (message.type === 'CAPTURE_SCREENSHOT') {
          if (chrome.tabs?.captureVisibleTab) {
            chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
              sendResponse({ success: !!dataUrl, dataUrl });
            });
            return;
          }
          sendResponse({ success: false, error: 'Screenshot capture unsupported' });
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // Keep message channel open for async response
  });
}
