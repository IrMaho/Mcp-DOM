import{t as e}from"../assets/recorder--oksUSXW.js";var t=class{hostElement=null;shadowRoot=null;callbacks;isRecording=!1;isPaused=!1;isMinimized=!1;startTime=0;eventCount=0;timerInterval=null;isDragging=!1;dragStartX=0;dragStartY=0;posX=window.innerWidth-340;posY=40;constructor(e){this.callbacks=e,this.loadPosition()}mount(){this.hostElement&&document.body.contains(this.hostElement)||(this.hostElement=document.createElement(`div`),this.hostElement.id=`forensic-recorder-floating-host`,this.hostElement.style.all=`initial`,this.hostElement.style.position=`fixed`,this.hostElement.style.zIndex=`2147483647`,this.hostElement.style.left=`${this.posX}px`,this.hostElement.style.top=`${this.posY}px`,this.shadowRoot=this.hostElement.attachShadow({mode:`open`}),this.render(),this.attachEvents(),(document.body||document.documentElement).appendChild(this.hostElement))}unmount(){this.timerInterval&&=(clearInterval(this.timerInterval),null),this.hostElement&&this.hostElement.parentNode&&this.hostElement.parentNode.removeChild(this.hostElement),this.hostElement=null,this.shadowRoot=null}updateState(e,t=!1,n=0,r=0){this.isRecording=e,this.isPaused=t,this.startTime=n||(e?Date.now():0),this.eventCount=r,this.shadowRoot&&(this.render(),this.attachEvents()),this.isRecording&&!this.isPaused?this.startTimer():this.stopTimer()}incrementEventCount(){this.eventCount++;let e=this.shadowRoot?.querySelector(`#evt-badge`);e&&(e.textContent=`${this.eventCount} evts`)}startTimer(){this.stopTimer(),this.timerInterval=setInterval(()=>{let e=this.shadowRoot?.querySelector(`#timer-display`);if(e&&this.startTime){let t=(Date.now()-this.startTime)/1e3;e.textContent=`${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toFixed(1).padStart(4,`0`)}`}},200)}stopTimer(){this.timerInterval&&=(clearInterval(this.timerInterval),null)}savePosition(){try{sessionStorage.setItem(`forensic_overlay_pos`,JSON.stringify({x:this.posX,y:this.posY,min:this.isMinimized}))}catch{}}loadPosition(){try{let e=sessionStorage.getItem(`forensic_overlay_pos`);if(e){let t=JSON.parse(e);this.posX=Math.max(10,Math.min(window.innerWidth-300,t.x||this.posX)),this.posY=Math.max(10,Math.min(window.innerHeight-150,t.y||this.posY)),this.isMinimized=!!t.min}}catch{}}render(){if(!this.shadowRoot)return;let e=`
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
    `,t=this.isRecording;if(this.isMinimized){this.shadowRoot.innerHTML=`
        <style>${e}</style>
        <div class="panel minimized">
          <div class="header" id="drag-header">
            <div class="title-area">
              <span class="status-pill ${t?`recording`:``}">
                <span class="pulse-dot"></span>
                <span id="mini-status">${t?`REC`:`STANDBY`}</span>
              </span>
              <span id="timer-display" style="font-family: monospace; font-weight: 700; color: #38bdf8;">00:00.0</span>
            </div>
            <button class="icon-btn" id="btn-toggle-min" title="Expand Panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
          </div>
        </div>
      `;return}this.shadowRoot.innerHTML=`
      <style>${e}</style>
      <div class="panel">
        <div class="header" id="drag-header">
          <div class="title-area">
            <svg class="brand-icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span class="title-text">Forensic Debugger</span>
            <span class="status-pill ${t?`recording`:``}">
              <span class="pulse-dot"></span>
              <span>${t?`RECORDING`:`READY`}</span>
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

          <button class="btn-main ${t?`btn-record-stop`:`btn-record-start`}" id="btn-record">
            ${t?`⏹ Stop Recording`:`🔴 Start Forensic Recording`}
          </button>

          <div class="btn-grid">
            <button class="btn-secondary" id="btn-checkpoint" ${t?``:`disabled`}>
              📸 Checkpoint
            </button>
            <button class="btn-secondary" id="btn-inspect" ${t?``:`disabled`}>
              🎯 Inspect Element
            </button>
            <button class="btn-secondary" id="btn-annotate" ${t?``:`disabled`} style="grid-column: span 2;">
              📝 Add Hypothesis / Note
            </button>
            <button class="btn-main btn-dashboard" id="btn-dashboard">
              📊 Open Forensic Dashboard
            </button>
          </div>
        </div>
      </div>
    `}attachEvents(){if(!this.shadowRoot)return;let e=this.shadowRoot.querySelector(`#drag-header`);e&&e.addEventListener(`mousedown`,e=>{this.isDragging=!0,this.dragStartX=e.clientX-this.posX,this.dragStartY=e.clientY-this.posY;let t=e=>{!this.isDragging||!this.hostElement||(this.posX=Math.max(10,Math.min(window.innerWidth-80,e.clientX-this.dragStartX)),this.posY=Math.max(10,Math.min(window.innerHeight-50,e.clientY-this.dragStartY)),this.hostElement.style.left=`${this.posX}px`,this.hostElement.style.top=`${this.posY}px`)},n=()=>{this.isDragging=!1,window.removeEventListener(`mousemove`,t),window.removeEventListener(`mouseup`,n),this.savePosition()};window.addEventListener(`mousemove`,t),window.addEventListener(`mouseup`,n)}),this.shadowRoot.querySelector(`#btn-toggle-min`)?.addEventListener(`click`,()=>{this.isMinimized=!this.isMinimized,this.savePosition(),this.render(),this.attachEvents()}),this.shadowRoot.querySelector(`#btn-close`)?.addEventListener(`click`,()=>{this.unmount()}),this.shadowRoot.querySelector(`#btn-record`)?.addEventListener(`click`,()=>{this.isRecording?this.callbacks.onStopRecord():this.callbacks.onStartRecord()});let t=this.shadowRoot.querySelector(`#btn-checkpoint`);t?.addEventListener(`click`,()=>{if(this.callbacks.onCaptureCheckpoint(),t){let e=t.textContent;t.textContent=`✔ Saved!`,setTimeout(()=>t.textContent=e,1e3)}}),this.shadowRoot.querySelector(`#btn-inspect`)?.addEventListener(`click`,()=>{this.callbacks.onInspectElement()}),this.shadowRoot.querySelector(`#btn-annotate`)?.addEventListener(`click`,()=>{let e=prompt(`Enter observation, bug note, or hypothesis at this exact moment:`);e&&e.trim()&&this.callbacks.onAddAnnotation(e.trim())}),this.shadowRoot.querySelector(`#btn-dashboard`)?.addEventListener(`click`,()=>{this.callbacks.onOpenDashboard()})}};(function(){let n=null,r=[],i=null,a=null,o=!1;function s(){try{if(typeof chrome<`u`&&chrome.runtime?.getURL){let e=document.createElement(`script`);e.src=chrome.runtime.getURL(`dist/extension/page-script.js`),e.onload=()=>e.remove(),(document.head||document.documentElement).appendChild(e)}}catch{}}function c(){if(r.length===0||!n)return;let e=[...r];r=[];try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_EVENTS_CHUNK`,sessionId:n.getSessionId(),events:e})}catch{}}function l(t,o,s){if(n)return n.getMetadata();n=new e({sessionId:o,sessionName:t||`Recording on ${document.title||window.location.hostname}`}),n.onEvent(e=>{r.push(e),a&&a.incrementEventCount(),r.length>=25&&c()}),n.onCheckpoint(e=>{try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_CHECKPOINT`,sessionId:e.sessionId,checkpoint:e})}catch{}});let l=n.start(document);try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_SESSION_START`,metadata:n.getMetadata(),initialSnapshot:l})}catch{}return i||=setInterval(c,1e3),a&&a.updateState(!0,!1,s||Date.now(),0),n.getMetadata()}function u(){if(!n)return null;c(),i&&=(clearInterval(i),null);let e=n.stop();try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_SESSION_STOP`,sessionId:e.id,metadata:e})}catch{}let t={...e};return n=null,a&&a.updateState(!1,!1,0,0),t}function d(){if(o){o=!1,document.body.style.cursor=`default`;return}o=!0,document.body.style.cursor=`crosshair`;let e=document.createElement(`div`);e.id=`forensic-inspect-highlighter`,e.style.position=`fixed`,e.style.pointerEvents=`none`,e.style.zIndex=`2147483640`,e.style.border=`2px dashed #38bdf8`,e.style.background=`rgba(56, 189, 248, 0.15)`,e.style.transition=`all 0.05s ease`,document.body.appendChild(e);let t=t=>{if(!o)return;let n=t.target;if(!n||n.id===`forensic-recorder-floating-host`||n.closest(`#forensic-recorder-floating-host`)){e.style.display=`none`;return}let r=n.getBoundingClientRect();e.style.display=`block`,e.style.left=`${r.left}px`,e.style.top=`${r.top}px`,e.style.width=`${r.width}px`,e.style.height=`${r.height}px`},r=i=>{if(!o)return;let a=i.target;if(!a.closest(`#forensic-recorder-floating-host`)&&(i.preventDefault(),i.stopPropagation(),o=!1,document.body.style.cursor=`default`,e.remove(),window.removeEventListener(`mousemove`,t,!0),window.removeEventListener(`click`,r,!0),n)){let e=a.id?`#${a.id}`:a.className?`.${a.className.split(` `)[0]}`:a.tagName.toLowerCase();n.addAnnotation(`Inspect Element`,`Inspected element <${a.tagName.toLowerCase()}> with selector '${e}'`,`USER`),alert(`🎯 Inspected element <${a.tagName.toLowerCase()}> recorded! Checkpoint saved.`)}};window.addEventListener(`mousemove`,t,!0),window.addEventListener(`click`,r,!0)}function f(){return a||=new t({onStartRecord:()=>{l()},onStopRecord:()=>{u()},onTogglePause:()=>{n&&(n.getMetadata().status===`recording`?n.pause():n.resume())},onCaptureCheckpoint:()=>{n&&n.captureCheckpoint(`MANUAL`,document)},onAddAnnotation:e=>{n&&n.addAnnotation(`User Note`,e,`USER`)},onInspectElement:()=>{d()},onOpenDashboard:()=>{let e=n?n.getSessionId():void 0;chrome.runtime.sendMessage({type:`OPEN_DASHBOARD_TAB`,sessionId:e})}}),a}function p(){try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`GET_TAB_RECORDING_STATE`},e=>{chrome.runtime.lastError||!e||e.isRecording&&e.recording&&(f().mount(),l(e.recording.sessionName,e.recording.sessionId,e.recording.startTime))})}catch{}}typeof chrome<`u`&&chrome.runtime?.onMessage&&chrome.runtime.onMessage.addListener((e,t,r)=>{if(e.type===`START_RECORDING`){let t=l(e.sessionName);f().mount(),r({success:!0,metadata:t})}else if(e.type===`STOP_RECORDING`)r({success:!0,metadata:u()});else if(e.type===`TOGGLE_FLOATING_OVERLAY`){let e=f();document.getElementById(`forensic-recorder-floating-host`)?(e.unmount(),r({isOpen:!1})):(e.mount(),e.updateState(n?.getMetadata().status===`recording`,!1,n?.getMetadata().startTime||0,0),r({isOpen:!0}))}else e.type===`GET_RECORDER_STATUS`?r({isRecording:n?.getMetadata().status===`recording`,metadata:n?.getMetadata()||null}):e.type===`CAPTURE_CHECKPOINT`&&r(n?{success:!0,checkpoint:n.captureCheckpoint(`MANUAL`,document)}:{success:!1,error:`Not currently recording`});return!0}),s(),document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,p):p()})();