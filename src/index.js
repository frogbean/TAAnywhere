const { app, BrowserWindow, ipcMain, dialog, ipcRenderer } = require('electron');
const { installMod } = require('./recipeInstaller.js');
const path = require('path');
const { exec } = require('child_process');
const github = 'https://github.com/frogbean/TAAnywhere';
app.allowRendererProcessReuse = true;

function log(msg) {
    win.webContents.send('log', msg)
}

(async()=>{

    await app.whenReady()

    if (process.platform === 'darwin') { // Check if it's macOS
        app.dock.setIcon(path.join(__dirname, 'icon.ico'));
    }

    let appWidth = 480, appHeight = 360;

    globalThis.win = new BrowserWindow({
        title: 'TAAnywhere', 
        icon: path.join(__dirname, 'icon.ico'), 
        width: appWidth,
        height: appHeight,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    //uncomment to get access to dev tools
    //win.webContents.openDevTools();
    
    win.loadFile('./src/index.html')

    let prev_x, prev_y;

    ipcMain.on('dragWindow', (event, x, y) => {
        if(x == prev_x && y == prev_y) return;
        prev_x = x, prev_y = y;
        win.setPosition(x, y);
        globalThis.win.setSize(appWidth, appHeight);
    });

    ipcMain.on('minimize', (event, x, y) => {
        win.minimize()
    });

    ipcMain.on('close', (event, x, y) => {
        win.close()
        app.quit()
    });

    ipcMain.on('github', ()=>{
        exec(`start ${github}`)
    })

    process.on('uncaughtException', error => {
        win.webContents.send('error', error.message);
    });

    ipcMain.on('install', async (event, data)=> {
        const file = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if(file.canceled) return log(`canceled dir select`)
        const path = file.filePaths[0];
        const confirm = await dialog.showMessageBox({
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Confirmation',
            message: `create ${data.mod} at ${path}?`,
          });
        if(confirm.response === 1) return log(`canceled create confirm`)
        log(`creating ${data.mod} at ${path}`)
        installMod(data.mod, path, win)
    })

    
})();
