#TAAnywhere - Install any mod of TA on any device

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
yarn start
```

To build
```bash
yarn make
```

(If you don't have yarn, `npm install -global yarn`)

#how I set up the API endpoint

api endpoint is set in `shared.json` file in `/src`
this is the server source `npm install express bodyparser`
The client will only request win32.10 and win32.xp for windows but otherwise is simply `process.platform`
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
});
```

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
        "OTA.zip" : {
              "mirrors" : ["http://212.71.238.61:9001/OTA.zip"],
              "folders": [],
              "hash" : "1108bcb0b5aeaf816d92c1d0f20f22a0c5accecea92d1ad79205582b738ef51b"
          },
        "ProTA.zip" : {
            "mirrors" : ["https://prota.tauniverse.com/ProTA4.5.zip"],
            "folders": [],
            "hash" : "025c3c79560b64d9b8f43c27490889b3eb8ef62454310970bea09e49d36af63d"
        }
    }
}
```
