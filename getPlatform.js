module.exports = () => new Promise(resolve => {

    if(process.platform !== 'win32') return resolve(process.platform)

    require('child_process').exec('ver', (e,s) => {
        try {
            const ver = parseInt(s.split('[')[1].split(' ')[1].split('.')[0]);
            resolve(`${process.platform}.${ver > 7 ? 10 : 7}`)
        } catch (error) {
            resolve(`${process.platform}.10`)
        }
    })
})