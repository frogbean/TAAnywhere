const { parentPort, workerData } = require('worker_threads');
const AdmZip = require('adm-zip');

const { zipPath, output } = workerData;

const zip = new AdmZip(zipPath);

try {
    zip.extractAllTo(output, /*overwrite*/ true);
    parentPort.postMessage({ success: true, message: `success: ${zipPath} \n-> ${output}` });
} catch (error) {
    parentPort.postMessage({ success: false, message: `zip extract ${zipPath} ${error.message}` });
}