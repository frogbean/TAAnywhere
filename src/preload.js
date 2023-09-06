const { contextBridge, ipcRenderer, window } = require('electron')
const created = new Audio('created.mp3');
const getPlatform = require('./getPlatform.js')

let is_locked = false;

async function available() {
    const TAA_API = require('./shared.json').endpoint
    const available_url = `${TAA_API}/list/${await getPlatform()}`; //http://212.71.238.61:9000/taa/list/win32.10
    const response = await fetch(available_url)

    if (response.ok) {
        const responseData = await response.text();
        const jsonData = JSON.parse(responseData);
        return jsonData.available;
    } else {
        throw new Error(`Request failed with status ${response.status}`);
    }
}

contextBridge.exposeInMainWorld('electronAPI', {
    dragWindow: (x, y) => ipcRenderer.send('dragWindow', x, y),
    close: () => ipcRenderer.send('close'),
    minimize: () => ipcRenderer.send('minimize'),
    install: mod => ipcRenderer.send('install', {mod}),
    github: () => ipcRenderer.send('github'),
    locked: () => { return is_locked },
    available: async () => await available()
})

ipcRenderer.on('error', (event, message) => {
    const terminalOutput = document.getElementById('terminalOutput')
    const terminal = document.getElementById('myTerminal')
    terminalOutput.innerHTML += `<span class="error">Error: ${message}<span><br>`
    terminal.scrollTo(0, terminalOutput.scrollHeight);
})

const progress_ids = [];

ipcRenderer.on('log', (event, message) => {
    const terminalOutput = document.getElementById('terminalOutput')
    const terminal = document.getElementById('myTerminal')
    if(message.includes("progress_id::")) {
        const progress_id = message.split('::')[1];
        const progress_report = message.split('::')[2]
        if(!progress_ids.includes(progress_id)) {
          terminalOutput.innerHTML += `<span id="${progress_id}">${progress_report}</span><br>`
          terminal.scrollTo(0, terminalOutput.scrollHeight);
          return progress_ids.push(progress_id)
        }
        return document.querySelector(`#${progress_id}`).innerHTML = progress_report;
      }
  
    terminalOutput.innerHTML += `${message}<br>`
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