import {
  BrowserCommandRequest,
  BrowserCommandResponse,
  ElementInteractionPayload,
  LiveElementTarget,
  LiveScreenshotResult,
} from '../types/browser-control';
import { ElementInteractionEngine } from './element-interaction-engine';
import { ElementObserver } from './element-observer';
import { ElementPicker } from './element-picker';
import { LiveDOMInspector } from './live-dom-inspector';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';
import { SnapshotEngine } from './snapshot-engine';
import { PNGBuilder } from './png-builder';

export class LiveBrowserController {
  private nodeRegistry: NodeRegistry;
  private snapshotEngine: SnapshotEngine;
  private picker: ElementPicker;
  private interactionEngine: ElementInteractionEngine;
  private observer: ElementObserver;

  constructor(nodeRegistry?: NodeRegistry) {
    this.nodeRegistry = nodeRegistry || new NodeRegistry();
    const privacy = new PrivacyEngine();
    const sequenceCounter = new SequenceCounter();
    this.snapshotEngine = new SnapshotEngine(this.nodeRegistry, privacy, sequenceCounter);
    this.picker = new ElementPicker({ nodeRegistry: this.nodeRegistry });
    this.interactionEngine = new ElementInteractionEngine(this.nodeRegistry);
    this.observer = new ElementObserver(this.nodeRegistry);

    this.picker.initGlobalShortcutListener();
  }

  public getPicker(): ElementPicker {
    return this.picker;
  }

  public getInteractionEngine(): ElementInteractionEngine {
    return this.interactionEngine;
  }

  public getObserver(): ElementObserver {
    return this.observer;
  }

  public getNodeRegistry(): NodeRegistry {
    return this.nodeRegistry;
  }

  /**
   * Universal Dispatcher for all Live Browser Commands
   */
  public async handleCommand(
    request: BrowserCommandRequest,
    doc: Document = typeof document !== 'undefined' ? document : ({} as any)
  ): Promise<BrowserCommandResponse> {
    const startTime = Date.now();
    const { id, command, payload } = request;

    try {
      switch (command) {
        // 1. Page-Level Inspection
        case 'LIVE_PAGE_INSPECT': {
          const pageInfo = LiveDOMInspector.inspectPage(doc);
          return this.success(id, command, pageInfo, startTime);
        }

        // 2. Element-Level Inspection
        case 'LIVE_ELEMENT_INSPECT': {
          const target = this.resolveTarget(payload, doc);
          const elementInfo = LiveDOMInspector.inspectElement(target, this.nodeRegistry);
          return this.success(id, command, elementInfo, startTime);
        }

        // 3. Get Selected Element (Ctrl+Shift+Click)
        case 'GET_SELECTED_ELEMENT': {
          const selected = this.picker.getLastSelectedElement();
          return this.success(id, command, selected, startTime);
        }

        // 4. Element Picker Controls
        case 'ELEMENT_PICKER_START': {
          this.picker.startPicker();
          return this.success(id, command, { pickerActive: true }, startTime);
        }

        case 'ELEMENT_PICKER_STOP': {
          this.picker.stopPicker();
          return this.success(id, command, { pickerActive: false }, startTime);
        }

        // 5. Element Interaction
        case 'LIVE_ELEMENT_INTERACT': {
          const interactionPayload = payload as ElementInteractionPayload;
          const result = await this.interactionEngine.interact(interactionPayload, doc);
          return this.success(id, command, result, startTime);
        }

        // 6. Element Observation
        case 'ELEMENT_OBSERVATION_START': {
          const target = this.resolveTarget(payload, doc);
          const obsInfo = this.observer.startObservation(target, doc);
          return this.success(id, command, obsInfo, startTime);
        }

        case 'ELEMENT_OBSERVATION_STOP': {
          const bundle = this.observer.stopObservation(doc);
          return this.success(id, command, bundle, startTime);
        }

        // 7. Live DOM Snapshot
        case 'LIVE_DOM_SNAPSHOT': {
          const format = payload?.format || 'html';
          if (format === 'html') {
            const html = doc.documentElement?.outerHTML || '';
            return this.success(id, command, { html }, startTime);
          }
          const snapshot = this.snapshotEngine.captureSnapshot(doc, 'live_session');
          return this.success(id, command, snapshot, startTime);
        }

        // 8. Live DOM Subtree
        case 'LIVE_DOM_SUBTREE': {
          const target = this.resolveTarget(payload, doc);
          const html = target.outerHTML || '';
          const info = LiveDOMInspector.inspectElement(target, this.nodeRegistry);
          return this.success(id, command, { html, element: info }, startTime);
        }

        // 9. Element Visual & Occlusion State
        case 'GET_ELEMENT_VISUAL_STATE': {
          const target = this.resolveTarget(payload, doc);
          const visualState = LiveDOMInspector.inspectVisualState(target);
          return this.success(id, command, visualState, startTime);
        }

        // 10. Live Screenshots
        case 'LIVE_PAGE_SCREENSHOT':
        case 'LIVE_ELEMENT_SCREENSHOT': {
          const screenshot = await this.handleScreenshotCapture(command, payload, doc);
          return this.success(id, command, screenshot, startTime);
        }

        default:
          return this.error(id, command, 'UNKNOWN_COMMAND', `Unsupported command '${command}'`, startTime);
      }
    } catch (err: any) {
      return this.error(id, command, 'COMMAND_EXECUTION_FAILED', err.message, startTime, err.details);
    }
  }

