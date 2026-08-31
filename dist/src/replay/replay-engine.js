import { VirtualDOMNodeType } from '../types/dom-node';
export class ReplayEngine {
    reconstructor;
    timeController;
    container = null;
    iframe = null;
    selectedNodeId = null;
    onNodeSelected;
    onNodeHovered;
    currentSnapshot = null;
    constructor(reconstructor, timeController, options = {}) {
        this.reconstructor = reconstructor;
        this.timeController = timeController;
        this.container = options.container || null;
        this.onNodeSelected = options.onNodeSelected;
        this.onNodeHovered = options.onNodeHovered;
        this.timeController.onTimeChange((ts) => this.renderAtTimestamp(ts));
    }
    setContainer(container) {
        this.container = container;
        this.setupIframe();
    }
    setupIframe() {
        if (!this.container || typeof document === 'undefined')
            return;
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
    renderAtTimestamp(timestamp) {
        const snapshot = this.reconstructor.getStateAt({ timestamp });
        this.currentSnapshot = snapshot;
        this.renderSnapshot(snapshot);
        return snapshot;
    }
    renderSnapshot(snapshot) {
        if (!this.iframe || !this.iframe.contentDocument)
            return;
        const doc = this.iframe.contentDocument;
        doc.open();
        // Generate sanitized HTML from virtual tree
        const htmlContent = this.generateSandboxedHtml(snapshot);
        doc.write(htmlContent);
        doc.close();
        // Attach inspect listeners to iframe elements
        this.attachIframeInspector(doc, snapshot);
    }
    selectNode(nodeId) {
        this.selectedNodeId = nodeId;
        if (this.iframe && this.iframe.contentDocument) {
            this.highlightSelectedNode(this.iframe.contentDocument);
        }
    }
    generateSandboxedHtml(snapshot) {
        const rootId = snapshot.rootId;
        const rootNode = snapshot.nodes[rootId];
        if (!rootNode)
            return '<html><body><div id="empty-state">No DOM state available</div></body></html>';
        const renderNodeHtml = (nodeId) => {
            const node = snapshot.nodes[nodeId];
            if (!node || node.isDetached)
                return '';
            if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) {
                return this.escapeHtml(node.textContent || '');
            }
            if (node.nodeType === VirtualDOMNodeType.COMMENT_NODE) {
                return `<!-- ${this.escapeHtml(node.textContent || '')} -->`;
            }
            if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
                const tag = node.tagName || 'div';
                const attrs = { ...(node.attributes || {}) };
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
    attachIframeInspector(doc, snapshot) {
        doc.addEventListener('mouseover', (e) => {
            const target = e.target?.closest?.('[data-forensic-id]');
            if (target) {
                const id = Number(target.getAttribute('data-forensic-id'));
                if (this.onNodeHovered)
                    this.onNodeHovered(id);
            }
        });
        doc.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target?.closest?.('[data-forensic-id]');
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
    highlightSelectedNode(doc) {
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
    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    escapeAttr(str) {
        return str.replace(/"/g, '&quot;');
    }
}
//# sourceMappingURL=replay-engine.js.map