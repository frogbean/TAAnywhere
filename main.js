const VERSION = require('./package.json').version
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { installMod } = require('./recipeInstaller.js');
const path = require('path');
const getPlatform = require('./getPlatform.js')
const { exec } = require('child_process');
const github = 'https://github.com/frogbean/TAAnywhere';
app.allowRendererProcessReuse = true;
function log(msg) {
    win.webContents.send('log', msg)
}

(async()=>{

    await app.whenReady()
    
    globalThis.win = new BrowserWindow({
        width: 480,
        height: 360,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    //uncomment to get access to dev tools
    //win.webContents.openDevTools();
    
    win.loadFile('index.html')

    ipcMain.on('dragWindow', (event, x, y) => {
        win.setPosition(x, y);
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
    
    setTimeout(()=>{
        log(`TAAnywhere version ${VERSION}`)
    }, 1000)

    setTimeout(()=>{
        log(`https://github.com/frogbean/TAAnywhere`)
    }, 1500)

    setTimeout(async ()=>{
        log(`platform: ${await getPlatform()}`)
    }, 2000)
    
})();
