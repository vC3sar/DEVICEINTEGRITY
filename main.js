const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const rcsDir = path.join(app.getPath('userData'), 'rcs');
const adbZipPath = path.join(rcsDir, 'platform-tools.zip');
const adbExePath = path.join(rcsDir, 'platform-tools', 'adb.exe');

async function ensureAdb() {
  if (fs.existsSync(adbExePath)) {
    console.log('[Setup] ADB ya está instalado en:', adbExePath);
    return adbExePath;
  }

  if (!fs.existsSync(rcsDir)) {
    fs.mkdirSync(rcsDir, { recursive: true });
  }

  console.log('[Setup] Descargando ADB...');
  const adbUrl = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip';
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(adbZipPath);
    https.get(adbUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('[Setup] Descarga completada. Extrayendo...');
        
        // Usamos PowerShell para extraer sin dependencias de terceros
        const unzipCmd = `powershell Expand-Archive -Path "${adbZipPath}" -DestinationPath "${rcsDir}" -Force`;
        
        exec(unzipCmd, (err) => {
          if (err) {
            console.error('[Setup] Error al extraer:', err);
            reject(err);
          } else {
            console.log('[Setup] Extracción completada.');
            fs.unlinkSync(adbZipPath); // Borrar el zip
            resolve(adbExePath);
          }
        });
      });
    }).on('error', (err) => {
      fs.unlink(adbZipPath, () => {});
      console.error('[Setup] Error de descarga:', err);
      reject(err);
    });
  });
}

function createWindow() {
  console.log('[Main] Creando la ventana principal...');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: __dirname + '/preload.js'
    }
  });

  win.loadFile('index.html').then(() => {
    console.log('[Main] Archivo index.html cargado con éxito');
  });
}

app.whenReady().then(async () => {
  console.log('[Main] Aplicación lista (ready)');
  await ensureAdb().catch(err => console.error('[Setup Critical] No se pudo configurar ADB:', err));
  createWindow();
});

ipcMain.handle('adb', async (event, cmd) => {
  // Reemplazamos el comando "adb" por la ruta absoluta al ejecutable local
  const fullCmd = cmd.replace(/^adb/, `"${adbExePath}"`);
  console.log(`[IPC] Ejecutando: ${fullCmd}`);

  return new Promise((resolve) => {
    exec(fullCmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`[Exec Error] Error al ejecutar "${fullCmd}":`, err.message);
        return resolve(stderr);
      }
      console.log(`[Exec Success] Resultado de "${fullCmd}":`, stdout);
      resolve(stdout);
    });
  });
});