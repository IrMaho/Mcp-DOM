import { r as FileStorageProvider, t as MCPToolsHandler } from "./assets/tools-handler-Bc3nr5jC.js";
import * as readline from "readline";
//#region src/mcp/tools-definition.ts
var FORENSIC_MCP_TOOLS = [
	{
		name: "list_sessions",
		description: "List all recorded browser forensic debugging sessions with metadata, timestamps, and stats.",
		inputSchema: {
			type: "object",
			properties: { limit: {
				type: "number",
				description: "Maximum number of sessions to return"
			} }
		}
	},
	{
		name: "get_session",
		description: "Retrieve full metadata, capabilities, health status, and statistics for a specific debugging session.",
		inputSchema: {
			type: "object",
			properties: { sessionId: {
				type: "string",
				description: "Unique identifier of the recording session"
			} },
			required: ["sessionId"]
		}
	},
	{
		name: "export_session",
		description: "Export a complete recording session as a portable, self-contained JSON bundle.",
		inputSchema: {
			type: "object",
			properties: { sessionId: {
				type: "string",
				description: "Unique identifier of the recording session"
			} },
			required: ["sessionId"]
		}
	},
	{
		name: "import_session",
		description: "Import a recording session bundle from raw JSON string.",
		inputSchema: {
			type: "object",
			properties: { bundleJson: {
				type: "string",
				description: "Raw JSON string of the session bundle"
			} },
			required: ["bundleJson"]
		}
	},
	{
		name: "delete_session",
		description: "Delete a recording session from storage.",
		inputSchema: {
			type: "object",
			properties: { sessionId: {
				type: "string",
				description: "Unique identifier of the recording session"
			} },
			required: ["sessionId"]
		}
	},
	{
		name: "get_timeline",
		description: "Retrieve summary breakdown of events across the session timeline, including event categories and significant milestones.",
		inputSchema: {
			type: "object",
			properties: { sessionId: {
				type: "string",
				description: "Session ID"
			} },
			required: ["sessionId"]
		}
	},
	{
		name: "get_events",
		description: "Query recorded events with filtering by category (DOM, USER, ERROR, CONSOLE, NETWORK, etc.), type, timestamp range, target node, or search query.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				category: {
					type: "string",
					description: "Filter by category (DOM, USER, ERROR, CONSOLE, NETWORK, NAVIGATION, etc.)"
				},
				type: {
					type: "string",
					description: "Filter by exact event type (e.g. DOM_MUTATION_ADD, RUNTIME_ERROR, USER_CLICK)"
				},
				fromTimestamp: {
					type: "number",
					description: "Start timestamp in milliseconds"
				},
				toTimestamp: {
					type: "number",
					description: "End timestamp in milliseconds"
				},
				targetNodeId: {
					type: "number",
					description: "Filter by affected LogicalNodeId"
				},
				targetSelector: {
					type: "string",
					description: "Filter by CSS selector substring"
				},
				searchQuery: {
					type: "string",
					description: "Search term inside event payload"
				},
				limit: {
					type: "number",
					description: "Max events to return (default: 50)"
				},
				offset: {
					type: "number",
					description: "Offset for pagination"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "get_events_around",
		description: "Retrieve a focused contextual window of events occurring immediately before and after a specific timestamp or event ID.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				timestamp: {
					type: "number",
					description: "Target timestamp in milliseconds"
				},
				eventId: {
					type: "string",
					description: "Target event ID"
				},
				windowMs: {
					type: "number",
					description: "Window radius in milliseconds (default: 300ms)"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "get_dom_state",
		description: "Reconstruct the complete DOM snapshot at an arbitrary timestamp or event ID using checkpoint delta replay.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				timestamp: {
					type: "number",
					description: "Target timestamp in milliseconds"
				},
				eventId: {
					type: "string",
					description: "Target event ID"
				},
				format: {
					type: "string",
					enum: [
						"html",
						"json_summary",
						"full_nodes"
					],
					description: "Output format (default: html)"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "get_dom_node",
		description: "Inspect detailed properties of a specific DOM node at a given timestamp (tag, attributes, text, parent, children, visibility state).",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				timestamp: {
					type: "number",
					description: "Timestamp in milliseconds"
				},
				nodeId: {
					type: "number",
					description: "LogicalNodeId to inspect"
				},
				selector: {
					type: "string",
					description: "CSS selector query if nodeId is unknown"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "get_dom_subtree",
		description: "Reconstruct and extract the HTML of a specific subtree (e.g. #app or .gpt-panel) at a given timestamp.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				timestamp: {
					type: "number",
					description: "Timestamp in milliseconds"
				},
				selector: {
					type: "string",
					description: "CSS selector for the root of the subtree"
				},
				nodeId: {
					type: "number",
					description: "LogicalNodeId for the root of the subtree"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "diff_dom",
		description: "Compare two DOM states between timestamp T1 and T2 (or event E1 and E2) and return structured additions, removals, moves, attribute, style, and text changes.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				t1: {
					type: "number",
					description: "Start timestamp in milliseconds"
				},
				t2: {
					type: "number",
					description: "End timestamp in milliseconds"
				},
				e1: {
					type: "string",
					description: "Start event ID (alternative to t1)"
				},
				e2: {
					type: "string",
					description: "End event ID (alternative to t2)"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "trace_element",
		description: "Trace the entire chronological lifecycle of a DOM element from creation, mounting, mutations, style changes to unmounting/removal.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				nodeId: {
					type: "number",
					description: "LogicalNodeId of the element"
				},
				selector: {
					type: "string",
					description: "CSS selector hint for the element"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "find_disappearing_elements",
		description: "Automatically scan the session and identify all elements that existed temporarily and were subsequently removed or hidden.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				maxLifespanMs: {
					type: "number",
					description: "Maximum lifespan in ms to consider (default: 5000ms)"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "why_did_element_disappear",
		description: "Forensic root-cause diagnosis for why an injected or existing UI element disappeared. Pinpoints removal mechanism, ancestor container destruction, style changes, and correlated errors/network triggers.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				target: {
					type: "string",
					description: "CSS selector or LogicalNodeId of the target element"
				}
			},
			required: ["sessionId", "target"]
		}
	},
	{
		name: "get_diagnostics",
		description: "Query recorded console messages, runtime errors, and unhandled promise rejections with stack traces.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				level: {
					type: "string",
					enum: [
						"all",
						"error",
						"warn",
						"info",
						"log"
					],
					description: "Log level filter"
				},
				fromTimestamp: {
					type: "number",
					description: "Start timestamp"
				},
				toTimestamp: {
					type: "number",
					description: "End timestamp"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "get_network_events",
		description: "Query recorded network requests and responses correlated with timing and duration.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				statusFilter: {
					type: "string",
					enum: [
						"all",
						"errors_only",
						"success_only"
					],
					description: "HTTP status filter"
				}
			},
			required: ["sessionId"]
		}
	},
	{
		name: "get_screenshots",
		description: "List visual checkpoints and screenshot checkpoints captured during the recording session.",
		inputSchema: {
			type: "object",
			properties: { sessionId: {
				type: "string",
				description: "Session ID"
			} },
			required: ["sessionId"]
		}
	},
	{
		name: "annotate_session",
		description: "Add an investigative annotation or hypothesis to the session timeline.",
		inputSchema: {
			type: "object",
			properties: {
				sessionId: {
					type: "string",
					description: "Session ID"
				},
				label: {
					type: "string",
					description: "Short title for annotation"
				},
				comment: {
					type: "string",
					description: "Detailed investigative note or root-cause finding"
				},
				nodeId: {
					type: "number",
					description: "Optional associated LogicalNodeId"
				},
				category: {
					type: "string",
					enum: [
						"NOTE",
						"ROOT_CAUSE",
						"HYPOTHESIS",
						"WARNING",
						"VERIFIED"
					]
				}
			},
			required: [
				"sessionId",
				"label",
				"comment"
			]
		}
	},
	{
		name: "get_annotations",
		description: "Retrieve all human and AI annotations created for a session.",
		inputSchema: {
			type: "object",
			properties: { sessionId: {
				type: "string",
				description: "Session ID"
			} },
			required: ["sessionId"]
		}
	},
	{
		name: "get_recording_health",
		description: "Run an automated integrity audit on a recording session to check sequence monotonicity, missing nodes, and capability health.",
		inputSchema: {
			type: "object",
			properties: { sessionId: {
				type: "string",
				description: "Session ID"
			} },
			required: ["sessionId"]
		}
	}
];
//#endregion
//#region src/mcp/resources-handler.ts
var MCPResourcesHandler = class {
	storage;
	constructor(storage) {
		this.storage = storage;
	}
	async listResources() {
		const sessions = await this.storage.listSessions();
		const resources = [];
		for (const session of sessions) {
			resources.push({
				uri: `forensic://sessions/${session.id}`,
				name: `Session: ${session.name}`,
				mimeType: "application/json",
				description: `Browser forensic recording session from ${session.url} (${session.stats.eventCount} events)`
			});
			resources.push({
				uri: `forensic://sessions/${session.id}/timeline`,
				name: `Timeline: ${session.name}`,
				mimeType: "text/markdown",
				description: `Markdown summary of the event timeline for session ${session.id}`
			});
		}
		return resources;
	}
	async readResource(uri) {
		const sessionMatch = uri.match(/^forensic:\/\/sessions\/([^/]+)$/);
		if (sessionMatch) {
			const sessionId = sessionMatch[1];
			const session = await this.storage.getSession(sessionId);
			if (!session) throw new Error(`Resource not found: ${uri}`);
			return {
				uri,
				mimeType: "application/json",
				text: JSON.stringify(session, null, 2)
			};
		}
		const timelineMatch = uri.match(/^forensic:\/\/sessions\/([^/]+)\/timeline$/);
		if (timelineMatch) {
			const sessionId = timelineMatch[1];
			const session = await this.storage.getSession(sessionId);
			const events = await this.storage.getEvents(sessionId);
			if (!session) throw new Error(`Resource not found: ${uri}`);
			const lines = [
				`# Timeline for Session: ${session.name} (${session.id})`,
				`- **URL**: ${session.url}`,
				`- **Total Events**: ${events.length}`,
				`- **Duration**: ${session.durationMs?.toFixed(1) || "0"}ms`,
				"",
				"## Significant Events"
			];
			for (const evt of events.slice(0, 50)) lines.push(`- **[${evt.timestamp.toFixed(1)}ms]** \`${evt.type}\` (${evt.category}) ${evt.targetSelector ? `on \`${evt.targetSelector}\`` : ""}`);
			return {
				uri,
				mimeType: "text/markdown",
				text: lines.join("\n")
			};
		}
		throw new Error(`Unsupported resource URI: ${uri}`);
	}
};
//#endregion
//#region src/mcp/server.ts
var ForensicMCPServer = class {
	storage;
	toolsHandler;
	resourcesHandler;
	protocolVersion = "2024-11-05";
	serverInfo = {
		name: "browser-forensic-mcp",
		version: "2.0.0"
	};
	constructor(storage) {
		this.storage = storage || new FileStorageProvider("./.forensic_sessions");
		this.toolsHandler = new MCPToolsHandler(this.storage);
		this.resourcesHandler = new MCPResourcesHandler(this.storage);
	}
	async handleRequest(request) {
		const { method, params, id } = request;
		if (method === "initialize") return {
			jsonrpc: "2.0",
			id,
			result: {
				protocolVersion: this.protocolVersion,
				capabilities: {
					tools: {},
					resources: {},
					prompts: {}
				},
				serverInfo: this.serverInfo
			}
		};
		if (method === "notifications/initialized" || method === "initialized") return null;
		if (method === "ping") return {
			jsonrpc: "2.0",
			id,
			result: {}
		};
		if (method === "tools/list") return {
			jsonrpc: "2.0",
			id,
			result: { tools: FORENSIC_MCP_TOOLS }
		};
		if (method === "tools/call") {
			const toolName = params?.name;
			const toolArgs = params?.arguments || {};
			return {
				jsonrpc: "2.0",
				id,
				result: await this.toolsHandler.handleToolCall(toolName, toolArgs)
			};
		}
		if (method === "resources/list") return {
			jsonrpc: "2.0",
			id,
			result: { resources: await this.resourcesHandler.listResources() }
		};
		if (method === "resources/read") {
			const uri = params?.uri || "";
			try {
				return {
					jsonrpc: "2.0",
					id,
					result: { contents: [await this.resourcesHandler.readResource(uri)] }
				};
			} catch (err) {
				return {
					jsonrpc: "2.0",
					id,
					error: {
						code: -32602,
						message: err.message
					}
				};
			}
		}
		if (method === "prompts/list") return {
			jsonrpc: "2.0",
			id,
			result: { prompts: [{
				name: "diagnose_disappearing_element",
				description: "Run an autonomous root-cause investigation on why an injected web element disappeared.",
				arguments: [{
					name: "sessionId",
					description: "ID of the session",
					required: true
				}, {
					name: "targetSelector",
					description: "CSS selector of the disappearing element",
					required: true
				}]
			}, {
				name: "compare_dom_states",
				description: "Perform a structural diff and timeline causality analysis between two timestamps.",
				arguments: [
					{
						name: "sessionId",
						description: "ID of the session",
						required: true
					},
					{
						name: "t1",
						description: "Timestamp before the change (ms)",
						required: true
					},
					{
						name: "t2",
						description: "Timestamp after the change (ms)",
						required: true
					}
				]
			}] }
		};
		return {
			jsonrpc: "2.0",
			id,
			error: {
				code: -32601,
				message: `Method '${method}' not found`
			}
		};
	}
	startStdio() {
		process.stderr.write("[MCP] Browser Forensic MCP Server started on stdio\n");
		readline.createInterface({
			input: process.stdin,
			terminal: false
		}).on("line", async (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				const req = JSON.parse(trimmed);
				const res = await this.handleRequest(req);
				if (res) process.stdout.write(JSON.stringify(res) + "\n");
			} catch (err) {
				const errorResponse = {
					jsonrpc: "2.0",
					id: null,
					error: {
						code: -32700,
						message: `Parse error: ${err.message}`
					}
				};
				process.stdout.write(JSON.stringify(errorResponse) + "\n");
			}
		});
	}
};
//#endregion
export { FORENSIC_MCP_TOOLS, FileStorageProvider, ForensicMCPServer };
