const { contextBridge, ipcRenderer } = require('electron');
const s = (c, ...a) => ipcRenderer.sendSync(c, ...a);
contextBridge.exposeInMainWorld('store', {
  load: () => s('load'), save: j => s('save', j), backup: (d, j) => s('backup', d, j),
  list: () => s('list'), read: d => s('read', d), print: () => s('print'), path: s('path')
});
