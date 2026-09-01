export interface FloatingControllerCallbacks {
  onStartRecord: () => void;
  onStopRecord: () => void;
  onTogglePause: () => void;
  onCaptureCheckpoint: () => void;
  onAddAnnotation: (text: string) => void;
  onInspectElement: () => void;
  onOpenDashboard: () => void;
}

export class InPageFloatingController {
  private hostElement: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private callbacks: FloatingControllerCallbacks;
  private isRecording: boolean = false;
  private isPaused: boolean = false;
  private isMinimized: boolean = false;
  private startTime: number = 0;
  private eventCount: number = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Dragging state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private posX = window.innerWidth - 340;
  private posY = 40;

  constructor(callbacks: FloatingControllerCallbacks) {
    this.callbacks = callbacks;
    this.loadPosition();
  }

  public mount(): void {
    if (this.hostElement && document.body.contains(this.hostElement)) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'forensic-recorder-floating-host';
    this.hostElement.style.all = 'initial';
    this.hostElement.style.position = 'fixed';
    this.hostElement.style.zIndex = '2147483647';
    this.hostElement.style.left = `${this.posX}px`;
    this.hostElement.style.top = `${this.posY}px`;

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });
    this.render();
    this.attachEvents();

    (document.body || document.documentElement).appendChild(this.hostElement);
  }

  public unmount(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.hostElement && this.hostElement.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
    }
    this.hostElement = null;
    this.shadowRoot = null;
  }

  public hide(): void {
    if (this.hostElement) {
      this.hostElement.style.setProperty('display', 'none', 'important');
      this.hostElement.style.setProperty('visibility', 'hidden', 'important');
      this.hostElement.style.setProperty('opacity', '0', 'important');
    }
  }

  public show(): void {
    if (this.hostElement) {
      this.hostElement.style.removeProperty('display');
      this.hostElement.style.removeProperty('visibility');
      this.hostElement.style.removeProperty('opacity');
    }
  }

  public updateState(isRecording: boolean, isPaused: boolean = false, startTime: number = 0, eventCount: number = 0): void {
    this.isRecording = isRecording;
    this.isPaused = isPaused;
    this.startTime = startTime || (isRecording ? Date.now() : 0);
    this.eventCount = eventCount;

    if (this.shadowRoot) {
      this.render();
      this.attachEvents();
    }

    if (this.isRecording && !this.isPaused) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  }

  public incrementEventCount(): void {
    this.eventCount++;
    const badge = this.shadowRoot?.querySelector('#evt-badge');
    if (badge) {
      badge.textContent = `${this.eventCount} evts`;
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const timerEl = this.shadowRoot?.querySelector('#timer-display');
      if (timerEl && this.startTime) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toFixed(1).padStart(4, '0');
        timerEl.textContent = `${mins}:${secs}`;
      }
    }, 200);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private savePosition(): void {
    try {
      sessionStorage.setItem('forensic_overlay_pos', JSON.stringify({ x: this.posX, y: this.posY, min: this.isMinimized }));
    } catch {
      // Ignored
    }
  }

  private loadPosition(): void {
    try {
      const saved = sessionStorage.getItem('forensic_overlay_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.posX = Math.max(10, Math.min(window.innerWidth - 300, parsed.x || this.posX));
        this.posY = Math.max(10, Math.min(window.innerHeight - 150, parsed.y || this.posY));
        this.isMinimized = !!parsed.min;
      }
    } catch {
      // Ignored
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const styles = `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 12px;
        color: #f1f5f9;
        user-select: none;
      }
      * {
        box-sizing: border-box;
      }
      .panel {
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
        width: 320px;
        overflow: hidden;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .panel.minimized {
        width: auto;
        border-radius: 30px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(30, 41, 59, 0.7);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        cursor: grab;
      }
      .panel.minimized .header {
        border-bottom: none;
        padding: 6px 12px;
      }
      .header:active {
        cursor: grabbing;
      }
      .title-area {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .brand-icon {
        width: 16px;
        height: 16px;
        fill: #38bdf8;
      }
      .title-text {
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.3px;
        color: #f8fafc;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        background: rgba(71, 85, 105, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
      }
      .status-pill.recording {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
        color: #f87171;
      }
      .pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #94a3b8;
      }
      .status-pill.recording .pulse-dot {
        background: #ef4444;
        box-shadow: 0 0 8px #ef4444;
        animation: pulse 1.2s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }
      .actions-top {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .icon-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      .content {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .metrics-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(15, 23, 42, 0.6);
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .metric-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .metric-label {
        font-size: 9px;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 700;
      }
      .metric-value {
        font-size: 13px;
        font-weight: 700;
        font-family: monospace;
        color: #38bdf8;
      }
      .btn-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .btn-main {
        grid-column: span 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
      }
      .btn-record-start {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
      }
      .btn-record-start:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
      .btn-record-stop {
        background: linear-gradient(135deg, #475569, #334155);
        color: #f8fafc;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .btn-record-stop:hover {
        background: #dc2626;
        color: #ffffff;
      }
      .btn-secondary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 7px 10px;
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #cbd5e1;
        font-weight: 600;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-secondary:hover:not(:disabled) {
        background: rgba(51, 65, 85, 0.9);
        border-color: rgba(56, 189, 248, 0.4);
        color: #ffffff;
      }
      .btn-secondary:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-dashboard {
        grid-column: span 2;
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #ffffff;
        border: none;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      }
      .btn-dashboard:hover {
        filter: brightness(1.1);
      }
    `;

    const isRec = this.isRecording;

    if (this.isMinimized) {
      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <div class="panel minimized">
          <div class="header" id="drag-header">
            <div class="title-area">
              <span class="status-pill ${isRec ? 'recording' : ''}">
                <span class="pulse-dot"></span>
                <span id="mini-status">${isRec ? 'REC' : 'STANDBY'}</span>
              </span>
              <span id="timer-display" style="font-family: monospace; font-weight: 700; color: #38bdf8;">00:00.0</span>
            </div>
            <button class="icon-btn" id="btn-toggle-min" title="Expand Panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
          </div>
        </div>
      `;
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="panel">
        <div class="header" id="drag-header">
          <div class="title-area">
            <svg class="brand-icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span class="title-text">Forensic Debugger</span>
            <span class="status-pill ${isRec ? 'recording' : ''}">
              <span class="pulse-dot"></span>
              <span>${isRec ? 'RECORDING' : 'READY'}</span>
            </span>
          </div>
          <div class="actions-top">
            <button class="icon-btn" id="btn-toggle-min" title="Minimize">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
            </button>
            <button class="icon-btn" id="btn-close" title="Close Overlay">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div class="content">
          <div class="metrics-row">
            <div class="metric-box">
              <span class="metric-label">Session Elapsed</span>
              <span class="metric-value" id="timer-display">00:00.0</span>
            </div>
            <div class="metric-box" style="text-align: right;">
              <span class="metric-label">Recorded Stream</span>
              <span class="metric-value" id="evt-badge">${this.eventCount} evts</span>
            </div>
          </div>

          <button class="btn-main ${isRec ? 'btn-record-stop' : 'btn-record-start'}" id="btn-record">
            ${isRec ? '⏹ Stop Recording' : '🔴 Start Forensic Recording'}
          </button>

          <div class="btn-grid">
            <button class="btn-secondary" id="btn-checkpoint" ${!isRec ? 'disabled' : ''}>
              📸 Checkpoint
            </button>
            <button class="btn-secondary" id="btn-inspect" ${!isRec ? 'disabled' : ''}>
              🎯 Inspect Element
            </button>
            <button class="btn-secondary" id="btn-annotate" ${!isRec ? 'disabled' : ''} style="grid-column: span 2;">
              📝 Add Hypothesis / Note
            </button>
            <button class="btn-main btn-dashboard" id="btn-dashboard">
              📊 Open Forensic Dashboard
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    if (!this.shadowRoot) return;

    const dragHeader = this.shadowRoot.querySelector('#drag-header') as HTMLElement;
    if (dragHeader) {
      dragHeader.addEventListener('mousedown', (e: MouseEvent) => {
        this.isDragging = true;
        this.dragStartX = e.clientX - this.posX;
        this.dragStartY = e.clientY - this.posY;

        const onMouseMove = (moveEvt: MouseEvent) => {
          if (!this.isDragging || !this.hostElement) return;
          this.posX = Math.max(10, Math.min(window.innerWidth - 80, moveEvt.clientX - this.dragStartX));
          this.posY = Math.max(10, Math.min(window.innerHeight - 50, moveEvt.clientY - this.dragStartY));
          this.hostElement.style.left = `${this.posX}px`;
          this.hostElement.style.top = `${this.posY}px`;
        };

        const onMouseUp = () => {
          this.isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          this.savePosition();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    const btnToggleMin = this.shadowRoot.querySelector('#btn-toggle-min');
    btnToggleMin?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.savePosition();
      this.render();
      this.attachEvents();
    });

    const btnClose = this.shadowRoot.querySelector('#btn-close');
    btnClose?.addEventListener('click', () => {
      this.unmount();
    });

    const btnRecord = this.shadowRoot.querySelector('#btn-record');
    btnRecord?.addEventListener('click', () => {
      if (this.isRecording) {
        this.callbacks.onStopRecord();
      } else {
        this.callbacks.onStartRecord();
      }
    });

    const btnCheckpoint = this.shadowRoot.querySelector('#btn-checkpoint');
    btnCheckpoint?.addEventListener('click', () => {
      this.callbacks.onCaptureCheckpoint();
      if (btnCheckpoint) {
        const orig = btnCheckpoint.textContent;
        btnCheckpoint.textContent = '✔ Saved!';
        setTimeout(() => (btnCheckpoint.textContent = orig), 1000);
      }
    });

    const btnInspect = this.shadowRoot.querySelector('#btn-inspect');
    btnInspect?.addEventListener('click', () => {
      this.callbacks.onInspectElement();
    });

    const btnAnnotate = this.shadowRoot.querySelector('#btn-annotate');
    btnAnnotate?.addEventListener('click', () => {
      const text = prompt('Enter observation, bug note, or hypothesis at this exact moment:');
      if (text && text.trim()) {
        this.callbacks.onAddAnnotation(text.trim());
      }
    });

    const btnDashboard = this.shadowRoot.querySelector('#btn-dashboard');
    btnDashboard?.addEventListener('click', () => {
      this.callbacks.onOpenDashboard();
    });
  }
}
