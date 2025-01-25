const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const ngrok = require('@ngrok/ngrok');
const knex = require('knex');
require('dotenv').config();

const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: true
  }
}
const database = knex(dbConfig);
database.raw('SELECT 1')
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Error connecting to the database:', error.message);
  });

const app = express();
app.use(cors());
app.use(bodyParser.json());

let response_data = null;
const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
const PORT = process.env.PORT || 3000;

const sendMessage = async (psid, pageId, message) => {
  // const accessToken = pageAccessToken
  const accessToken = await database('fanpages').where('id', pageId).select('accessToken').first()
  .then(data => data.accessToken)
  .catch(error => {
    console.error('Error:', error.message);
    return null;
  });
  await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`, {
    recipient: {
      id: psid
    },
    message: {
      text: message
    }
  }).catch(error => {
    console.log('Error:', error.message);
  })
}

app.listen(PORT, '', () => {
  console.log('Server is running on port', PORT);
})
// ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
// ngrok.connect({ addr: 3000, domain: process.env.NGROK_STATIC_DOMAIN })
// 	.then(listener => console.log(`Ingress established at: ${listener.url()}`));

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
    const regexp = /<p class="temp" data-v-e230813b>(.*?)<s/g
    const matches = regexp.exec(response.data)[1];
    return matches;
  })
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[ 0];
      const senderPsid = webhookEvent.sender.id;
      const pageId = webhookEvent.recipient.id;
      if (webhookEvent.message) { 
        const message = webhookEvent.message.text.toLowerCase();
        console.log('User Message:', message);
        if (message === 'hi' || message === 'hello') {
          sendMessage(senderPsid, pageId, "Hello, how can I help you?");
        }
        else if (message === 'bye') {
          sendMessage(senderPsid, pageId, "Goodbye, see you later!");
        }
        else if (message === 'weather') {
          sendMessage(senderPsid, pageId, "The temp of Bien Hoa, Vietnam is " + weatherTemp + 'C');
        }
        else {
          sendMessage(senderPsid, pageId, "Sorry, I don't support this command");
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
    const regexp = /<p class="temp" data-v-e230813b>(.*?)<s/g
    const matches = regexp.exec(response.data)[1];
    return matches;
  })
  console.log(weatherTemp);
  return res.status(200).send(weatherTemp);
})


app.post('/facebook/addPageData', async (req, res) => {
  const body = req.body;
  const pageId = body.pageId;
  const pageAccessToken = body.pageAccessToken;

  if (!pageId || !pageAccessToken) {
    return res.status(400).send('Bad request');
  }

  const result = await database('fanpages').insert({
    id: pageId,
    accessToken: pageAccessToken
  }).onConflict('id').merge()
  .then(() => true)
  .catch((error) => {
    console.error('Error:', error.message);
    return false;
  });
  
  return res.status(200).json({success: result});
})

app.get('/facebook/get2faTestAccount', async (req, res) => {
  const result = await axios.get('https://thanhlike.com/modun/tool/get_facebook.php?type=get2fa&code=FLU7JIXJ7RAZ4KHOIDQ7Q357EP6IQG55')
  .then(response => response.data)
  .catch(error => {
    console.error('Error:', error.message);
    return null;
  });
  return res.status(200).json({code: result});
})

app.get('/', async (req, res) => {
  res.status(404).send('Not found');
})