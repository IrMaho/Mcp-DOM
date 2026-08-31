if (typeof chrome !== 'undefined' && chrome.devtools) {
  chrome.devtools.panels.create(
    'Forensic Debugger',
    'icons/icon16.png',
    'dist/ui/index.html',
    (panel) => {
      // Panel created
    }
  );
}
