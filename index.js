const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const ngrok = require('@ngrok/ngrok');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

let response_data = null;
const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;

const sendMessage = async (psid, message) => {
  const accessToken = pageAccessToken
  await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`, {
    recipient: {
      id: psid
    },
    message: {
      text: message
    }
  });
}

app.listen(3000, '', () => {
  console.log('Server is running on port 3000');
})
ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
ngrok.connect({ addr: 3000, domain: process.env.NGROK_STATIC_DOMAIN })
	.then(listener => console.log(`Ingress established at: ${listener.url()}`));

app.get('/facebook/webhook', async (req, res) => {
  const query = req.query;
  const hubMode = query['hub.mode'];
  const hubVerifyToken = query['hub.verify_token'];
  const hubChallenge = query['hub.challenge'];
  if (hubMode && hubVerifyToken) {
    if (hubMode === 'subscribe' && hubVerifyToken === 'bombotdev') {
      return res.status(200).send(hubChallenge);
    } else {
      return res.status(403).json({error: 'Failed to verify token'});
    }
  }

  return res.status(400).json({error: 'Bad request'});
})

app.post('/facebook/webhook', async (req, res) => {
  const body = req.body;
  response_data = body;
  const weatherTemp = await axios.get('https://weathernews.com/weather/en/vn/cGxhY2UuNTE0NDQsMTAuOTQ3ODAwLDEwNi44MTkzMTU=/')
  .then(response => {
    const regexp = /<p class="high" data-v-e230813b>(.*?)<\/p>/g
    const matches = regexp.exec(response.data)[1];
    return matches;
  })
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[ 0];
      const senderPsid = webhookEvent.sender.id;
      if (webhookEvent.message) { 
        const message = webhookEvent.message.text.toLowerCase();
        if (message === 'hi' || message === 'hello') {
          sendMessage(senderPsid, "Hello, how can I help you?");
        }
        if (message === 'bye') {
          sendMessage(senderPsid, "Goodbye, see you later!");
        }
        if (message === 'weather') {
          
          sendMessage(senderPsid, "The temp of Bien Hoa, Vietnam is " + weatherTemp + 'C');
        }
      }
    });
    return res.status(200).send('EVENT_RECEIVED');
  } else {
    return res.status(404).send('Not found');
  }
  
})

app.get('/data', async (req, res) => {
  const weatherTemp = await axios.get('https://weathernews.com/weather/en/vn/cGxhY2UuNTE0NDQsMTAuOTQ3ODAwLDEwNi44MTkzMTU=/')
  .then(response => {
    const regexp = /<p class="high" data-v-e230813b>(.*?)<\/p>/g
    const matches = regexp.exec(response.data)[1];
    return matches;
  })
  console.log(weatherTemp);
  return res.status(200).send(weatherTemp);
})

app.get('/', async (req, res) => {
  res.status(404).send('Not found');
})