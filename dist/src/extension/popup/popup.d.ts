declare let isRecording: boolean;
declare let updateInterval: ReturnType<typeof setInterval> | null;
declare let recordingStartTime: number;
declare const btnToggleRecord: HTMLButtonElement;
declare const btnRecordText: HTMLSpanElement;
declare const btnCheckpoint: HTMLButtonElement;
declare const btnOpenDashboard: HTMLButtonElement;
declare const statusIndicator: HTMLDivElement;
declare const statusBadge: HTMLSpanElement;
declare const currentUrlEl: HTMLParagraphElement;
declare const statEventsEl: HTMLSpanElement;
declare const statTimeEl: HTMLSpanElement;
declare function getActiveTab(): Promise<chrome.tabs.Tab | null>;
declare function checkStatus(): Promise<void>;
declare function setUIState(recording: boolean, metadata?: any): void;
//# sourceMappingURL=popup.d.ts.map