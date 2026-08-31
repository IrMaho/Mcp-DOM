import { MCPResourceDefinition } from '../types/mcp-types';
import { ForensicStorageProvider } from '../storage/storage-interface';

export class MCPResourcesHandler {
  private storage: ForensicStorageProvider;

  constructor(storage: ForensicStorageProvider) {
    this.storage = storage;
  }

  public async listResources(): Promise<MCPResourceDefinition[]> {
    const sessions = await this.storage.listSessions();
    const resources: MCPResourceDefinition[] = [];

    for (const session of sessions) {
      resources.push({
        uri: `forensic://sessions/${session.id}`,
        name: `Session: ${session.name}`,
        mimeType: 'application/json',
        description: `Browser forensic recording session from ${session.url} (${session.stats.eventCount} events)`,
      });

      resources.push({
        uri: `forensic://sessions/${session.id}/timeline`,
        name: `Timeline: ${session.name}`,
        mimeType: 'text/markdown',
        description: `Markdown summary of the event timeline for session ${session.id}`,
      });
    }

    return resources;
  }

  public async readResource(uri: string): Promise<{ uri: string; mimeType: string; text: string }> {
    const sessionMatch = uri.match(/^forensic:\/\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      const session = await this.storage.getSession(sessionId);
      if (!session) throw new Error(`Resource not found: ${uri}`);
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(session, null, 2),
      };
    }

    const timelineMatch = uri.match(/^forensic:\/\/sessions\/([^/]+)\/timeline$/);
    if (timelineMatch) {
      const sessionId = timelineMatch[1];
      const session = await this.storage.getSession(sessionId);
      const events = await this.storage.getEvents(sessionId);
      if (!session) throw new Error(`Resource not found: ${uri}`);

      const lines: string[] = [
        `# Timeline for Session: ${session.name} (${session.id})`,
        `- **URL**: ${session.url}`,
        `- **Total Events**: ${events.length}`,
        `- **Duration**: ${session.durationMs?.toFixed(1) || '0'}ms`,
        '',
        '## Significant Events',
      ];

      for (const evt of events.slice(0, 50)) {
        lines.push(`- **[${evt.timestamp.toFixed(1)}ms]** \`${evt.type}\` (${evt.category}) ${evt.targetSelector ? `on \`${evt.targetSelector}\`` : ''}`);
      }

      return {
        uri,
        mimeType: 'text/markdown',
        text: lines.join('\n'),
      };
    }

    throw new Error(`Unsupported resource URI: ${uri}`);
  }
}
