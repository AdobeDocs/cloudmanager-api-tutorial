const express = require('express')
const bodyParser = require('body-parser')
const auth = require('@adobe/jwt-auth')
const fs = require('fs')

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
