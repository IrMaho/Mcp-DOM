"use strict";
let isRecording = false;
let updateInterval = null;
let recordingStartTime = 0;
const btnToggleRecord = document.getElementById('btn-toggle-record');
const btnRecordText = document.getElementById('btn-record-text');
const btnCheckpoint = document.getElementById('btn-checkpoint');
const btnOpenDashboard = document.getElementById('btn-open-dashboard');
const statusIndicator = document.getElementById('status-indicator');
const statusBadge = document.getElementById('status-badge');
const currentUrlEl = document.getElementById('current-url');
const statEventsEl = document.getElementById('stat-events');
const statTimeEl = document.getElementById('stat-time');
async function getActiveTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs)
        return null;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
}
async function checkStatus() {
    const tab = await getActiveTab();
    if (!tab || !tab.id)
        return;
    if (tab.url) {
        currentUrlEl.textContent = `Target: ${new URL(tab.url).hostname}`;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'GET_RECORDER_STATUS' }, (res) => {
        if (chrome.runtime.lastError || !res) {
            setUIState(false);
            return;
        }
        setUIState(res.isRecording, res.metadata);
    });
}
function setUIState(recording, metadata) {
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
    }
    else {
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
btnToggleRecord.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.id)
        return;
    if (!isRecording) {
        chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING', sessionName: `Session on ${tab.title || 'Tab'}` }, (res) => {
            if (res && res.success) {
                recordingStartTime = Date.now();
                setUIState(true, res.metadata);
            }
        });
    }
    else {
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' }, (res) => {
            setUIState(false);
        });
    }
});
btnCheckpoint.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.id)
        return;
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
        chrome.tabs.create({ url: chrome.runtime.getURL('dist/ui/index.html') });
    }
    else {
        window.open('../ui/index.html', '_blank');
    }
});
checkStatus();
//# sourceMappingURL=popup.js.map