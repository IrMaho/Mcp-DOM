import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ForensicStorageProvider } from '../storage/storage-interface';
import { SessionSerializer } from '../storage/session-serializer';
import { FileStorageProvider } from '../storage/file-storage';
import { MCPToolsHandler } from './tools-handler';

export class MCPBridgeServer {
  private port: number;
  private storage: ForensicStorageProvider;
  private toolsHandler: MCPToolsHandler;
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;

  constructor(port: number = 3847, storage?: ForensicStorageProvider) {
    this.port = port;
    this.storage = storage || new FileStorageProvider('./.forensic_sessions');
    this.toolsHandler = new MCPToolsHandler(this.storage);
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = req.url || '';

        // 1. Health check
        if (url === '/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', server: 'browser-forensic-bridge', version: '2.0.0' }));
          return;
        }

        // 2. Upload Session Bundle
        if (url === '/api/sessions/upload' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const bundle = SessionSerializer.importFromJson(body);
              await this.storage.saveSession(bundle.metadata);
              await this.storage.saveInitialSnapshot(bundle.metadata.id, bundle.initialSnapshot);
              await this.storage.appendEvents(bundle.metadata.id, bundle.events);
              for (const chk of bundle.checkpoints) {
                await this.storage.saveCheckpoint(chk);
              }
              for (const ann of bundle.annotations) {
                await this.storage.addAnnotation(ann);
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, sessionId: bundle.metadata.id }));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 3. MCP Tool Call via HTTP POST
        if (url === '/api/mcp/tool' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { name, arguments: args } = JSON.parse(body);
              const result = await this.toolsHandler.handleToolCall(name, args || {});
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ isError: true, error: err.message }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      });

      this.wss = new WebSocketServer({ server: this.httpServer });

      this.wss.on('connection', (ws: WebSocket) => {
        ws.on('message', async (data: string) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'SESSION_START') {
              await this.storage.saveSession(message.metadata);
              if (message.initialSnapshot) {
                await this.storage.saveInitialSnapshot(message.metadata.id, message.initialSnapshot);
              }
            } else if (message.type === 'EVENTS_CHUNK') {
              await this.storage.appendEvents(message.sessionId, message.events);
            } else if (message.type === 'CHECKPOINT') {
              await this.storage.saveCheckpoint(message.checkpoint);
            } else if (message.type === 'SESSION_STOP') {
              const session = await this.storage.getSession(message.sessionId);
              if (session) {
                session.status = 'stopped';
                session.endTime = Date.now();
                if (message.durationMs) session.durationMs = message.durationMs;
                await this.storage.saveSession(session);
              }
            }
          } catch (err) {
            console.error('[MCPBridge] WebSocket message processing error:', err);
          }
        });
      });

      this.httpServer.listen(this.port, () => {
        resolve();
      });

      this.httpServer.on('error', (err) => reject(err));
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
      }
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
