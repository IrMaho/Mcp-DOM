import * as readline from 'readline';
import { JSONRPCRequest, JSONRPCResponse } from '../types/mcp-types';
import { FORENSIC_MCP_TOOLS } from './tools-definition';
import { FileStorageProvider } from '../storage/file-storage';

export { FORENSIC_MCP_TOOLS, FileStorageProvider };
import { MCPToolsHandler } from './tools-handler';
import { MCPResourcesHandler } from './resources-handler';
import { ForensicStorageProvider } from '../storage/storage-interface';

export class ForensicMCPServer {
  private storage: ForensicStorageProvider;
  private toolsHandler: MCPToolsHandler;
  private resourcesHandler: MCPResourcesHandler;
  private protocolVersion: string = '2024-11-05';
  private serverInfo = {
    name: 'browser-forensic-mcp',
    version: '2.0.0',
  };

  constructor(storage?: ForensicStorageProvider) {
    this.storage = storage || new FileStorageProvider('./.forensic_sessions');
    this.toolsHandler = new MCPToolsHandler(this.storage);
    this.resourcesHandler = new MCPResourcesHandler(this.storage);
  }

  public async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse | null> {
    const { method, params, id } = request;

    // 1. Initialize
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: this.protocolVersion,
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: this.serverInfo,
        },
      };
    }

    // 2. Initialized notification
    if (method === 'notifications/initialized' || method === 'initialized') {
      return null;
    }

    // 3. Ping
    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    // 4. List Tools
    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: FORENSIC_MCP_TOOLS,
        },
      };
    }

    // 5. Call Tool
    if (method === 'tools/call') {
      const toolName = (params as any)?.name;
      const toolArgs = (params as any)?.arguments || {};
      const result = await this.toolsHandler.handleToolCall(toolName, toolArgs);
      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    }

    // 6. List Resources
    if (method === 'resources/list') {
      const resources = await this.resourcesHandler.listResources();
      return {
        jsonrpc: '2.0',
        id,
        result: { resources },
      };
    }

    // 7. Read Resource
    if (method === 'resources/read') {
      const uri = (params as any)?.uri || '';
      try {
        const content = await this.resourcesHandler.readResource(uri);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [content],
          },
        };
      } catch (err: any) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: err.message,
          },
        };
      }
    }

    // 8. Prompts List
    if (method === 'prompts/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          prompts: [
            {
              name: 'diagnose_disappearing_element',
              description: 'Run an autonomous root-cause investigation on why an injected web element disappeared.',
              arguments: [
                { name: 'sessionId', description: 'ID of the session', required: true },
                { name: 'targetSelector', description: 'CSS selector of the disappearing element', required: true },
              ],
            },
            {
              name: 'compare_dom_states',
              description: 'Perform a structural diff and timeline causality analysis between two timestamps.',
              arguments: [
                { name: 'sessionId', description: 'ID of the session', required: true },
                { name: 't1', description: 'Timestamp before the change (ms)', required: true },
                { name: 't2', description: 'Timestamp after the change (ms)', required: true },
              ],
            },
          ],
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method '${method}' not found`,
      },
    };
  }

  public startStdio(): void {
    process.stderr.write('[MCP] Browser Forensic MCP Server started on stdio\n');

    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const req: JSONRPCRequest = JSON.parse(trimmed);
        const res = await this.handleRequest(req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch (err: any) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: `Parse error: ${err.message}`,
          },
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    });
  }
}
