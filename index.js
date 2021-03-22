const pubSubHubbub = require('pubsubhubbub');
const express = require('express')
const port = 8081
const convert = require('xml-js');
const fs = require('fs');
// const app = express()
const dateformat = require('dateformat');
const axios = require('axios').default;
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

async function send_slack(message) {
    return (await axios.post(process.env.SLACK_URL,
        {"text": message}
    )).status
}

var options = {
    callbackUrl: process.env.PUBLIC_URL
}

var pubSubSubscriber = pubSubHubbub.createServer(options);

// UCXuqSBlHAE6Xw-yeJA0Tunw == LTT
// UCh4p_IOyN-xxfZKW1rHdnEQ == Personal test channel
var topics = ["https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCh4p_IOyN-xxfZKW1rHdnEQ",
    "https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCXuqSBlHAE6Xw-yeJA0Tunw"];
var hub = "http://pubsubhubbub.appspot.com";

var db = new JsonDB(new Config("db.JSON", true, true, '/'));


pubSubSubscriber.on("subscribe", function (data) {
    console.log(data.topic + " subscribed");
});

pubSubSubscriber.on("unsubscribe", function (data) {
    console.log(data.topic + " unsubscribed");
});

pubSubSubscriber.on("feed", function (data) {
    console.log("Topic: '" + data.topic + "' notification:");
    // console.log(data.feed.toString())
    var jsonObj = convert.xml2js(data.feed.toString(), {compact: true})
    if (jsonObj.feed.entry) {
        try {
            db.getData(`/${jsonObj.feed.entry.id._text}`)
        }
        catch (error) {
            console.log(`Video Title: ${jsonObj.feed.entry.title._text}\nUploadTime: ${dateformat(jsonObj.feed.entry.published._text, 'dddd, mmmm dS, yyyy, h:MM:ss TT')}\nLink: ${jsonObj.feed.entry.link._attributes.href}`)
            send_slack(`Video Title: ${jsonObj.feed.entry.title._text}\nUploadTime: ${dateformat(jsonObj.feed.entry.published._text, 'dddd, mmmm dS, yyyy, h:MM:ss TT')}\nLink: ${jsonObj.feed.entry.link._attributes.href}`).then(
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


pubSubSubscriber.listen(8081);

// If we want to use express..
// app.use("/pubsubhubbub", pubSubSubscriber.listener());
// app.listen(port, () => {
//     console.log("")
//     return ""
// })

// I guess this is to initialize a subscription from our end
pubSubSubscriber.on("listen", function () {
    topics.forEach(topic => {
        pubSubSubscriber.subscribe(topic, hub, options.callbackUrl, function (err) {
            if (err) {
                console.log("Failed subscribing");
            } else {
                console.log("subscribing..?");
            }
        });
    })
});
