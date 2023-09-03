Warning currently no API server set up to host recipes that the mods use, and currently there isn't a hosted OTA zip

```bash
git clone https://github.com/frogbean/TAAnywhere
cd .\TAAnywhere\
npm install
npm start
```

API Server end point specified on line 10 of install.js
API Select's specified on line 28 of index.html

API End point should look something like this 

```js
const recipies = require('./recipies.json');
app.get('/taa/recipie/:mod', (req, res) => {
    console.log('Request recevied request for', req.params.mod, 'recipe')
    const recipie = recipies?.[req.params.mod]
    res.json(recipie);
});
```

With the recipies.json looking like this (hashes are sha256
```js
{
    "OTA" : {
        "OTA.zip" : {
            "url" : "http://127.0.0.1:8125/OTA.zip",
            "hash" : "1108bcb0b5aeaf816d92c1d0f20f22a0c5accecea92d1ad79205582b738ef51b"
        }
    },
    "ProTA" : {
        "OTA.zip" : {
            "url" : "http://127.0.0.1:8125/OTA.zip",
            "hash" : "1108bcb0b5aeaf816d92c1d0f20f22a0c5accecea92d1ad79205582b738ef51b"
        },
        "ProTA.zip" : {
            "url" : "https://prota.tauniverse.com/ProTA4.5.zip",
            "hash" : "025c3c79560b64d9b8f43c27490889b3eb8ef62454310970bea09e49d36af63d"
        }
    }
}
```

Build using 
```bash
electron-builder
```

If you do not have electron-builder, 
```bash
npm install electron-builder -g
```
