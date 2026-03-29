const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adbAPI', {
  run: (cmd) => {
    console.log(`[Preload] Solicitando ejecución de comando: ${cmd}`);
    return ipcRenderer.invoke('adb', cmd);
  }
});
