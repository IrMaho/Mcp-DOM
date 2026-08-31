import { IndexedDBStorageProvider } from '../storage/indexeddb-storage';
import { MemoryStorageProvider } from '../storage/memory-storage';
import { ForensicStorageProvider } from '../storage/storage-interface';
import { StateReconstructor } from '../reconstruction/state-reconstructor';
import { ReplayEngine } from '../replay/replay-engine';
import { TimeController } from '../replay/time-controller';
import { DOMDiffEngine } from '../diff/dom-diff-engine';
import { LifecycleTracer } from '../lifecycle/lifecycle-tracer';
import { DisappearingElementAnalyzer } from '../lifecycle/disappearing-analyzer';
import { SessionSerializer } from '../storage/session-serializer';
import { SessionIndex } from '../storage/session-index';
import { ForensicRecorder } from '../core/recorder';
import { VirtualQueryEngine } from '../reconstruction/virtual-query';
import { BaseEvent } from '../types/events';
import { DOMSnapshot, LogicalNodeId, VirtualDOMNode, VirtualDOMNodeType } from '../types/dom-node';
import { SessionMetadata } from '../types/session';

class ForensicDashboardApp {
  private storage: ForensicStorageProvider;
  private currentSession: SessionMetadata | null = null;
  private currentSnapshot: DOMSnapshot | null = null;
  private events: BaseEvent[] = [];
  private reconstructor: StateReconstructor | null = null;
  private timeController: TimeController | null = null;
  private replayEngine: ReplayEngine | null = null;
  private sessionIndex: SessionIndex | null = null;
  private liveRecorder: ForensicRecorder | null = null;
  private selectedNodeId: LogicalNodeId | null = null;

  constructor() {
    this.storage =
      typeof indexedDB !== 'undefined'
        ? new IndexedDBStorageProvider('ForensicExtensionDB')
        : new MemoryStorageProvider();
  }

  public async init(): Promise<void> {
    this.initTabs();
    this.initControls();
    this.initSearch();
    await this.loadSessionsList();
  }