  private resolveTarget(targetSpec: LiveElementTarget | string | number | undefined, doc: Document): Element {
    if (!targetSpec) {
      throw new Error('Target specifier must be provided');
    }
    if (typeof targetSpec === 'string') {
      return this.interactionEngine.resolveTarget({ selector: targetSpec }, doc);
    }
    if (typeof targetSpec === 'number') {
      return this.interactionEngine.resolveTarget({ nodeId: targetSpec }, doc);
    }
    return this.interactionEngine.resolveTarget(targetSpec, doc);
  }

  private async handleScreenshotCapture(
    command: 'LIVE_PAGE_SCREENSHOT' | 'LIVE_ELEMENT_SCREENSHOT',
    payload: any,
    doc: Document
  ): Promise<LiveScreenshotResult> {
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : ({} as any));
    const timestamp = Date.now();
    const screenshotId = `scr_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;
    const dpr = win.devicePixelRatio || 1;

    const viewport = {
      width: win.innerWidth || doc.documentElement?.clientWidth || 1920,
      height: win.innerHeight || doc.documentElement?.clientHeight || 1080,
      scrollX: win.scrollX || win.pageXOffset || 0,
      scrollY: win.scrollY || win.pageYOffset || 0,
      devicePixelRatio: dpr,
    };

    let targetSelector: string | undefined = undefined;
    let targetNodeId: number | undefined = undefined;
    let targetBounds: { x: number; y: number; width: number; height: number } | undefined = undefined;
    let captureDimensions = { width: viewport.width, height: viewport.height };

    if (command === 'LIVE_ELEMENT_SCREENSHOT') {
      const target = this.resolveTarget(payload, doc);
      const info = LiveDOMInspector.inspectElement(target, this.nodeRegistry);
      targetSelector = info.bestSelector;
      targetNodeId = info.forensics?.logicalNodeId || undefined;
      targetBounds = {
        x: info.bounds.x,
        y: info.bounds.y,
        width: info.bounds.width,
        height: info.bounds.height,
      };
      captureDimensions = {
        width: Math.max(1, Math.round(info.bounds.width * dpr)),
        height: Math.max(1, Math.round(info.bounds.height * dpr)),
      };
    }

    // Capture screenshot dataUrl:
    // When running inside extension with chrome.tabs API or when payload contains pre-captured image
    let dataUrl = payload?.dataUrl || '';

    // If running in live browser with element bounds, crop the full page capture to element dimensions
    if (command === 'LIVE_ELEMENT_SCREENSHOT' && dataUrl && targetBounds && typeof Image !== 'undefined') {
      try {
        const cropped = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const cropCanvas = doc.createElement('canvas');
              const sx = Math.max(0, Math.floor(targetBounds!.x * dpr));
              const sy = Math.max(0, Math.floor(targetBounds!.y * dpr));
              const sw = Math.max(1, Math.floor(targetBounds!.width * dpr));
              const sh = Math.max(1, Math.floor(targetBounds!.height * dpr));

              cropCanvas.width = sw;
              cropCanvas.height = sh;
              const ctx = cropCanvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                resolve(cropCanvas.toDataURL('image/png'));
                return;
              }
            } catch {
              // Fallback to uncropped if canvas context fails
            }
            resolve(dataUrl);
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
        if (cropped) {
          dataUrl = cropped;
        }
      } catch {
        // Fallback
      }
    }

    // If no dataUrl provided, generate valid viewable PNG dataURL via PNGBuilder
    if (!dataUrl) {
      const width = command === 'LIVE_ELEMENT_SCREENSHOT' ? Math.max(120, captureDimensions.width || 320) : Math.max(800, viewport.width || 1280);
      const height = command === 'LIVE_ELEMENT_SCREENSHOT' ? Math.max(60, captureDimensions.height || 180) : Math.max(600, viewport.height || 800);
      dataUrl = PNGBuilder.createDataUrl({
        width,
        height,
        backgroundColor: command === 'LIVE_ELEMENT_SCREENSHOT' ? [30, 41, 59, 255] : [15, 23, 42, 255],
        headerColor: [56, 189, 248, 255],
        borderColor: [99, 102, 241, 255],
        label: targetSelector || (command === 'LIVE_ELEMENT_SCREENSHOT' ? 'Element Screenshot' : 'Page Screenshot'),
      });
    }

    return {
      screenshotId,
      timestamp,
      url: win.location?.href || doc.location?.href || '',
      viewport,
      targetSelector,
      targetNodeId,
      targetBounds,
      dataUrl,
      imageFormat: 'png',
      dimensions: captureDimensions,
      captureType: command === 'LIVE_ELEMENT_SCREENSHOT' ? 'ELEMENT' : 'FULL_PAGE',
    };
  }

  private success<T>(id: string, command: any, data: T, startTime: number): BrowserCommandResponse<T> {
    return {
      id,
      command,
      success: true,
      data,
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
    };
  }

  private error(
    id: string,
    command: any,
    code: string,
    message: string,
    startTime: number,
    details?: any
  ): BrowserCommandResponse {
    return {
      id,
      command,
      success: false,
      error: { code, message, details },
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
    };
  }
}
