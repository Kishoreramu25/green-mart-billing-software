const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 3000;

function ensureServer() {
  return new Promise((resolve) => {
    const testReq = http.get(`http://localhost:${PORT}/api/info`, () => {
      resolve();
    });
    testReq.on('error', () => {
      try {
        require('./server.js');
      } catch (e) {
        console.error('Server startup notice:', e.message);
      }
      setTimeout(resolve, 800);
    });
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    await ensureServer();
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      autoHideMenuBar: true,
      title: 'Green Mart - Billing & POS',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    win.maximize();
    win.loadURL(`http://localhost:${PORT}`);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