  private initTabs(): void {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach((pane) => pane.classList.remove('active'));
        const activePane = document.getElementById(`pane-${targetTab}`);
        if (activePane) activePane.classList.add('active');
      });
    });
  }

  private initControls(): void {
    const sessionSelect = document.getElementById('session-select') as HTMLSelectElement;
    sessionSelect.addEventListener('change', () => {
      if (sessionSelect.value) {
        this.loadSession(sessionSelect.value);
      }
    });

    // Start / Stop Live Recording
    const btnStart = document.getElementById('btn-start-record') as HTMLButtonElement;
    const btnStop = document.getElementById('btn-stop-record') as HTMLButtonElement;
    const btnCheckpoint = document.getElementById('btn-checkpoint') as HTMLButtonElement;

    btnStart.addEventListener('click', () => this.startLiveRecording());
    btnStop.addEventListener('click', () => this.stopLiveRecording());
    btnCheckpoint.addEventListener('click', () => {
      if (this.liveRecorder) {
        this.liveRecorder.captureCheckpoint('MANUAL', document);
      }
    });

    // Export / Import
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportSession());
    const importInput = document.getElementById('file-import-input') as HTMLInputElement;
    document.getElementById('btn-import')?.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => this.importSession(e));

    // Diff Runner
    document.getElementById('btn-run-diff')?.addEventListener('click', () => this.runDiff());
    document.getElementById('btn-diff-prev-mutation')?.addEventListener('click', () => this.diffAroundCurrentTime());

    // Forensics Runner
    document.getElementById('btn-run-forensics')?.addEventListener('click', () => this.runForensics());

    // Annotations
    document.getElementById('btn-add-annotation')?.addEventListener('click', () => this.addAnnotation());

    // Playback Controls
    document.getElementById('btn-play-pause')?.addEventListener('click', () => {
      if (!this.timeController) return;
      const btn = document.getElementById('btn-play-pause')!;
      if (this.timeController.getIsPlaying()) {
        this.timeController.pause();
        btn.textContent = '▶';
      } else {
        this.timeController.play();
        btn.textContent = '⏸';
      }
    });

    document.getElementById('btn-step-prev')?.addEventListener('click', () => this.timeController?.stepBackward());
    document.getElementById('btn-step-next')?.addEventListener('click', () => this.timeController?.stepForward());
    document.getElementById('btn-jump-prev-err')?.addEventListener('click', () => this.timeController?.jumpToPrevious('ERROR'));
    document.getElementById('btn-jump-next-err')?.addEventListener('click', () => this.timeController?.jumpToNext('ERROR'));

    const speedSelect = document.getElementById('speed-select') as HTMLSelectElement;
    speedSelect?.addEventListener('change', () => {
      this.timeController?.setSpeed(parseFloat(speedSelect.value));
    });
  }

  private initSearch(): void {
    const modal = document.getElementById('search-modal')!;
    const btnSearch = document.getElementById('btn-search')!;
    const btnClose = document.getElementById('btn-close-search')!;
    const queryInput = document.getElementById('search-query-input') as HTMLInputElement;

    btnSearch.addEventListener('click', () => {
      modal.classList.add('open');
      queryInput.focus();
    });

    btnClose.addEventListener('click', () => modal.classList.remove('open'));
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        modal.classList.add('open');
        queryInput.focus();
      } else if (e.key === 'Escape') {
        modal.classList.remove('open');
      }
    });

    queryInput.addEventListener('input', () => {
      this.renderSearchResults(queryInput.value);
    });
  }

  public async loadSessionsList(): Promise<void> {
    const sessions = await this.storage.listSessions();
    const select = document.getElementById('session-select') as HTMLSelectElement;
    select.innerHTML = '';

    if (sessions.length === 0) {
      select.innerHTML = '<option value="">(No sessions in storage)</option>';
      return;
    }

    for (const session of sessions) {
      const opt = document.createElement('option');
      opt.value = session.id;
      opt.textContent = `${session.name} (${new Date(session.startTime).toLocaleTimeString()})`;
      select.appendChild(opt);
    }

    if (sessions.length > 0) {
      this.loadSession(sessions[0].id);
    }
  }

  public async loadSession(sessionId: string): Promise<void> {
    const session = await this.storage.getSession(sessionId);
    if (!session) return;

    this.currentSession = session;
    this.events = await this.storage.getEvents(sessionId);
    const checkpoints = await this.storage.getCheckpoints(sessionId);
    const initialSnapshot = await this.storage.getInitialSnapshot(sessionId);

    this.reconstructor = new StateReconstructor(checkpoints, this.events);
    this.sessionIndex = new SessionIndex(this.events);

    const duration = session.durationMs || (this.events.length > 0 ? this.events[this.events.length - 1].timestamp : 0);
    this.timeController = new TimeController(this.events, duration);

    const iframeHost = document.getElementById('replay-iframe-host')!;
    this.replayEngine = new ReplayEngine(this.reconstructor, this.timeController, {
      container: iframeHost,
      onNodeSelected: (nodeId, tag) => {
        this.selectedNodeId = nodeId;
        this.renderNodeDetails(nodeId);
      },
    });

    // Sync Time Controller
    this.timeController.onTimeChange((ts) => {
      this.updateTimelineUI(ts);
      const snapshot = this.reconstructor!.getStateAt({ timestamp: ts });
      this.currentSnapshot = snapshot;
      this.renderDOMTree(snapshot);
      if (this.selectedNodeId) {
        this.renderNodeDetails(this.selectedNodeId);
      }
    });

    // Initial render at T=0
    this.renderTimelineTracks();
    this.timeController.seek(0);
    this.renderDiagnosticsTab();
    this.renderNetworkTab();
    this.renderAnnotationsTab();

    document.getElementById('time-duration')!.textContent = `${duration.toFixed(1)}ms`;
  }

  private updateTimelineUI(timestamp: number): void {
    document.getElementById('time-current')!.textContent = `${timestamp.toFixed(1)}ms`;
    document.getElementById('overlay-time')!.textContent = `${timestamp.toFixed(1)}ms`;
    if (this.currentSnapshot?.url) {
      document.getElementById('overlay-url')!.textContent = this.currentSnapshot.url;
    }

    const duration = this.timeController?.getDuration() || 1;
    const playhead = document.getElementById('timeline-playhead')!;
    const tracksContainer = document.getElementById('timeline-tracks-container')!;
    const laneWidth = tracksContainer.clientWidth - 90;

    const percent = Math.min(1, Math.max(0, timestamp / duration));
    const leftPx = 90 + percent * laneWidth;
    playhead.style.left = `${leftPx}px`;
  }

  private renderTimelineTracks(): void {
    const duration = this.timeController?.getDuration() || 1;
    const domLane = document.getElementById('lane-dom')!;
    const userLane = document.getElementById('lane-user')!;
    const errorLane = document.getElementById('lane-error')!;
    const netLane = document.getElementById('lane-network')!;

    domLane.innerHTML = '';
    userLane.innerHTML = '';
    errorLane.innerHTML = '';
    netLane.innerHTML = '';

    for (const evt of this.events) {
      const percent = (evt.timestamp / duration) * 100;
      const dot = document.createElement('div');
      dot.className = `event-marker ${evt.category.toLowerCase()}`;
      dot.style.left = `${percent}%`;
      dot.title = `[${evt.timestamp.toFixed(1)}ms] ${evt.type}`;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.timeController?.seek(evt.timestamp);
      });

      if (evt.category === 'DOM') domLane.appendChild(dot);
      else if (evt.category === 'USER') userLane.appendChild(dot);
      else if (evt.category === 'ERROR' || evt.category === 'CONSOLE') errorLane.appendChild(dot);
      else if (evt.category === 'NETWORK') netLane.appendChild(dot);
    }

    // Click on timeline container to seek
    const container = document.getElementById('timeline-tracks-container')!;
    container.onclick = (e) => {
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left - 90;
      const laneWidth = rect.width - 90;
      if (clickX >= 0 && laneWidth > 0) {
        const ratio = clickX / laneWidth;
        const targetTs = ratio * duration;
        this.timeController?.seek(targetTs);
      }
    };
  }

  private renderDOMTree(snapshot: DOMSnapshot): void {
    const treeView = document.getElementById('dom-tree-view')!;
    treeView.innerHTML = '';

    const renderNode = (nodeId: LogicalNodeId, depth: number): HTMLElement | null => {
      const node = snapshot.nodes[nodeId];
      if (!node || node.isDetached) return null;

      const row = document.createElement('div');
      row.className = `tree-node-row ${node.id === this.selectedNodeId ? 'selected' : ''}`;
      row.style.paddingLeft = `${depth * 14 + 6}px`;

      if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
        let attrsStr = '';
        if (node.attributes) {
          const attrs = Object.entries(node.attributes).slice(0, 2);
          attrsStr = attrs.map(([k, v]) => ` <span class="attr-name">${k}</span>="<span class="attr-val">${v}</span>"`).join('');
        }
        row.innerHTML = `
          <span class="tag">&lt;${node.tagName || 'element'}${attrsStr}&gt;</span>
          <span class="node-id-badge">ID:${node.id}</span>
        `;
      } else if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) {
        const preview = (node.textContent || '').substring(0, 30);
        row.innerHTML = `<span class="text-preview">"${preview}"</span>`;
      } else {
        row.innerHTML = `<span class="text-preview">&lt;${node.tagName || 'node'}&gt;</span>`;
      }

      row.addEventListener('click', () => {
        this.selectedNodeId = node.id;
        this.replayEngine?.selectNode(node.id);
        this.renderNodeDetails(node.id);
        document.querySelectorAll('.tree-node-row').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
      });

      const wrapper = document.createElement('div');
      wrapper.appendChild(row);

      if (node.children && node.children.length > 0) {
        for (const childId of node.children) {
          const childEl = renderNode(childId, depth + 1);
          if (childEl) wrapper.appendChild(childEl);
        }
      }

      return wrapper;
    };

    const treeEl = renderNode(snapshot.rootId, 0);
    if (treeEl) treeView.appendChild(treeEl);
  }

  private renderNodeDetails(nodeId: LogicalNodeId): void {
    const pane = document.getElementById('node-details-pane')!;
    if (!this.currentSnapshot || !this.currentSnapshot.nodes[nodeId]) {
      pane.innerHTML = '<div style="color: var(--text-muted);">Selected node not present in current DOM state.</div>';
      return;
    }

    const node = this.currentSnapshot.nodes[nodeId];
    const selector = VirtualQueryEngine.computeSelector(node, this.currentSnapshot.nodes);

    pane.innerHTML = `
      <div class="details-card">
        <h4>Element Properties <span style="color: var(--accent-primary);">[ID: ${node.id}]</span></h4>
        <table class="kv-table">
          <tr><td class="key">Tag</td><td class="val">&lt;${node.tagName || 'node'}&gt;</td></tr>
          <tr><td class="key">Selector</td><td class="val"><code>${selector}</code></td></tr>
          <tr><td class="key">Parent ID</td><td class="val">${node.parentId ?? 'None'}</td></tr>
          <tr><td class="key">Children</td><td class="val">${node.children?.length || 0} nodes</td></tr>
          <tr><td class="key">Visibility</td><td class="val">${node.isHidden ? '<span style="color:#f87171;">Hidden (display:none or invisible)</span>' : '<span style="color:#34d399;">Visible</span>'}</td></tr>
        </table>
      </div>

      <div class="details-card">
        <h4>Attributes</h4>
        <table class="kv-table">
          ${
            node.attributes && Object.keys(node.attributes).length > 0
              ? Object.entries(node.attributes)
                  .map(([k, v]) => `<tr><td class="key">${k}</td><td class="val">${v}</td></tr>`)
                  .join('')
              : '<tr><td colspan="2" style="color:var(--text-muted);">No attributes</td></tr>'
          }
        </table>
      </div>

      <div class="quick-actions-bar">
        <button id="btn-quick-trace" class="btn btn-primary">📜 Trace Lifecycle</button>
        <button id="btn-quick-forensics" class="btn btn-ghost">🔬 Diagnose Disappearance</button>
      </div>
    `;

    document.getElementById('btn-quick-trace')?.addEventListener('click', () => {
      // Switch to Forensics tab and run trace
      const tabForensics = document.querySelector('[data-tab="forensics"]') as HTMLButtonElement;
      tabForensics?.click();
      (document.getElementById('forensic-target-input') as HTMLInputElement).value = String(nodeId);
      this.runForensics();
    });

    document.getElementById('btn-quick-forensics')?.addEventListener('click', () => {
      const tabForensics = document.querySelector('[data-tab="forensics"]') as HTMLButtonElement;
      tabForensics?.click();
      (document.getElementById('forensic-target-input') as HTMLInputElement).value = selector;
      this.runForensics();
    });
  }

  private runDiff(): void {
    if (!this.reconstructor) return;

    const t1 = parseFloat((document.getElementById('diff-t1-input') as HTMLInputElement).value) || 0;
    const t2 = parseFloat((document.getElementById('diff-t2-input') as HTMLInputElement).value) || 100;

    const s1 = this.reconstructor.getStateAt({ timestamp: t1 });
    const s2 = this.reconstructor.getStateAt({ timestamp: t2 });

    const diff = DOMDiffEngine.diff(s1, s2);
    this.renderDiffResult(diff);
  }

  private diffAroundCurrentTime(): void {
    if (!this.reconstructor || !this.timeController) return;
    const curr = this.timeController.getCurrentTime();
    const t1 = Math.max(0, curr - 50);
    const t2 = curr + 50;

    (document.getElementById('diff-t1-input') as HTMLInputElement).value = t1.toFixed(0);
    (document.getElementById('diff-t2-input') as HTMLInputElement).value = t2.toFixed(0);

    const s1 = this.reconstructor.getStateAt({ timestamp: t1 });
    const s2 = this.reconstructor.getStateAt({ timestamp: t2 });
    const diff = DOMDiffEngine.diff(s1, s2);
    this.renderDiffResult(diff);
  }

  private renderDiffResult(diff: any): void {
    const metricsCard = document.getElementById('diff-summary-metrics')!;
    metricsCard.innerHTML = `
      <div class="metric-pill"><span class="label">Added</span><span class="count" style="color:#10b981;">+${diff.summary.addedNodesCount}</span></div>
      <div class="metric-pill"><span class="label">Removed</span><span class="count" style="color:#ef4444;">-${diff.summary.removedNodesCount}</span></div>
      <div class="metric-pill"><span class="label">Moved</span><span class="count" style="color:#a855f7;">${diff.summary.movedNodesCount}</span></div>
      <div class="metric-pill"><span class="label">Attr/Class</span><span class="count" style="color:#f59e0b;">${diff.summary.attributeChangesCount + diff.summary.classChangesCount}</span></div>
      <div class="metric-pill"><span class="label">Total Delta</span><span class="count">${diff.summary.totalChanges}</span></div>
    `;

    document.getElementById('badge-diff-count')!.textContent = String(diff.summary.totalChanges);

    const list = document.getElementById('diff-results-list')!;
    list.innerHTML = '';

    for (const added of diff.addedNodes) {
      list.innerHTML += `
        <div class="diff-entry added">
          <div class="diff-header"><span class="selector">➕ ${added.selector} [ID:${added.id}]</span></div>
          <div class="diff-body">${added.htmlSnippet}</div>
        </div>
      `;
    }

    for (const rem of diff.removedNodes) {
      list.innerHTML += `
        <div class="diff-entry removed">
          <div class="diff-header"><span class="selector">➖ ${rem.selector} [ID:${rem.id}]</span></div>
          <div class="diff-body">Parent ID: ${rem.lastKnownParentId ?? 'none'}</div>
        </div>
      `;
    }

    for (const cl of diff.changedClasses) {
      list.innerHTML += `
        <div class="diff-entry changed">
          <div class="diff-header"><span class="selector">🏷️ ${cl.selector} [ID:${cl.nodeId}]</span></div>
          <div class="diff-body">Class: <span class="diff-val-old">${cl.oldClassString}</span> → <span class="diff-val-new">${cl.newClassString}</span></div>
        </div>
      `;
    }

    for (const st of diff.changedStyles) {
      list.innerHTML += `
        <div class="diff-entry changed">
          <div class="diff-header"><span class="selector">🎨 ${st.selector} [ID:${st.nodeId}]</span></div>
          <div class="diff-body">Style '${st.propertyName}': <span class="diff-val-old">${st.oldValue || 'none'}</span> → <span class="diff-val-new">${st.newValue || 'none'}</span></div>
        </div>
      `;
    }

    if (diff.summary.totalChanges === 0) {
      list.innerHTML = '<div style="color:var(--text-muted); padding:12px;">No DOM mutations occurred between selected timestamps.</div>';
    }
  }

  private runForensics(): void {
    const input = (document.getElementById('forensic-target-input') as HTMLInputElement).value.trim();
    if (!input) return;

    const initialSnapshot = this.currentSnapshot || undefined;
    const report = DisappearingElementAnalyzer.analyze(input, this.events, initialSnapshot);
    this.renderForensicsReport(report);
  }

  private renderForensicsReport(report: any): void {
    const output = document.getElementById('forensic-report-output')!;
    if (!report.found) {
      output.innerHTML = `<div style="color:#f87171; padding:12px;">${report.detailedExplanation}</div>`;
      return;
    }

    output.innerHTML = `
      <div class="diagnosis-hero">
        <div class="diagnosis-title">
          <h3 style="font-size: 15px; font-weight: 700; color: #fff;">Forensic Diagnosis</h3>
          <div class="confidence-meter">
            <span>Confidence:</span>
            <span>${report.confidenceScore}%</span>
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text-primary); font-weight: 500;">
          ${report.likelyRootCause}
        </p>
        <div style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono);">
          Target: ${report.tagName} [ID: ${report.targetNodeId}] | Lifespan: ${report.lifespanMs?.toFixed(1)}ms | Mechanism: ${report.disappearanceMechanism}
        </div>
      </div>

      <div class="details-card">
        <h4>Evidentiary Trail</h4>
        <div class="evidentiary-trail">
          ${report.evidentiaryTrail
            .map(
              (e: any) => `
            <div class="evidence-step">
              <span class="evidence-badge ${e.evidenceType.toLowerCase()}">${e.evidenceType}</span>
              <div style="flex:1;">
                <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">[${e.timestamp.toFixed(1)}ms] ${e.eventType}</div>
                <div style="font-size: 12px; color: var(--text-primary); margin-top:2px;">${e.description}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="details-card">
        <h4>Alternative Hypotheses Evaluated</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${report.alternativeHypotheses
            .map(
              (h: any) => `
            <div style="background:var(--bg-app); padding:10px; border-radius:6px; border:1px solid var(--border-default);">
              <div style="font-weight:600; font-size:12px; color:var(--text-secondary);">${h.hypothesis} (${h.likelihood}% likelihood)</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Counter-evidence: ${h.evidenceAgainst.join('; ') || 'None'}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderDiagnosticsTab(): void {
    const list = document.getElementById('diagnostics-list')!;
    const diagnostics = this.events.filter((e) => e.category === 'CONSOLE' || e.category === 'ERROR');
    document.getElementById('badge-error-count')!.textContent = String(diagnostics.length);

    if (diagnostics.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);">No console or error events recorded.</div>';
      return;
    }

    list.innerHTML = diagnostics
      .map((d) => {
        const isErr = d.category === 'ERROR' || (d.payload as any)?.level === 'error';
        const msg = (d.payload as any)?.formattedMessage || (d.payload as any)?.message || '';
        const stack = (d.payload as any)?.stack || (d.payload as any)?.stackTrace || '';
        return `
          <div style="background:var(--bg-surface-elevated); padding:10px 14px; border-radius:6px; border-left:3px solid ${isErr ? '#ef4444' : '#f59e0b'}; font-family:var(--font-mono); font-size:12px;">
            <div style="display:flex; justify-content:space-between; color:var(--text-muted); font-size:11px;">
              <span>[${d.timestamp.toFixed(1)}ms] ${d.type}</span>
              <button class="btn btn-ghost" style="padding:2px 6px; font-size:10px;" onclick="window.__APP__.seekTo(${d.timestamp})">Jump</button>
            </div>
            <div style="color:${isErr ? '#f87171' : '#fbbf24'}; margin-top:4px; font-weight:600;">${msg}</div>
            ${stack ? `<pre style="font-size:10px; color:var(--text-muted); margin-top:6px; overflow:auto;">${stack}</pre>` : ''}
          </div>
        `;
      })
      .join('');
  }

  private renderNetworkTab(): void {
    const list = document.getElementById('network-list')!;
    const network = this.events.filter((e) => e.category === 'NETWORK');
    document.getElementById('badge-network-count')!.textContent = String(network.length);

    if (network.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);">No network events recorded.</div>';
      return;
    }

    list.innerHTML = network
      .map((n) => {
        const status = (n.payload as any)?.status;
        const method = (n.payload as any)?.method || 'GET';
        const url = (n.payload as any)?.url || '';
        const dur = (n.payload as any)?.durationMs;
        const isOk = status >= 200 && status < 400;

        return `
          <div style="background:var(--bg-surface-elevated); padding:10px 14px; border-radius:6px; border:1px solid var(--border-default); font-family:var(--font-mono); font-size:12px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-weight:700; color:#a855f7;">${method}</span>
              <span style="color:${isOk ? '#34d399' : '#f87171'}; font-weight:700;">${status || 'PENDING'}</span>
              <span style="color:var(--text-primary); max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${url}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:var(--text-muted); font-size:11px;">${dur !== undefined ? `${dur}ms` : ''}</span>
              <button class="btn btn-ghost" style="padding:2px 6px; font-size:10px;" onclick="window.__APP__.seekTo(${n.timestamp})">Jump</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private async renderAnnotationsTab(): Promise<void> {
    if (!this.currentSession) return;
    const annotations = await this.storage.getAnnotations(this.currentSession.id);
    const list = document.getElementById('annotations-list')!;

    list.innerHTML = annotations
      .map(
        (a) => `
      <div style="background:var(--bg-surface-elevated); padding:10px 14px; border-radius:6px; border:1px solid var(--border-default);">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted);">
          <span>${a.author}: <strong>${a.label}</strong></span>
          <span>${new Date(a.createdAt).toLocaleTimeString()}</span>
        </div>
        <div style="font-size:12px; color:var(--text-primary); margin-top:4px;">${a.comment}</div>
      </div>
    `
      )
      .join('');
  }

  private async addAnnotation(): Promise<void> {
    if (!this.currentSession) return;
    const input = document.getElementById('annotation-input') as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;

    await this.storage.addAnnotation({
      id: `ann_${Date.now()}`,
      sessionId: this.currentSession.id,
      timestamp: this.timeController?.getCurrentTime() || 0,
      author: 'USER',
      label: 'Note',
      comment: text,
      createdAt: Date.now(),
    });

    input.value = '';
    this.renderAnnotationsTab();
  }

  private renderSearchResults(query: string): void {
    const resultsContainer = document.getElementById('search-results-list')!;
    if (!this.sessionIndex || !query.trim()) {
      resultsContainer.innerHTML = '';
      return;
    }

    const results = this.sessionIndex.search({ text: query, limit: 30 });
    resultsContainer.innerHTML = results
      .map(
        (r) => `
      <div style="background:var(--bg-surface-elevated); padding:8px 12px; border-radius:6px; cursor:pointer; border:1px solid var(--border-default);" onclick="window.__APP__.seekTo(${r.timestamp}); document.getElementById('search-modal').classList.remove('open');">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">
          <span>[${r.timestamp.toFixed(1)}ms] ${r.type} (${r.category})</span>
          <span>${r.matchedField}</span>
        </div>
        <div style="font-size:12px; color:var(--text-primary); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${r.matchedSnippet}
        </div>
      </div>
    `
      )
      .join('');
  }

  public seekTo(timestamp: number): void {
    this.timeController?.seek(timestamp);
  }

  private startLiveRecording(): void {
    this.liveRecorder = new ForensicRecorder({ sessionName: 'Live Dashboard Session' });

    const btnStart = document.getElementById('btn-start-record')!;
    const btnStop = document.getElementById('btn-stop-record')!;
    const btnCheckpoint = document.getElementById('btn-checkpoint') as HTMLButtonElement;

    btnStart.style.display = 'none';
    btnStop.style.display = 'inline-flex';
    btnCheckpoint.disabled = false;

    const initialSnapshot = this.liveRecorder.start(document);
    this.storage.saveSession(this.liveRecorder.getMetadata());
    this.storage.saveInitialSnapshot(this.liveRecorder.getSessionId(), initialSnapshot);

    this.liveRecorder.onEvent((evt) => {
      this.storage.appendEvents(this.liveRecorder!.getSessionId(), [evt]);
    });

    this.liveRecorder.onCheckpoint((chk) => {
      this.storage.saveCheckpoint(chk);
    });
  }

  private async stopLiveRecording(): Promise<void> {
    if (!this.liveRecorder) return;
    const meta = this.liveRecorder.stop();
    await this.storage.saveSession(meta);

    const btnStart = document.getElementById('btn-start-record')!;
    const btnStop = document.getElementById('btn-stop-record')!;
    const btnCheckpoint = document.getElementById('btn-checkpoint') as HTMLButtonElement;

    btnStart.style.display = 'inline-flex';
    btnStop.style.display = 'none';
    btnCheckpoint.disabled = true;

    this.liveRecorder = null;
    await this.loadSessionsList();
  }

  private async exportSession(): Promise<void> {
    if (!this.currentSession) return;
    const initialSnapshot = (await this.storage.getInitialSnapshot(this.currentSession.id)) || this.currentSnapshot;
    if (!initialSnapshot) return;

    const checkpoints = await this.storage.getCheckpoints(this.currentSession.id);
    const annotations = await this.storage.getAnnotations(this.currentSession.id);

    const bundle = SessionSerializer.exportBundle(
      this.currentSession,
      initialSnapshot,
      this.events,
      checkpoints,
      annotations
    );

    const jsonStr = SessionSerializer.exportToJson(bundle);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentSession.id}.forensic.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private importSession(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const bundle = SessionSerializer.importFromJson(text);
        await this.storage.saveSession(bundle.metadata);
        await this.storage.saveInitialSnapshot(bundle.metadata.id, bundle.initialSnapshot);
        await this.storage.appendEvents(bundle.metadata.id, bundle.events);
        for (const chk of bundle.checkpoints) {
          await this.storage.saveCheckpoint(chk);
        }
        for (const ann of bundle.annotations) {
          await this.storage.addAnnotation(ann);
        }
        await this.loadSessionsList();
      } catch (err: any) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }
}

const app = new ForensicDashboardApp();
(window as any).__APP__ = app;
app.init();
