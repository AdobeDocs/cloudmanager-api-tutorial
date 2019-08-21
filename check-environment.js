const jsrsasign = require('jsrsasign')
const fetch = require('node-fetch')

const { URLSearchParams } = require('url')

require('dotenv').config()

async function getAccessToken () {
  const EXPIRATION = 60 * 60 // 1 hour

  const header = {
    'alg': 'RS256',
    'typ': 'JWT'
  }

  const payload = {
    'exp': Math.round(new Date().getTime() / 1000) + EXPIRATION,
    'iss': process.env.ORGANIZATION_ID,
    'sub': process.env.TECHNICAL_ACCOUNT_ID,
    'aud': `https://ims-na1.adobelogin.com/c/${process.env.API_KEY}`,
    'https://ims-na1.adobelogin.com/s/ent_cloudmgr_sdk': true
  }

  const jwtToken = jsrsasign.jws.JWS.sign('RS256', JSON.stringify(header), JSON.stringify(payload), process.env.PRIVATE_KEY)

  const response = await fetch('https://ims-na1.adobelogin.com/ims/exchange/jwt', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.API_KEY,
      client_secret: process.env.CLIENT_SECRET,
      jwt_token: jwtToken
    })
  })

  const json = await response.json()

  return json['access_token']
}

async function makeApiCall (accessToken, url, method) {
  const response = await fetch(url, {
    'method': method,
    'headers': {
      'x-gw-ims-org-id': process.env.ORGANIZATION_ID,
      'x-api-key': process.env.API_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  return response.ok && response.json()
}

async function checkEnvironment () {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('Could not obtain accessToken')
  } else {
    console.log(`obtained access token ${accessToken}`)
    const programs = await makeApiCall(accessToken, 'https://cloudmanager.adobe.io/api/programs', 'GET')
    if (!programs) {
      throw new Error('Could not list programs')
    } else {
      console.log(`listed programs ${JSON.stringify(programs)}`)
    }
  }
}

checkEnvironment().then(() => console.log('checked.')).catch(err => console.error(err))
