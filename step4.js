const express = require('express')
const bodyParser = require('body-parser')

require('dotenv').config()

const app = express()

async function getAccessToken () {
  const form = new FormData();
  form.append('client_id', process.env.CLIENT_ID);
  form.append('client_secret', process.env.CLIENT_SECRET);
  form.append('grant_type', process.env.GRANT_TYPE);
  form.append('scope', process.env.SCOPES);

  const response = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    'method': 'POST',
    'headers': { 'Content-Type': 'application/x-www-form-urlencoded' },
    'body': form
  })
  if (!response.ok) {
    throw new Error('Failed to get access token');
  }
  const responseData = await response.json();
  return responseData.access_token;
}

// Getting JWT access token
/*
 * const fs = require('fs')
 * const fetch = require('node-fetch')
 * async function getAccessToken () {
 *   const config = {
 *     clientId: process.env.CLIENT_ID,
 *     technicalAccountId: process.env.TECHNICAL_ACCOUNT_ID,
 *     orgId: process.env.ORGANIZATION_ID,
 *     clientSecret: process.env.CLIENT_SECRET,
 *     metaScopes: [ 'ent_cloudmgr_sdk' ]
 *   }
 *   config.privateKey = fs.readFileSync('.data/private.key')
 *
 *   const { access_token } = await auth(config)
 *   return access_token
 * }
 */

app.use(bodyParser.json())

app.get('/webhook', (req, res) => {
  if (req.query['challenge']) {
    res.set('Content-Type', 'text/plain')
    res.send(req.query['challenge'])
  } else {
    console.log('No challenge')
    res.status(400)
    res.end()
  }
})

app.post('/webhook', (req, res) => {
  if (process.env.CLIENT_ID !== req.body.recipient_client_id) {
    console.warn(`Unexpected client id. Was expecting ${process.env.CLIENT_ID} and received ${req.body.recipient_client_id}`)
    res.status(400)
    res.end()
    return
  }
  res.set('Content-Type', 'text/plain')
  res.send('pong')

  const STARTED = 'https://ns.adobe.com/experience/cloudmanager/event/started'
  const EXECUTION = 'https://ns.adobe.com/experience/cloudmanager/pipeline-execution'

  const event = req.body.event

  if (STARTED === event['@type'] &&
       EXECUTION === event['xdmEventEnvelope:objectType']) {
    console.log('received execution start event')
    getAccessToken().then(accessToken => {
      console.log(accessToken)
    })
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`)
})
