const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');

function rmdir(directoryPath, dontDeleteFolder = false) {
    if (!fs.existsSync(directoryPath)) return;
    if (!dontDeleteFolder) fs.rmdirSync(directoryPath, { recursive: true });
    else for(const file of fs.readdirSync(directoryPath)) {
        const filePath = `${directoryPath}/${file}`;
        if (fs.lstatSync(filePath).isDirectory()) rmdir(filePath);
        else fs.unlinkSync(filePath);
    }
}

const getPlatform = require('./getPlatform.js')
const recipeApiEndpoint = require('./shared.json').endpoint

function randomString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < 32; i++) 
        randomString += characters.charAt(Math.floor(Math.random() * characters.length));

    return randomString;
}

function prettyPath(path) {
    return path.split('\\').map(folder => folder.length > 16 ? folder.slice(0, 16) + ' ... ' : folder).slice(-2).join('\\')
}

if( isMainThread ) {

    /* This is the start of the worker, this script runs in the main thread when we import this file in our electron app */

    const { app } = require('electron');
    const exePath = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;

    /**
     * Installs a recipe by spawning a worker process to download and install files.
     *
     * @param {Object} recipe - A JSON object representing the recipe with file details.
     * @param {String} where - A string specifying where to unpack the recipe to
     * @param {electron.BrowserWindow} [window] - An Optional Electron BrowserWindow instance for 'log' and 'error' posts.
     * @returns {Promise<number>} A Promise that resolves with the installation status:
     *   - 1: Installation successful.
     *   - -1: Installation failed.
     */
    function install(recipe, where, window = {}) {
        return new Promise(async resolve => {
            let status = 0
            const platform = await getPlatform()
            const workerData = { exePath, recipe, where, platform, recipeApiEndpoint }

            const extractWorker = new Worker(__filename, {workerData: {...workerData, workerType: 'extract'}})
            const downloadWorker = new Worker(__filename, {workerData: {...workerData, workerType: 'download'}})

            extractWorker.on('message', message => {
                if(typeof message === 'string') return window?.webContents.send('log', `Extracter: ${message}`)
                if(message instanceof Error) return window?.webContents.send('error', `Extracter: ${message.message}`)
                if(message?.status) return status = message.status
                if(message?.interWorkerCom) downloadWorker.postMessage(message.interWorkerCom)
            })

            extractWorker.on('error', error => {
                console.error(error.message, error.stack);
                window?.webContents.send('error', `${error.message}\n${error.stack}`)
                status = -1
            })

            downloadWorker.on('message', message => {
                if(typeof message === 'string') return window?.webContents.send('log', `Downloader: ${message}`)
                if(message instanceof Error) return window?.webContents.send('error', `Downloader: ${message.message}`)
                if(message?.status) return status = message.status
                if(message?.interWorkerCom) extractWorker.postMessage(message.interWorkerCom)
            })

            downloadWorker.on('error', error => {
                console.error(error.message, error.stack);
                console.log(JSON.stringify(error))
                window?.webContents.send('error', `${error.message}\n${error.stack}`)
                status = -1
            })

            while(status === 0) await sleep(10)

            if(status === 1) {
                window.webContents.send('log', 'Mod installed successfully')
                window.webContents.send('created')
            } else {
                window.webContents.send('error', `code ${status}, install not complete`)
            }
            
            if(status === -1) rmdir(where, true); //true to just empty instead of delete
            resolve(status)
        })
    }

    module.exports = { install } //export our install function

} 

/* 
    This section runs in 2 seperate threeads, extracter and downloader, we can only communicate with our electron app
    by first posting a message to our main thread, then passing that on to the electron window 
    parentPort.postMessage 
        -> Strings get sent to the GUI app
        -> instanceof Error get sent to GUI app as an Error
        -> Objects get processed
            status: terminates the main process, use for completion
            interWorkerCom: object pasted between workers

*/

