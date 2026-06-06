const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const server = require('../server'); // Importa tu servidor Express
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Opcional, agrega un ícono
  });

  // Carga la aplicación web desde el servidor local
  mainWindow.loadURL('http://localhost:3000');

  // Abre las herramientas de desarrollo (opcional, quítalo en producción)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// IPC handler para generar PDF desde el proceso principal (Electron)
ipcMain.handle('print-to-pdf', async () => {
  try {
    const pdfOptions = {
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#444">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>'
    };

    const data = await mainWindow.webContents.printToPDF(pdfOptions);
    const filePath = path.join(app.getPath('desktop'), `Reporte-${Date.now()}.pdf`);
    await fs.promises.writeFile(filePath, data);
    await shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (err) {
    console.error('Error generando PDF:', err);
    return { success: false, error: err.message };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});