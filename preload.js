const { contextBridge, ipcRenderer, window } = require('electron')
const created = new Audio('created.mp3');

let is_locked = false;

contextBridge.exposeInMainWorld('electronAPI', {
    dragWindow: (x, y) => ipcRenderer.send('dragWindow', x, y),
    close: () => ipcRenderer.send('close'),
    minimize: () => ipcRenderer.send('minimize'),
    install: mod => ipcRenderer.send('install', {mod}),
    github: () => ipcRenderer.send('github'),
    locked: () => { return is_locked },
})

ipcRenderer.on('error', (event, message) => {
    const terminalOutput = document.getElementById('terminalOutput')
    const terminal = document.getElementById('myTerminal')
    terminalOutput.innerHTML += `<span class="error">Error: ${message}<span><br>`
    terminal.scrollTo(0, terminalOutput.scrollHeight);
})

ipcRenderer.on('log', (event, message) => {
    const terminalOutput = document.getElementById('terminalOutput')
    const terminal = document.getElementById('myTerminal')
    terminalOutput.innerHTML += `${message}<span><br>`
    terminal.scrollTo(0, terminalOutput.scrollHeight);
})

ipcRenderer.on('lock', () => {
    is_locked = true;
})

ipcRenderer.on('unlock', () => {
    is_locked = false;
})

ipcRenderer.on('created', () => {
    is_locked = false;
    created.play();
})