else {

    const { exePath, workerType, where } = workerData;
    const tempPath = path.join(exePath, 'temp');
    const download_folder = path.join(exePath, 'downloads');

    fs.mkdir(tempPath, { recursive: true }, (err) => {
        //if (err) parentPort.postMessage((new Error(`Error making ${tempPath} ${err.message}`))) 
    })

    fs.mkdir(download_folder, { recursive: true }, (err) => {
        //if (err) parentPort.postMessage((new Error(`Error making ${download_folder} ${err.message}`))) 
    })
    
    if(workerType === 'extract') {

        const { execFileSync } = require('child_process');
        const Seven = require('7zip-bin');

        rmdir(tempPath);

        function extract(source, path) {
            if(terminate_signal) return -1;
            parentPort.postMessage(`Extracting ${prettyPath(source)} to ${prettyPath(path)}`);
            
            try {
                execFileSync(Seven.path7za, ['x', source, '-o' + path], { stdio: 'ignore' });
                parentPort.postMessage(`${prettyPath(source)} done`);
            } catch (err) {
                parentPort.postMessage(new Error(`Cannot extract ${err.message}`));
                return -1
            }
            return 1
        }

         /* Install que example {step: int, zip: dir, folders: []} */
        const install_que = [];
        let current_install_step = 1, terminate_signal = 0;

        parentPort.on('message', interWorkerCom => {
            if(interWorkerCom === -1) return terminate_signal = 1; 
            const { installQueItem } = interWorkerCom;
            install_que.push(installQueItem)
        })

        async function getNextIngredient() {
            while(true) {
                for(const que_item of install_que)
                    if(que_item.step === current_install_step)
                        return que_item

                await sleep(25)
            }
        }

        async function installer() {
            while(true) {
                const ingredient = await getNextIngredient();

                const { step, zip, folders } = ingredient;
                const stepPath = path.join(tempPath, step + '');

                if(extract(zip, stepPath) === -1) {
                    parentPort.postMessage((new Error(`Aborting install due to bad file ${prettyPath(zip)}`)))
                    parentPort.postMessage({status: -1})
                    return -1;
                }

                await sleep(100);

                try {
                    if(folders.length === 0) {
                        if(terminate_signal) return;
                        parentPort.postMessage(`Copying ${prettyPath(stepPath)} to ${prettyPath(where)}`)
                        await fs.promises.cp(stepPath, where, {recursive: true})
                    }
                    else for(const folder of folders) {
                        if(terminate_signal) return;
                        const subStepPath = path.join(stepPath, folder)
                        parentPort.postMessage(`Copying ${prettyPath(subStepPath)} to ${prettyPath(where)}`)
                        await fs.promises.cp(subStepPath, where, {recursive: true})
                    }
                }
                catch (err) { parentPort.postMessage((new Error(`Failed to copy ${stepPath} ${err.message}`))); return -1; /* job err */}
                await sleep(100);

                parentPort.postMessage({interWorkerCom: { step_completed : current_install_step }}) 
                current_install_step ++;
            }
        }

        //start installer cycle
        installer();

    } else if(workerType === 'download') {

        const crypto = require('crypto');
        const http = require('http'); 
        const https = require('https');

        function verify(filepath, filehash) {

            if(!fs.existsSync(filepath)) return false;

            return new Promise(resolve => {
                const sha256 = crypto.createHash('sha256')
                const stream = fs.createReadStream(filepath)

                stream.on('error', err => {
                    parentPort.postMessage((new Error(`hash stream error ${err.message}`)))
                    resolve(err)
                });

                stream.on('data', data => sha256.update(data));

                const potentialFilename = filepath.split('\\').pop()

                stream.on('end', () => {
                    const checksum = sha256.digest('hex')
                    if(checksum == filehash) {
                        parentPort.postMessage(`${potentialFilename} hash verified`)
                        return resolve(true)
                    }
                    parentPort.postMessage((new Error(`${potentialFilename} hash incorrect`)))
                    resolve(false)
                })
            })
        }

        /*
            The recipe book contains at least one entry and are to be installed in the order they are listed as
            { fileName : { mirrors: [], folders: [], hash: "" }
        */

        const { recipe } = workerData

        async function download(url, save_location) {

            let download_status = 0;

            const protocol = ([https, http])[url.startsWith('https') ? 0 : 1]
            protocol.get(url, response => {
                if (response.statusCode !== 200) return download_status = -1;
                const fileStream = fs.createWriteStream(save_location);

                const doTotal = ('content-length' in response.headers) ? true : false;
                const progress_id = randomString();
                const totalSize = parseInt(response.headers['content-length'], 10);
                const startTime = Date.now();
                const fileName = url.split('/').pop();
                let downloadedSize = 0;

                let modulas = 0;

                function bitsToMBytes(bits) {
                    return (bits / 1e6).toFixed(2) + ' Mb'
                }

                response.on('data', data => {
                    fileStream.write(data);
                    downloadedSize += data.length;
                    modulas++;
                    if(modulas % 1000 != 0 && totalSize != downloadedSize) return
                    const elapsedTime = (Date.now() - startTime) / 1000;
                    const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
                    const averageMbps = ((downloadedSize / elapsedTime) / 1e6 * 8).toFixed(2);
                    const progress_msg = `progress_id::${progress_id}::${fileName} ${bitsToMBytes(downloadedSize)} / ${doTotal ? bitsToMBytes(totalSize) : 'Unknown'} | ${doTotal ? progress : 'Unknown'}% | ${averageMbps} mbps`
                    parentPort.postMessage(progress_msg)
                });
                
                response.on('end', () => {
                    fileStream.end()
                    download_status = 1;
                })
    
                response.on('error', err => {
                    parentPort.postMessage((new Error(`url get error ${err.message}`)))
                    download_status = -2;
                })
            })

            while(download_status === 0) await sleep(10);
            return download_status;

        }

        async function downloader(mirrors, filename, filehash) {

            const save_location = path.join(download_folder, filename);
            if(await verify(save_location, filehash)) return 1

            for(const mirror of mirrors) {
                try { await download(mirror, save_location) }
                catch (err) { parentPort.postMessage((new Error(`Failed to download ${mirror} ${err.message}`))); continue }

                if(await verify(save_location, filehash)) { parentPort.postMessage(`${filename} downloaded`); return 1; }

                parentPort.postMessage((new Error(`${filename} failed sha256 verification`)))

                let unlink_status = 0;

                fs.unlink(save_location, err => {
                    if (err) {
                        unlink_status = -2;
                        return parentPort.postMessage((new Error(`${filename} fatal error, inccorect hash and cannot delete file due to ${err.message}`)))
                    }
                    else unlink_status = 1;
                })

                while(unlink_status === 0) await sleep(25);
                if(unlink_status < 0) return unlink_status;

                try { await download(mirror, save_location) }
                catch (err) { parentPort.postMessage((new Error(`Failed to download ${mirror} ${err.message}`))); continue }
                if(await verify(save_location, filehash)) { parentPort.postMessage(`${filename} downloaded`); return 1; }
                parentPort.postMessage(`${mirror} bad file`)
            }

            parentPort.postMessage({interWorkerCom: -1})
            return parentPort.postMessage({status: -1}) //failed to download a file
        }

        let step = 1, step_progress = {}
        const com_map = new Map();
        /* Install que example {step: int, zip: dir, folders: []} */   
        for(const [filename, ingredient] of Object.entries(recipe)) {


            const { mirrors, folders, hash } = ingredient;

            const map_id = filename + folders.join();
            const zip = path.join(download_folder, filename)
            const installQueItem = {step, zip, folders}
            const interWorkerCom = { installQueItem }
            com_map.set(map_id, { interWorkerCom })
            step_progress[step] = false;
            step ++;

            downloader(mirrors, filename, hash).then(status => {
                if(status < 0) {
                    parentPort.postMessage((new Error(`Fatal install error ${status}, cannot download ingredient`)))
                    parentPort.postMessage({interWorkerCom: -1})
                    parentPort.postMessage({status: -1}) //terminates the main install function
                }
                parentPort.postMessage(com_map.get(map_id))
            })
        }

        parentPort.on('message', interWorkerCom => {
            const { step_completed } = interWorkerCom;
            step_progress[step_completed] = true
        })
    
        async function waitOnComplete() {
    
            function is_completed() {
                for(const step_status of Object.values(step_progress))
                    if(step_status === false) return false
                return true
            }
    
            while(true && !is_completed()) await sleep(25);
            parentPort.postMessage({status: 1}) //Fuck yeah we did it
            rmdir(tempPath);
        }
        
        waitOnComplete();

    }

}