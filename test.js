const { VoipList } = require('twilio/lib/rest/api/v2010/account/availablePhoneNumber/voip');

var express = require('express');

require('dotenv').config()

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const twilio = require('twilio')(accountSid, authToken);

async function voice_call() {
    ret = await twilio.calls
      .create({
         url: 'http://hcvy4.asuscomm.com/respondToVoiceCall',
         to: '+972 52-543-3124',
         from: '+13158884144'
       })
    console.log(ret.sid)
    //   .then(call => console.log(call.sid));
}

var app = express();
app.use(express.urlencoded());
app.listen(8081)

// Create a route to respond to a call
app.post('/respondToVoiceCall', function(req, res) {
    //Validate that this request really came from Twilio...
    if (twilio.validateExpressRequest(req, authToken)) {
        var twiml = new twilio.TwimlResponse();

        twiml.say('Testing')
            .play('http://demo.twilio.com/docs/classic.mp3');

        res.type('text/xml');
        res.send(twiml.toString());
    }
    else {
        res.send('you are not twilio.  Buzz off.');
    }
});

(async () => {
    await voice_call()
})();
