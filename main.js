const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    icon: path.join(__dirname, 'build', 'sungwonsa_logo.png'),
  });

  // 기본 메뉴 제거 후 한글 메뉴 강제 지정
  Menu.setApplicationMenu(null);

  const menuTemplate = [
    {
      label: '파일',
      submenu: [
        {
          label: '저장',
          click: () => win.webContents.send('request-save')
        },
        {
          label: '불러오기',
          click: () => win.webContents.send('request-load')
        },
        { type: 'separator' },
        { role: 'quit', label: '종료' }
      ]
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'delete', label: '삭제' },
        { role: 'selectAll', label: '전체 선택' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'forcereload', label: '강제 새로고침' },
        { role: 'toggledevtools', label: '개발자 도구' },
        { type: 'separator' },
        { role: 'resetzoom', label: '확대/축소 초기화' },
        { role: 'zoomin', label: '확대' },
        { role: 'zoomout', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체화면 전환' }
      ]
    },
    {
      label: '창',
      submenu: [
        { role: 'minimize', label: '최소화' },
        { role: 'close', label: '닫기' }
      ]
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '프로그램 정보',
          click: () => {
            win.webContents.executeJavaScript(`alert('성원사 상담 프로그램\n버전: 1.0.0')`);
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // index.html 로드
  const indexPath = path.join(__dirname, 'build', 'index.html');
  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath);
  } else {
    win.loadURL('data:text/html,<html><body><h1>File not found: ' + indexPath + '</h1></body></html>');
  }
}

// 데이터 저장/불러오기 IPC
ipcMain.handle('save-data', async (event, data) => {
  const filePath = path.join(app.getPath('userData'), 'data.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});
ipcMain.handle('load-data', async () => {
  const filePath = path.join(app.getPath('userData'), 'data.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return null;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 