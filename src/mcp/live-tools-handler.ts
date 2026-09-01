import { LiveBrowserController } from '../core/live-browser-controller';
import { BrowserCommandType } from '../types/browser-control';
import { MCPToolCallResult } from '../types/mcp-types';

export interface BrowserBridgeClient {
  sendCommand(command: BrowserCommandType, payload?: any): Promise<any>;
}

export class LiveToolsHandler {
  private localController: LiveBrowserController;
  private bridgeClient?: BrowserBridgeClient;

  constructor(localController?: LiveBrowserController, bridgeClient?: BrowserBridgeClient) {
    this.localController = localController || new LiveBrowserController();
    this.bridgeClient = bridgeClient;
  }

  public setBridgeClient(client: BrowserBridgeClient): void {
    this.bridgeClient = client;
  }

  public getLocalController(): LiveBrowserController {
    return this.localController;
  }

  public async handleToolCall(name: string, args: Record<string, any>): Promise<MCPToolCallResult> {
    try {
      switch (name) {
        case 'inspect_live_page':
          return await this.handleInspectLivePage(args);

        case 'inspect_live_element':
          return await this.handleInspectLiveElement(args);

        case 'get_selected_element':
          return await this.handleGetSelectedElement(args);

        case 'start_element_picker':
          return await this.handleStartElementPicker(args);

        case 'stop_element_picker':
          return await this.handleStopElementPicker(args);

        case 'capture_page_screenshot':
          return await this.handleCapturePageScreenshot(args);

        case 'capture_element_screenshot':
          return await this.handleCaptureElementScreenshot(args);

        case 'interact_with_element':
          return await this.handleInteractWithElement(args);

        case 'start_element_observation':
          return await this.handleStartElementObservation(args);

        case 'stop_element_observation':
          return await this.handleStopElementObservation(args);

        case 'get_live_dom_snapshot':
          return await this.handleGetLiveDOMSnapshot(args);

        case 'get_live_dom_subtree':
          return await this.handleGetLiveDOMSubtree(args);

        case 'get_element_visual_state':
          return await this.handleGetElementVisualState(args);

        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown live tool: ${name}` }],
          };
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Live tool execution error in '${name}': ${err.message}` }],
      };
    }
  }

  private async dispatch(command: BrowserCommandType, payload?: any): Promise<any> {
    if (this.bridgeClient) {
      try {
        return await this.bridgeClient.sendCommand(command, payload);
      } catch {
        // Fall back to local controller
      }
    }
    const req = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      command,
      timestamp: Date.now(),
      payload,
    };
    const res = await this.localController.handleCommand(req);
    if (!res.success) {
      throw new Error(res.error?.message || 'Browser command failed');
    }
    return res.data;
  }

  // 1. inspect_live_page
  private async handleInspectLivePage(args: Record<string, any>): Promise<MCPToolCallResult> {
    const data = await this.dispatch('LIVE_PAGE_INSPECT', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  // 2. inspect_live_element
  private async handleInspectLiveElement(args: Record<string, any>): Promise<MCPToolCallResult> {
    const target = this.extractTarget(args);
    const data = await this.dispatch('LIVE_ELEMENT_INSPECT', target);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  // 3. get_selected_element
  private async handleGetSelectedElement(_args: Record<string, any>): Promise<MCPToolCallResult> {
    let data = this.localController.getPicker().getLastSelectedElement();
    if (!data) {
      try {
        data = await this.dispatch('GET_SELECTED_ELEMENT');
      } catch {
        // Fallback
      }
    }
    if (!data) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              selected: false,
              message: 'No element has been selected yet. Use Ctrl + Shift + Click in the browser or call start_element_picker.',
            }, null, 2),
          },
        ],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ selected: true, element: data }, null, 2) }],
    };
  }

  // 4. start_element_picker
  private async handleStartElementPicker(args: Record<string, any>): Promise<MCPToolCallResult> {
    const data = await this.dispatch('ELEMENT_PICKER_START', args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'PICKER_ACTIVE',
            message: 'Visual element picker activated in the browser. Click any element or hold Ctrl+Shift and click.',
            details: data,
          }, null, 2),
        },
      ],
    };
  }

  // 5. stop_element_picker
  private async handleStopElementPicker(args: Record<string, any>): Promise<MCPToolCallResult> {
    const data = await this.dispatch('ELEMENT_PICKER_STOP', args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'PICKER_INACTIVE',
            message: 'Visual element picker stopped.',
            details: data,
          }, null, 2),
        },
      ],
    };
  }

  // 6. capture_page_screenshot
  private async handleCapturePageScreenshot(args: Record<string, any>): Promise<MCPToolCallResult> {
    const data = await this.dispatch('LIVE_PAGE_SCREENSHOT', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  // 7. capture_element_screenshot
  private async handleCaptureElementScreenshot(args: Record<string, any>): Promise<MCPToolCallResult> {
    const target = this.extractTarget(args);
    const data = await this.dispatch('LIVE_ELEMENT_SCREENSHOT', target);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  // 8. interact_with_element
  private async handleInteractWithElement(args: Record<string, any>): Promise<MCPToolCallResult> {
    const target = this.extractTarget(args);
    const action = args.action || 'click';
    const payload = {
      action,
      target,
      text: args.text,
      key: args.key,
      optionValue: args.optionValue,
      scrollDelta: args.scrollDelta,
      options: {
        waitForStabilization: args.waitForStabilization !== false,
        stabilizationTimeoutMs: args.stabilizationTimeoutMs || 300,
        captureScreenshots: args.captureScreenshots || false,
      },
    };

    const data = await this.dispatch('LIVE_ELEMENT_INTERACT', payload);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  // 9. start_element_observation
  private async handleStartElementObservation(args: Record<string, any>): Promise<MCPToolCallResult> {
    const target = this.extractTarget(args);
    const data = await this.dispatch('ELEMENT_OBSERVATION_START', target);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'OBSERVATION_ACTIVE',
            message: 'Focused observation started around target element.',
            initialState: data.initialState,
            observationId: data.observationId,
          }, null, 2),
        },
      ],
    };
  }

  // 10. stop_element_observation
  private async handleStopElementObservation(args: Record<string, any>): Promise<MCPToolCallResult> {
    const data = await this.dispatch('ELEMENT_OBSERVATION_STOP', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  // 11. get_live_dom_snapshot
  private async handleGetLiveDOMSnapshot(args: Record<string, any>): Promise<MCPToolCallResult> {
    const data = await this.dispatch('LIVE_DOM_SNAPSHOT', args);
    if (typeof data?.html === 'string') {
      return { content: [{ type: 'text', text: data.html }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  // 12. get_live_dom_subtree
  private async handleGetLiveDOMSubtree(args: Record<string, any>): Promise<MCPToolCallResult> {
    const target = this.extractTarget(args);
    const data = await this.dispatch('LIVE_DOM_SUBTREE', target);
    if (typeof data?.html === 'string') {
      return { content: [{ type: 'text', text: data.html }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  // 13. get_element_visual_state
  private async handleGetElementVisualState(args: Record<string, any>): Promise<MCPToolCallResult> {
    const target = this.extractTarget(args);
    const data = await this.dispatch('GET_ELEMENT_VISUAL_STATE', target);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  private extractTarget(args: Record<string, any>): any {
    if (args.target) return args.target;
    if (args.selector) return { selector: args.selector };
    if (typeof args.nodeId === 'number') return { nodeId: args.nodeId };
    if (args.selectedElementRef) return { selectedElementRef: args.selectedElementRef };
    if (args.xpath) return { xpath: args.xpath };
    if (args.coordinates) return { coordinates: args.coordinates };
    return args;
  }
}
