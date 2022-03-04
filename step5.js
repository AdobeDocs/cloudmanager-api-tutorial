const express = require('express')
const bodyParser = require('body-parser')
const auth = require('@adobe/jwt-auth')
const fs = require('fs')
const fetch = require('node-fetch')

require('dotenv').config()

const app = express()

async function getAccessToken () {
  const config = {
    clientId: process.env.CLIENT_ID,
    technicalAccountId: process.env.TECHNICAL_ACCOUNT_ID,
    orgId: process.env.ORGANIZATION_ID,
    clientSecret: process.env.CLIENT_SECRET,
    metaScopes: [ 'ent_cloudmgr_sdk' ]
  }
  config.privateKey = fs.readFileSync('.data/private.key')

  const { access_token } = await auth(config)
  return access_token  
}

async function makeApiCall (accessToken, url, method) {
  const response = await fetch(url, {
    'method': method,
    'headers': {
      'x-gw-ims-org-id': process.env.ORGANIZATION_ID,
      'x-api-key': process.env.CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  return response.json()
}

async function getExecution (executionUrl) {
  const accessToken = await getAccessToken()

  return makeApiCall(accessToken, executionUrl, 'GET')
}

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

    const executionUrl = event['activitystreams:object']['@id']

    getExecution(executionUrl).then(execution => {
      console.log(`Execution ${execution.id} started`)
    })
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`)
})
