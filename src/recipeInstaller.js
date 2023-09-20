const getPlatform  = require('./getPlatform.js');
const { install } = require('./recipeHandler.js');
const api_endpoint = require('./shared.json').endpoint

async function getInstallRecipie(mod) {
    const platform = await getPlatform();
    const recipe_url = `${api_endpoint}/recipe/${platform}/${mod}`
    const response = await fetch(recipe_url)
    if (!response.ok) 
        return(new Error(`${recipe_url} ${response.status}`))

    try {
        const recipie = await response.json()
        if(recipie) return recipie
    } catch (err) {
        return new Error(`${mod} : ${err.message}`)
    }
}

async function installMod(mod, target, window) {

    window.webContents.send('lock')

    const MOD_recipe = await getInstallRecipie(mod)

    if(MOD_recipe instanceof Error) {
        window.webContents.send('error', `Error downloading recipe ${MOD_recipe.message}`)
        window.webContents.send('unlock')
        return -1
    }

    const install_status = await install(MOD_recipe, target, window);
    window.webContents.send('unlock')
    if(install_status === 1) window.webContents.send('success')
}

module.exports = { installMod }


