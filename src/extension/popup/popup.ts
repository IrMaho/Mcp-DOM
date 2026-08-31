let isRecording = false;
let updateInterval: ReturnType<typeof setInterval> | null = null;
let recordingStartTime = 0;

const btnToggleOverlay = document.getElementById('btn-toggle-overlay') as HTMLButtonElement;
const btnToggleRecord = document.getElementById('btn-toggle-record') as HTMLButtonElement;
const btnRecordText = document.getElementById('btn-record-text') as HTMLSpanElement;
const btnCheckpoint = document.getElementById('btn-checkpoint') as HTMLButtonElement;
const btnOpenDashboard = document.getElementById('btn-open-dashboard') as HTMLButtonElement;
const statusIndicator = document.getElementById('status-indicator') as HTMLDivElement;
const statusBadge = document.getElementById('status-badge') as HTMLSpanElement;
const currentUrlEl = document.getElementById('current-url') as HTMLParagraphElement;
const statEventsEl = document.getElementById('stat-events') as HTMLSpanElement;
const statTimeEl = document.getElementById('stat-time') as HTMLSpanElement;

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return null;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function checkStatus() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return;

  if (tab.url) {
    try {
      currentUrlEl.textContent = `Target: ${new URL(tab.url).hostname}`;
    } catch {
      currentUrlEl.textContent = `Target: Active Tab`;
    }
  }

  chrome.tabs.sendMessage(tab.id, { type: 'GET_RECORDER_STATUS' }, (res) => {
    if (chrome.runtime.lastError || !res) {
      setUIState(false);
      return;
    }
    setUIState(res.isRecording, res.metadata);
  });
}

function setUIState(recording: boolean, metadata?: any) {
  isRecording = recording;

  if (recording) {
    statusIndicator.className = 'status-pulse recording';
    statusBadge.className = 'badge recording';
    statusBadge.textContent = 'RECORDING';
    btnToggleRecord.className = 'btn btn-primary recording';
    btnRecordText.textContent = 'Stop Recording';
    btnCheckpoint.disabled = false;

    if (metadata && metadata.startTime) {
      recordingStartTime = metadata.startTime;
    }

    if (!updateInterval) {
      updateInterval = setInterval(() => {
        const elapsed = (Date.now() - (recordingStartTime || Date.now())) / 1000;
        statTimeEl.textContent = `${elapsed.toFixed(1)}s`;
      }, 500);
    }
  } else {
    statusIndicator.className = 'status-pulse';
    statusBadge.className = 'badge';
    statusBadge.textContent = 'READY';
    btnToggleRecord.className = 'btn btn-primary';
    btnRecordText.textContent = 'Start Recording';
    btnCheckpoint.disabled = true;

    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
    statTimeEl.textContent = '0.0s';
  }
}

btnToggleOverlay?.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_OVERLAY' }, () => {
    window.close(); // Close popup so user immediately uses floating widget on the page!
  });
});

btnToggleRecord.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return;

  if (!isRecording) {
    chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING', sessionName: `Session on ${tab.title || 'Tab'}` }, (res) => {
      if (res && res.success) {
        recordingStartTime = Date.now();
        setUIState(true, res.metadata);
      }
    });
  } else {
    chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' }, (res) => {
      setUIState(false);
    });
  }
});

btnCheckpoint.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_CHECKPOINT' }, (res) => {
    if (res && res.success) {
      btnCheckpoint.style.backgroundColor = '#10b981';
      setTimeout(() => {
        btnCheckpoint.style.backgroundColor = '';
      }, 500);
    }
  });
});

btnOpenDashboard.addEventListener('click', () => {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url: chrome.runtime.getURL('dist/src/ui/index.html') });
  } else {
    window.open('../ui/index.html', '_blank');
  }
});

checkStatus();
