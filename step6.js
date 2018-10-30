const express    = require('express'),
      bodyParser = require('body-parser'),
      crypto     = require("crypto"),
      jsrsasign  = require("jsrsasign")
      fetch      = require("node-fetch");

const { URLSearchParams, URL } = require('url');

require('dotenv').config();

const app = express();

async function getAccessToken() {
  const EXPIRATION = 60*60; // 1 hour

  const header = {
    "alg" : "RS256",
    "typ" : "JWT"
  };

  const payload = {
    "exp" : Math.round(new Date().getTime() / 1000) + EXPIRATION,
    "iss" : process.env.ORGANIZATION_ID,
    "sub" : process.env.TECHNICAL_ACCOUNT_ID,
    "aud" : `https://ims-na1.adobelogin.com/c/${process.env.API_KEY}`,
    "https://ims-na1.adobelogin.com/s/ent_cloudmgr_sdk" : true
  };

  const jwtToken = jsrsasign.jws.JWS.sign("RS256", JSON.stringify(header), JSON.stringify(payload), process.env.PRIVATE_KEY);

  const response = await fetch("https://ims-na1.adobelogin.com/ims/exchange/jwt", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.API_KEY,
      client_secret: process.env.CLIENT_SECRET,
      jwt_token: jwtToken
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

function getLink(obj, linkType) {
  return obj["_links"][linkType].href;
}

async function getExecution(executionUrl) {
  const accessToken = await getAccessToken();

  const execution = await makeApiCall(accessToken, executionUrl, "GET");

  const program = await makeApiCall(accessToken, new URL(getLink(execution, "http://ns.adobe.com/adobecloud/rel/program"), executionUrl));

  execution.program = program;

  return execution;
}

app.use(bodyParser.json({
    verify: (req, res, buf, encoding) => {
      const signature = req.header("x-adobe-signature");
      if (signature) {
        const hmac = crypto.createHmac('sha256', process.env.CLIENT_SECRET);
        hmac.update(buf);
        const digest = hmac.digest('base64');
  
        if (signature !== digest) {
          throw new Error('x-adobe-signature HMAC check failed');
        }
      } else if (!process.env.DEBUG && req.method === "POST") {
        throw new Error('x-adobe-signature required');
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
  res.writeHead(200, { 'Content-Type': 'application/text' });
  res.end("pong");

  const STARTED = "https://ns.adobe.com/experience/cloudmanager/event/started";
  const EXECUTION = "https://ns.adobe.com/experience/cloudmanager/pipeline-execution";

  const event = req.body.event;

  if (STARTED === event["@type"] &&
       EXECUTION === event["xdmEventEnvelope:objectType"]) {
    console.log("received execution start event");

    const executionUrl = event["activitystreams:object"]["@id"];

    getExecution(executionUrl).then(execution => {
      console.log(`Execution for ${execution.program.name} started`);
    });
  }

});

var listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
