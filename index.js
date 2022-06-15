require('dotenv').config()
const pubSubHubbub = require('pubsubhubbub');
const express = require('express')
const convert = require('xml-js');
const fs = require('fs');
const app = express()
const dateformat = require('dateformat');
const axios = require('axios').default;
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

const port = process.env.PORT || 8080

const twilio_accounts = JSON.parse(fs.readFileSync('.twilio'))
const twilio_callback_url = twilio_accounts.TWILIO_CALLBACK_URL;

const twilio = require('twilio');
twilio_accounts.accounts.forEach(account => {
    const accountSid = account.TWILIO_ACCOUNT_SID;
    const authToken = account.TWILIO_AUTH_TOKEN;
    account.client = twilio(accountSid, authToken);
})

async function voice_call() {
    if (twilio_accounts && twilio_accounts.accounts) {
        twilio_accounts.accounts.forEach(async account => {
            const twilio_client = account.client
            ret = await twilio_client.calls
                .create({
                    url: twilio_callback_url,
                    to: account.TWILIO_TO,
                    from: account.TWILIO_FROM
                })
            console.log("called '" + account.TWILIO_TO + "' with sid: " + ret.sid + "for account: " + account.name)
            //   .then(call => console.log(call.sid));
        })
    }
}

async function send_slack(message) {
    if (process.env.SLACK_URL) {
        return (await axios.post(process.env.SLACK_URL,
            { "text": message }
        )).status
    }
}

async function send_rest(message) {
    if (process.env.REST_URL) {
        return (await axios.post(process.env.REST_URL,
            { "message_type": "CRITICAL", "state_message": message, "entity_display_name": "NEW LTT VIDEO!!!" }
        )).status
    }
}

var options = {
    callbackUrl: process.env.PUBLIC_URL
}

var pubSubSubscriber = pubSubHubbub.createServer(options);

// UCXuqSBlHAE6Xw-yeJA0Tunw == LTT
// UCh4p_IOyN-xxfZKW1rHdnEQ == Personal test channel
// UC-cxH25dCbYUfoAAdB6Tthg == Brand account test channel
var topics = ["https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCh4p_IOyN-xxfZKW1rHdnEQ",
    "https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCXuqSBlHAE6Xw-yeJA0Tunw",
    "https://www.youtube.com/xml/feeds/videos.xml?channel_id=UC-cxH25dCbYUfoAAdB6Tthg"];
var hub = "http://pubsubhubbub.appspot.com";

var db = new JsonDB(new Config("db/db.json", true, true, '/'));


pubSubSubscriber.on("subscribe", function (data) {
    console.log(data.topic + " subscribed");
});

pubSubSubscriber.on("unsubscribe", function (data) {
    console.log(data.topic + " unsubscribed");
});

pubSubSubscriber.on("feed", function (data) {
    console.log("Topic: '" + data.topic + "' notification:");
    // console.log(data.feed.toString())
    var jsonObj = convert.xml2js(data.feed.toString(), { compact: true })
    if (jsonObj.feed.entry) {
        db.reload();
        try {
            db.getData(`/${jsonObj.feed.entry.id._text}`)
        }
        catch (error) {
            var message = `Video Title: ${jsonObj.feed.entry.title._text}\nUploadTime: ${dateformat(jsonObj.feed.entry.published._text, 'dddd, mmmm dS, yyyy, h:MM:ss TT')}\nLink: ${jsonObj.feed.entry.link._attributes.href}`
            console.log(message)

            voice_call().then().catch()

            // send_rest(message).then(
            //     (res) => {
            //         console.log(res)
            //     }).catch(err => {
            //         console.log(err)
            //     })

            send_slack(message).then(
                (res) => {
                    console.log(res)
                }).catch(err => {
                    console.log(err)
                })
            db.push(`/${jsonObj.feed.entry.id._text}`, true)
        }
    } else {
        console.log(`Unknown feed notification:\n${JSON.stringify(jsonObj)}`)
    }

});


// pubSubSubscriber.listen(port);

// I guess this is to initialize a subscription from our end
pubSubSubscriber.on("listen", function () {
    topics.forEach(topic => {
        pubSubSubscriber.subscribe(topic, hub, options.callbackUrl, function (err) {
            if (err) {
                console.log(`Failed subscribing to.. ${topic}, Error ${err}`);
            } else {
                console.log(`subscribing to.. ${topic}`);
            }
        });
    })
});

// Create a route to respond to a call
app.all('/respondToVoiceCall', function (req, res) {
    //Validate that this request really came from Twilio...
    // if (twilio.validateExpressRequest(req, authToken)) {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('New LTT Video!');
    twiml.play('http://demo.twilio.com/docs/classic.mp3');
    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());
    // }
    // else {
    //     res.send('you are not twilio.  Buzz off.');
    // }
});
// If we want to use express..
app.use("/pubsubhubhub", pubSubSubscriber.listener());
app.use(express.urlencoded());
app.listen(port)

topics.forEach(topic => {
    pubSubSubscriber.subscribe(topic, hub, options.callbackUrl, function (err) {
        if (err) {
            console.log(`Failed subscribing to.. ${topic}, Error ${err}`);
        } else {
            console.log(`subscribing to.. ${topic}`);
        }
    });
})


