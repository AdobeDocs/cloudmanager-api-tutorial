const express    = require('express'),
      bodyParser = require('body-parser'),
      crypto     = require("crypto"),
      jsrsasign  = require("jsrsasign")
      fetch      = require("node-fetch");

const { URLSearchParams } = require('url');

require('dotenv').config();

const app = express();

const EXPIRATION = 24*60*60; // 24 hours

const imsEndpoint = process.env.IMS_ENDPOINT ? process.env.IMS_ENDPOINT : "ims-na1.adobelogin.com";
const cloudmanagerClaim = process.env.CLOUDMANAGER_CLAIM ? process.env.CLOUDMANAGER_CLAIM : "https://ims-na1.adobelogin.com/s/ent_cloudmgr_sdk";

async function getAccessToken() {
    const header = {
        "alg" : "RS256",
        "typ" : "JWT"
    };

    const payload = {
        "exp" : Math.round(new Date().getTime() / 1000) + EXPIRATION,
        "iss" : process.env.ORGANIZATION_ID,
        "sub" : process.env.TECHNICAL_ACCOUNT_ID,
        "aud" : `https://${imsEndpoint}/c/${process.env.API_KEY}`
    };

    payload[cloudmanagerClaim] = true;

    const jwtToken = jsrsasign.jws.JWS.sign("RS256", JSON.stringify(header), JSON.stringify(payload), process.env.PRIVATE_KEY);

    const response = await fetch(`https://${imsEndpoint}/ims/exchange/jwt/`, {
        method: "POST",
        body: new URLSearchParams({
            "client_id": process.env.API_KEY,
            "client_secret": process.env.CLIENT_SECRET,
            "jwt_token": jwtToken
        })
    });

    const json = await response.json();
    
    return json["access_token"];
}

async function makeApiCall(accessToken, url, method) {
    const response = await fetch(url, {
        "method": method,
        "headers": {
            "x-gw-ims-org-id": process.env.ORGANIZATION_ID,
            "x-api-key": process.env.API_KEY,
            "Authorization": `Bearer ${accessToken}`
        }
    });

    return await response.json();
}

async function getExecution(executionUrl) {
    const accessToken = await getAccessToken();

    return await makeApiCall(accessToken, executionUrl, "GET");
}

app.use(bodyParser.json({
    verify: (req, res, buf, encoding) => {
      const signature = req.get("x-adobe-signature");
      if (signature) {
        const hmac = crypto.createHmac('sha256', process.env.CLIENT_SECRET)
        hmac.update(buf);
        const digest = hmac.digest('base64');
  
        if (signature !== digest) {
          throw new Error('x-adobe-signature HMAC check failed')
        }
      }
    }
  }));

app.get('/webhook', (req, res) => {
  if (req.query["challenge"]){
    res.send(req.query['challenge']);
  } else {
    console.log("No challenge");
    res.status(400);
  }
});

app.post('/webhook', (req, res) => { 
  console.log(req.body);
  res.writeHead(200, { 'Content-Type': 'application/text' });
  res.end("pong");

  if (req.header("x-adobe-event-code") === "pipeline_execution_start") {
    console.log("received execution start event");
    getExecution(req.body["event"]["activitystreams:object"]["@id"]).then(execution => {
      console.log(`Execution ${execution.id} started`);
    });
  }

});

var listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
