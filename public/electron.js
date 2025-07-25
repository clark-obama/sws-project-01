const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'sungwonsa_logo.png'),
  });

  // public 폴더에서 실행되므로, build 폴더의 index.html은 상위 폴더의 build 폴더에 있음
  win.loadFile(path.join(__dirname, '../build', 'index.html'));
  // win.webContents.openDevTools(); // 개발자도구 필요시 주석 해제
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 