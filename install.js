const { existsSync, mkdirSync, createWriteStream, createReadStream, statSync, readdirSync } = require('fs');
const crypto = require('crypto');
const path = require('path');
const { app } = require('electron');

const { Worker } = require('worker_threads');

const http = require('http'); 
const https = require('https');
const TAA_API = 'http://localhost:8080/taa/recipie'

const APP_PATH = app.getAppPath();
const exePath = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
const DOWNLOADS = path.join(exePath, 'downloads')
if (!existsSync(DOWNLOADS)) {
    mkdirSync(DOWNLOADS);
}

function extract(zipPath, output, win) {
    return new Promise(resolve => {
        const worker = new Worker(path.join(APP_PATH, 'extractWorker.js'), { workerData: { zipPath, output } });

        worker.on('message', (result) => {
            if (result.success === true) {
                resolve(true)
                win.webContents.send('log', result.message);
            } else {
                win.webContents.send('error', result.message);
            }
        });

        worker.on('error', (error) => {
            win.webContents.send('error', `Worker error: ${error.message}`);
            resolve(false)
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                win.webContents.send('error', `Worker stopped with exit code ${code}`);
            }
            resolve(false)
        });
    })
}

async function getInstallRecipie(mod, win) {
    try {
        const recipie_url = `${TAA_API}/${mod}`
        const response = await fetch(recipie_url)
        if (!response.ok) {
            throw new Error(`${recipie_url} ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        win.webContents.send('error', error.message)
        return {notgood:true}
    }
}

function download(url, DOWNLOADS, name, win) {

    return new Promise((resolve, reject) => {
        try {
            ([http, https])[url.startsWith('https') ? 1 : 0].get(url, (response) => {
                if (response.statusCode !== 200) {
                    win.webContents.send('error', `${url} ${response.statusCode}`)
                    win.webContents.send('unlock')
                    reject(`Failed to download file. Status code: ${response.statusCode}`);
                    return;
                }
                
                const filepath = path.join(DOWNLOADS, name);
                const fileStream = createWriteStream(filepath);
    
                response.pipe(fileStream)
    
                response.on('end', () => {
                    fileStream.end()
                    win.webContents.send('log', `${url} downloaded`)
                    resolve(`File downloaded to ${filepath}`);
                })
    
                response.on('error', (error) => {
                    win.webContents.send('unlock')
                    reject(`Error while downloading file: ${error.message}`);
                })
            })
            return true
        } catch (error) {
            win.webContents.send('unlock')
            win.webContents.send('error', `${url} ${error.message}`)
            return false
        }
    });
}

function downloaded(filename, filehash, win) {
    console.log('checking hash', filename, filehash)
    return new Promise(resolve => {
        const filepath = path.join(DOWNLOADS, filename)
        const fileExists = existsSync(filepath)
        if(!fileExists) return resolve(false)
        if(statSync(filepath).size==0) {
            win.webContents.send('error', `Corrupted file, downloading again`)
            return resolve(false)
        }
        win.webContents.send('log', `Checking file hash ${filename}`)
        const hash = crypto.createHash('sha256')
        const stream = createReadStream(filepath)

        stream.on('error', (error) => {
            reject(error);
        });
        stream.on('data', (data) => {
            hash.update(data);
        });
        stream.on('end', () => {
            const checksum = hash.digest('hex')
            console.log('our hash', checksum)
            const isFile = checksum == filehash
            if(isFile) return resolve(true)
            win.webContents.send('error', `${filename} hash incorrect, downloading again`)
            resolve(false)
        })
    })
}

module.exports = async (mod, dir, win) => {
    win.webContents.send('lock');
    if(readdirSync(dir).length != 0) {
        win.webContents.send('error', 'target dir must be empty')
        return win.webContents.send('unlock')
    } 

    win.webContents.send('log', `Getting recipie for ${mod}`)
    const recipie = await getInstallRecipie(mod, win)

    if(recipie?.notgood) {
        win.webContents.send('log', `Install failed`)
        return win.webContents.send('unlock')
    }

    for(const [name, data] of Object.entries(recipie)) {

        if(await downloaded(name, data.hash, win)) {
            win.webContents.send('log', `Downloaded ${name}`)

            const zip_location = path.join(DOWNLOADS, name)
            win.webContents.send('log', `Extracting ${name}`)
            await extract(zip_location, dir, win)
            continue
        }

        win.webContents.send('log', `Downloading ${name}`)
        const success = await download(data.url, DOWNLOADS, name, win)
        if(!success) {
            win.webContents.send('error', `unable to download ingredient ${name}`)
            return win.webContents.send('unlock')
        } 

        if(!await downloaded(name, data.hash, win)) { //verify file is downloaded once more before continueing
            win.webContents.send('error', `unable to verify ingredient ${name}`)
            return win.webContents.send('unlock')
        }

        const zip_location = path.join(DOWNLOADS, name)
        win.webContents.send('log', `Extracting ${name}`)
        await extract(zip_location, dir, win)
    }

    win.webContents.send('unlock')
    win.webContents.send('created')
    win.webContents.send('log', `${mod} Succesfully created at ${dir}`)
}