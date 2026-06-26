const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("difyDesktop", {
  retrieve(payload) {
    return ipcRenderer.invoke("dify:retrieve", payload);
  },
  cancel(requestId) {
    return ipcRenderer.invoke("dify:cancel", requestId);
  },
});
