const fetch = require('node-fetch')

require('dotenv').config()

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

async function makeApiCall (accessToken, url, method) {
  const response = await fetch(url, {
    'method': method,
    'headers': {
      'x-gw-ims-org-id': process.env.ORGANIZATION_ID,
      'x-api-key': process.env.CLIENT_ID,
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
