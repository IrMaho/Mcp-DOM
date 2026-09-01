import * as http from "http";
import { WebSocketServer } from "ws";
import { F as FileStorageProvider, M as MCPToolsHandler, S as SessionSerializer } from "./assets/tools-handler-CJ_AUmS1.js";
import "fs";
import "path";
import "readline";
class MCPBridgeServer {
  port;
  storage;
  toolsHandler;
  httpServer = null;
  wss = null;
  activeSockets = /* @__PURE__ */ new Set();
  pendingCommands = /* @__PURE__ */ new Map();
  constructor(port = 3847, storage) {
    this.port = port;
    this.storage = storage || new FileStorageProvider("./.forensic_sessions");
    this.toolsHandler = new MCPToolsHandler(this.storage);
    this.toolsHandler.getLiveToolsHandler().setBridgeClient(this);
  }
  getToolsHandler() {
    return this.toolsHandler;
  }
  /**
   * BrowserBridgeClient implementation: Send live command to connected Chrome extension
   */
  async sendCommand(command, payload) {
    if (this.activeSockets.size === 0) {
      throw new Error("No active browser extension connected to MCP bridge");
    }
    const commandId = `bridge_cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ws = Array.from(this.activeSockets)[this.activeSockets.size - 1];
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error(`Browser command '${command}' timed out after 8000ms`));
      }, 8e3);
      this.pendingCommands.set(commandId, { resolve, reject, timer });
      ws.send(
        JSON.stringify({
          type: "BROWSER_COMMAND_REQUEST",
          id: commandId,
          command,
          payload,
          timestamp: Date.now()
        })
      );
    });
  }
  start() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }
        const url = req.url || "";
        if (url === "/health" && req.method === "GET") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ok",
              server: "browser-forensic-bridge",
              version: "2.0.0",
              connectedBrowsers: this.activeSockets.size
            })
          );
          return;
        }
        const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;
        if (url === "/api/sessions/upload" && req.method === "POST") {
          let body = "";
          let isTooLarge = false;
          req.on("data", (chunk) => {
            if (isTooLarge) return;
            body += chunk;
            if (body.length > MAX_PAYLOAD_BYTES) {
              isTooLarge = true;
              res.writeHead(413, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Payload too large (exceeds 50MB)" }));
              req.destroy();
            }
          });
          req.on("end", async () => {
            if (isTooLarge) return;
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
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, sessionId: bundle.metadata.id }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        if (url === "/api/mcp/tool" && req.method === "POST") {
          let body = "";
          let isTooLarge = false;
          req.on("data", (chunk) => {
            if (isTooLarge) return;
            body += chunk;
            if (body.length > MAX_PAYLOAD_BYTES) {
              isTooLarge = true;
              res.writeHead(413, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Payload too large (exceeds 50MB)" }));
              req.destroy();
            }
          });
          req.on("end", async () => {
            if (isTooLarge) return;
            try {
              const { name, arguments: args } = JSON.parse(body);
              const result = await this.toolsHandler.handleToolCall(name, args || {});
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ isError: true, error: err.message }));
            }
          });
          return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Endpoint not found" }));
      });
      this.wss = new WebSocketServer({ server: this.httpServer });
      this.wss.on("connection", (ws) => {
        this.activeSockets.add(ws);
        ws.on("close", () => {
          this.activeSockets.delete(ws);
        });
        ws.on("error", () => {
          this.activeSockets.delete(ws);
        });
        ws.on("message", async (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "BROWSER_COMMAND_RESPONSE" && message.id) {
              const pending = this.pendingCommands.get(message.id);
              if (pending) {
                clearTimeout(pending.timer);
                this.pendingCommands.delete(message.id);
                if (message.success) {
                  pending.resolve(message.data);
                } else {
                  pending.reject(new Error(message.error?.message || "Browser command failed"));
                }
              }
              return;
            }
            if (message.type === "ELEMENT_SELECTED" && message.elementInfo) {
              this.toolsHandler.getLiveToolsHandler().getLocalController().getPicker().setSelectedElement(message.elementInfo);
              return;
            }
            if (message.type === "SESSION_START" || message.type === "FORENSIC_SESSION_START") {
              await this.storage.saveSession(message.metadata);
              if (message.initialSnapshot) {
                await this.storage.saveInitialSnapshot(message.metadata.id, message.initialSnapshot);
              }
            } else if (message.type === "EVENTS_CHUNK" || message.type === "FORENSIC_EVENTS_CHUNK") {
              await this.storage.appendEvents(message.sessionId, message.events);
            } else if (message.type === "CHECKPOINT" || message.type === "FORENSIC_CHECKPOINT") {
              await this.storage.saveCheckpoint(message.checkpoint);
            } else if (message.type === "SESSION_STOP" || message.type === "FORENSIC_SESSION_STOP") {
              const session = await this.storage.getSession(message.sessionId);
              if (session) {
                session.status = "stopped";
                session.endTime = Date.now();
                if (message.durationMs) session.durationMs = message.durationMs;
                await this.storage.saveSession(session);
              }
            }
          } catch (err) {
            console.error("[MCPBridge] WebSocket message processing error:", err);
          }
        });
      });
      this.httpServer.listen(this.port, () => {
        resolve();
      });
      this.httpServer.on("error", (err) => reject(err));
    });
  }
  stop() {
    return new Promise((resolve) => {
      for (const [_, pending] of this.pendingCommands) {
        clearTimeout(pending.timer);
        pending.reject(new Error("MCP Bridge stopped"));
      }
      this.pendingCommands.clear();
      this.activeSockets.clear();
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
export {
  MCPBridgeServer
};
