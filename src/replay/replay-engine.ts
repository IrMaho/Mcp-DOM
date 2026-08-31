import { DOMSnapshot, LogicalNodeId, VirtualDOMNode, VirtualDOMNodeType } from '../types/dom-node';
import { BaseEvent } from '../types/events';
import { StateReconstructor } from '../reconstruction/state-reconstructor';
import { TimeController } from './time-controller';

export interface ReplayEngineOptions {
  container?: HTMLElement;
  onNodeSelected?: (nodeId: LogicalNodeId, selector: string) => void;
  onNodeHovered?: (nodeId: LogicalNodeId | null) => void;
}

export class ReplayEngine {
  private reconstructor: StateReconstructor;
  private timeController: TimeController;
  private container: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private selectedNodeId: LogicalNodeId | null = null;
  private onNodeSelected?: (nodeId: LogicalNodeId, selector: string) => void;
  private onNodeHovered?: (nodeId: LogicalNodeId | null) => void;
  private currentSnapshot: DOMSnapshot | null = null;

  constructor(
    reconstructor: StateReconstructor,
    timeController: TimeController,
    options: ReplayEngineOptions = {}
  ) {
    this.reconstructor = reconstructor;
    this.timeController = timeController;
    this.container = options.container || null;
    this.onNodeSelected = options.onNodeSelected;
    this.onNodeHovered = options.onNodeHovered;

    this.timeController.onTimeChange((ts) => this.renderAtTimestamp(ts));
  }

  public setContainer(container: HTMLElement): void {
    this.container = container;
    this.setupIframe();
  }

  private setupIframe(): void {
    if (!this.container || typeof document === 'undefined') return;

    this.container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.backgroundColor = '#ffffff';
    // Sandbox without script execution for 100% security
    iframe.setAttribute('sandbox', 'allow-same-origin');
    this.container.appendChild(iframe);
    this.iframe = iframe;

    if (this.currentSnapshot) {
      this.renderSnapshot(this.currentSnapshot);
    }
  }

  public renderAtTimestamp(timestamp: number): DOMSnapshot {
    const snapshot = this.reconstructor.getStateAt({ timestamp });
    this.currentSnapshot = snapshot;
    this.renderSnapshot(snapshot);
    return snapshot;
  }

  public renderSnapshot(snapshot: DOMSnapshot): void {
    if (!this.iframe || !this.iframe.contentDocument) return;

    const doc = this.iframe.contentDocument;
    doc.open();

    // Generate sanitized HTML from virtual tree
    const htmlContent = this.generateSandboxedHtml(snapshot);
    doc.write(htmlContent);
    doc.close();

    // Attach inspect listeners to iframe elements
    this.attachIframeInspector(doc, snapshot);
  }

  public selectNode(nodeId: LogicalNodeId | null): void {
    this.selectedNodeId = nodeId;
    if (this.iframe && this.iframe.contentDocument) {
      this.highlightSelectedNode(this.iframe.contentDocument);
    }
  }

  private generateSandboxedHtml(snapshot: DOMSnapshot): string {
    const rootId = snapshot.rootId;
    const rootNode = snapshot.nodes[rootId];
    if (!rootNode) return '<html><body><div id="empty-state">No DOM state available</div></body></html>';

    const renderNodeHtml = (nodeId: LogicalNodeId): string => {
      const node = snapshot.nodes[nodeId];
      if (!node || node.isDetached) return '';

      if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) {
        return this.escapeHtml(node.textContent || '');
      }

      if (node.nodeType === VirtualDOMNodeType.COMMENT_NODE) {
        return `<!-- ${this.escapeHtml(node.textContent || '')} -->`;
      }

      if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
        const tag = node.tagName || 'div';
        const attrs: Record<string, string> = { ...(node.attributes || {}) };

        // Strip inline event handlers like onclick, onload to prevent arbitrary script execution
        for (const attrKey of Object.keys(attrs)) {
          if (attrKey.toLowerCase().startsWith('on')) {
            delete attrs[attrKey];
          }
        }

        // Attach data-forensic-id for live interactive selection
        attrs['data-forensic-id'] = String(node.id);

        const attrStr = Object.entries(attrs)
          .map(([k, v]) => `${k}="${this.escapeAttr(v)}"`)
          .join(' ');

        const isSelfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag);
        if (isSelfClosing) {
          return `<${tag} ${attrStr} />`;
        }

        const innerHtml = (node.children || []).map(renderNodeHtml).join('');
        return `<${tag} ${attrStr}>${innerHtml}</${tag}>`;
      }

      if (node.nodeType === VirtualDOMNodeType.DOCUMENT_NODE) {
        return (node.children || []).map(renderNodeHtml).join('');
      }

      return '';
    };

    const treeHtml = renderNodeHtml(rootId);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${this.escapeHtml(snapshot.title || 'Forensic Replay')}</title>
          <style>
            /* Reset & Inspector Highlighting Styles */
            [data-forensic-selected="true"] {
              outline: 2px solid #3b82f6 !important;
              outline-offset: 2px !important;
              background-color: rgba(59, 130, 246, 0.15) !important;
            }
            [data-forensic-hover="true"] {
              outline: 1px dashed #60a5fa !important;
            }
            * { cursor: crosshair !important; }
          </style>
        </head>
        <body>
          ${treeHtml}
        </body>
      </html>
    `;
  }

  private attachIframeInspector(doc: Document, snapshot: DOMSnapshot): void {
    doc.addEventListener('mouseover', (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('[data-forensic-id]') as HTMLElement | null;
      if (target) {
        const id = Number(target.getAttribute('data-forensic-id'));
        if (this.onNodeHovered) this.onNodeHovered(id);
      }
    });

    doc.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = (e.target as HTMLElement)?.closest?.('[data-forensic-id]') as HTMLElement | null;
      if (target) {
        const id = Number(target.getAttribute('data-forensic-id'));
        this.selectNode(id);
        const node = snapshot.nodes[id];
        if (node && this.onNodeSelected) {
          this.onNodeSelected(id, target.tagName.toLowerCase());
        }
      }
    });

    this.highlightSelectedNode(doc);
  }

  private highlightSelectedNode(doc: Document): void {
    const previouslySelected = doc.querySelectorAll('[data-forensic-selected="true"]');
    previouslySelected.forEach((el) => el.removeAttribute('data-forensic-selected'));

    if (this.selectedNodeId) {
      const targetEl = doc.querySelector(`[data-forensic-id="${this.selectedNodeId}"]`);
      if (targetEl) {
        targetEl.setAttribute('data-forensic-selected', 'true');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeAttr(str: string): string {
    return str.replace(/"/g, '&quot;');
  }
}
