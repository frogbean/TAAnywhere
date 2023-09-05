Grab this repo
```bash
git clone https://github.com/frogbean/TAAnywhere
```

Install the dependencies
```bash
cd .\TAAnywhere\
npm install
```

To test
```bash
npm start
```

To build
```bash
electron-builder build
```


For details on how I set up the API endpoint, this is the server source (npm install express)
```js
const recipes = {
  "win32.10": require('./win32.10.json'),
  "linux": require('./linux.json'),
};

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 9000; 
app.use(bodyParser.json());

// Middleware to log uncaught requests
app.use((req, res, next) => {
  console.log(`Uncaught request URL: ${req.originalUrl}`);
  next(); // Pass the request to the next middleware or route handler
});

app.get('/taa/list/:platform', (req, res) => {
  console.log('Request recevied request listing mods on', req.params.platform)
  const available = Object.keys(recipes?.[req.params.platform])
  console.log('Sending', available)
  res.json({available});
})

app.get('/taa/recipe/:platform/:mod', (req, res) => {
    console.log('Request recevied request for', req.params.mod, 'recipe for', req.params.platform)
    const recipe = recipes?.[req.params.platform]?.[req.params.mod]
    console.log('platform recipes', recipes?.[req.params.platform])
    console.log('Sending', recipe)
    res.json(recipe);
});

// Start the Express server
app.listen(port, () => {
  console.log('Hosting', recipes, `\nServer is running on http://localhost:${port}`);
});```

And this is what win32.10.json looks like (use win32.7 for windows 7)

```json
{
    "OTA" : {
        "OTA.zip" : {
            "mirrors" : ["http://212.71.238.61:9001/OTA.zip"],
            "folders": [],
            "hash" : "1108bcb0b5aeaf816d92c1d0f20f22a0c5accecea92d1ad79205582b738ef51b"
        }
    },
    "ProTA" : {
        "ProTA.zip" : {
            "mirrors" : ["https://prota.tauniverse.com/ProTA4.5.zip"],
            "folders": [],
            "hash" : "025c3c79560b64d9b8f43c27490889b3eb8ef62454310970bea09e49d36af63d"
        }
    },
    "ESC" : {
        "TAESC_GOLD_9_9_5.zip" : {
            "mirrors" : ["http://212.71.238.61:9001/TAESC_GOLD_9_9_5.zip"],
            "folders": [
                "Step_2_Install Main Files (copy all contents into your main TA folder)",
                "Step_3_Install For Windows 8 or 10 or 11 or LINUX only (do not use with DXWND or Windows 7!)\\Windows 8 or 10 or 11\\"
            ],
            "hash" : "4d39fac2b2c4ef6724ba755bf6879d27611e73ad6884d44b1ca1ea8712ecebbe"
        }
    }
}```