

const botgram = require("botgram")
var sharp = require('sharp');
var fs = require('fs');
var request = require('request');
var Jimp = require('jimp');
var http = require('http');
var Stream = require('stream').Transform;
//var fs = require('fs');
var fs = require('fs-extra');
var geo = require('./GeoCompute')
sharp.cache(false);

const bot = botgram("1016820507:AAEB2FIcO-tvMkGRVykdDYUq-hnuht7uWNA")

//Testee_botbot
//const bot = botgram("1031143021:AAEFdSnIkS5pznXPBy9t-N5f5PRqj-p6eC4")
var timeManager = {
    //predefined deduction
    deductMinutes: 0,
    lastUpdatedTime: "0000",
    lastDownloadedTime: "0000"
};

//useless sleep?!
async function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}
async function downloadImage(filename) {
    let date_ob = new Date();
    //setting GMT +8
    //date_ob.setHours(date_ob.getHours() + 8)
    date_ob.setHours(date_ob.getHours())

    do {
        console.log("Executing Do Loop for downloading of new images");
        date_ob.setMinutes(date_ob.getMinutes() - timeManager.deductMinutes)
        // adjust 0 before single digit date
        let date = ("0" + date_ob.getDate()).slice(-2);
        // current month
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
        // current year
        let year = date_ob.getFullYear();
        // current hours
        let hours = date_ob.getHours();
        if (hours < 10) {
            hours = "0" + hours;
        }
        // current minutes
        let minutes = date_ob.getMinutes();
        //minutesLO = minutes % 5
        minutes = minutes - (minutes % 5)
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        var uri = 'http://www.weather.gov.sg/files/rainarea/50km/v2/dpsri_70km_' + year + month + date + hours + minutes + '0000dBR.dpsri.png';
        console.log(uri);

        var promise1 = new Promise(function (resolve, reject) {
            request.head(uri, function (err, res, body) {
                //check for err
                if (err) {
                    console.log(err)
                    reject(err);
                }
                console.log("Status code: " + res.statusCode);
                console.log("datetime: " + year + month + date + hours + minutes);
                //stuck here
                if (res.statusCode === 200) {
                    request(uri).pipe(fs.createWriteStream(filename)).on('close', () => {
                        timeManager.lastDownloadedTime = String(hours + "" + minutes)
                        fs.copySync(filename, './downloadedImage.png');
                        console.log("lastDownloadedTime updated with: ", timeManager.lastDownloadedTime)
                        timeManager.deductMinutes = 0;
                        resolve();
                    });
                }
                else {
                    timeManager.deductMinutes = 5;
                    resolve();
                }
            })
        });
        const value = await promise1
        console.log("deductMinutes checker: ", timeManager.deductMinutes)
        await sleep(5000);
    } while (timeManager.deductMinutes > 0)
};

// console.log("testing download");
//downloadImage('./Images/currentWeather.png').then(() => console.log('Initial Run ', new Date()));

console.log("Bot Started @", Date());
//Pre Cached images
setInterval(() => {
    console.log("-----Fetching images-----")
    let date_ob = new Date();
    //setting GMT +8
    //date_ob.setHours(date_ob.getHours() + 8)
    date_ob.setHours(date_ob.getHours())
    let hours = date_ob.getHours();
    if (hours < 10) {
        hours = "0" + hours;
    }
    // current minutes
    let minutes = date_ob.getMinutes();
    minutes = minutes - (minutes % 5)
    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    downloadImage('./Images/currentWeather.png')
        .then(() => {
            console.log('Image successfully downloaded @ ', new Date())
            console.log("currentWeather download done, and exist? -", fs.existsSync('./Images/currentWeather.png'));

            //setOpacity
            Jimp.read('./Images/currentWeather.png').then(data => {
                //setOpacity and then write to a new fileName currentWeatherOpacitySet
                return data.opacity(0.35).write('./Images/currentWeatherOpacitySet.png', () => {
                    //ammend currentWeather found into proper size
                    sharp("./Images/currentWeatherOpacitySet.png")
                        .resize(853, 479)
                        .png()
                        //save the amended currentWeather as currentWeatherNew
                        .toFile("./Images/currentWeatherNew.png", () => {
                            //merge all the files when it is done.
                            sharp("./assets/base-853.png")
                                .composite([{ input: "./Images/currentWeatherNew.png", gravity: "northwest" }, { input: "./assets/MRT.png", gravity: "northwest" }, { input: "./assets/rain-intensity.jpg", gravity: "south" }])
                                .jpeg()
                                .toFile("./Images/" + timeManager.lastDownloadedTime + ".jpg", () => {
                                    timeManager.lastUpdatedTime = timeManager.lastDownloadedTime;
                                    console.log("Image merged @", Date());
                                    console.log("-----Download completed here-----");
                                })

                        })
                })
            })

        })
    //setting interval at 6mins each time
}, 180000)

//Documentation
bot.command("start", "help", (msg, reply) => {
    reply.text("The following are the commands to check out rain areas in Singapore:\n/rainCheck - Get rain updates\n/setInterval <1-24> - Setting interval updates of rain areas (e.g., /setInterval 1)\n/stopInterval - Terminate interval updates\n/autoAlerts <0-23> - Starting Auto alerts to be sent by the HOUR clock (e.g., /autoAlert 5)\n/stopAutoAlert - Terminating all AutoAlert scheduled\n/findHDBCarpark - Look for the nearest HDB carparks and its details (PRIVATE CHAT ONLY)")
})

//basic Rain Area check
bot.command("rainCheck", (msg, reply, next) => {
    console.log("##### " + msg.chat.name, "submitted a request for rain updates on:", Date(), "#####");
    reply.text("Rain areas in Singapore loading, please wait...");
    var stream = fs.createReadStream("./Images/" + timeManager.lastUpdatedTime + ".jpg");
    reply.photo(stream, "Hello " + msg.chat.name + ", here's the latest rain conditions. Last updated @ " + timeManager.lastUpdatedTime + "hrs.");
})


bot.context({
    onInterval: false,
    HoursToAlert: [],
    lastSent: 1,
    presses: 0,
    msgId: null
});
//setting Interval hours to send updates
bot.command("setInterval", (msg, reply, next) => {

    console.log("##### " + msg.chat.name + " submitted a request scheduled updates on:", Date(), "#####");
    //enable Interval
    msg.context.onInterval = true;
    if (isNaN(parseInt(msg.args(2))) || parseInt(msg.args(2)) > 24) {
        reply.text("Your interval duration should be below 24 hours and a number, try again.");
        return;
    }
    else {
        msg.Interval = parseInt(msg.args(2))
        reply.text("Scheduled rain areas updates at every: " + msg.Interval + " hour.")
        //engage Loop for Interval sendings
        engageLoop(reply, msg);
    }
})
//Sending intervals by Hours
async function engageLoop(reply, msg) {
    while (msg.context.onInterval) {
        //setting interval of hours into ms
        await sleep(msg.Interval * 3600000)
        if (msg.context.onInterval) {
            reply.text("Rain areas in Singapore loading, please wait...");
            var stream = fs.createReadStream("./Images/" + timeManager.lastUpdatedTime + ".jpg");
            reply.photo(stream, "Hello " + msg.chat.name + ", here's the latest rain conditions. Last updated @ " + timeManager.lastUpdatedTime + "hrs.");
        }
    }
}
bot.command("stopInterval", (msg, reply, next) => {
    //disable Interval
    msg.context.onInterval = false;
    reply.text("Stopped Interval");
});

//setting up AutoAlerts by the hour-clock
bot.command("AutoAlert", (msg, reply, next) => {

    console.log("##### " + msg.chat.name, "submitted a request for AutoAlert:", Date(), "#####");
    //enable Interval
    if (isNaN(parseInt(msg.args(2))) || parseInt(msg.args(2)) > 24) {
        reply.text("Your interval duration should be below 24 hours or a number, try again.");
        return;
    }
    else if (msg.context.HoursToAlert.includes(parseInt(msg.args(2)))) {
        reply.text("Hour " + parseInt(msg.args(2)) + " has already been added.");
        return;
    }
    else {
        if (msg.context.HoursToAlert.length < 1) {

            msg.context.HoursToAlert = [];
            msg.context.HoursToAlert.push(parseInt(msg.args(2)))
            reply.text("Adding HOUR " + parseInt(msg.args(2)) + ", into Auto Alert.")
            reply.text("Starting Auto Alerts")
            //engage Loop for Interval sendings
            engageAlert(reply, msg);
        } else {
            msg.context.HoursToAlert.push(parseInt(msg.args(2)))
            reply.text("Adding HOUR " + parseInt(msg.args(2)) + ", into Auto Alert.")
        }
    }
})
//Sending AutoAlerts
async function engageAlert(reply, msg) {
    console.log("-----Engaing auto alerts-----")
    while (msg.context.HoursToAlert.length >= 1) {
        //check for time every 15mins
        await sleep(900000)
        if (msg.context.HoursToAlert.length >= 1 && msg.context.HoursToAlert.includes(new Date().getHours()) && new Date().getHours() !== msg.context.lastSent) {
            console.log("-----Auto alert sent @", Date(), "-----")
            reply.text("Auto alert for rain areas generating...");
            var stream = fs.createReadStream("./Images/" + timeManager.lastUpdatedTime + ".jpg");
            reply.photo(stream, "Here's the latest rain conditions. Last updated @ " + timeManager.lastUpdatedTime + "hrs.");
            msg.context.lastSent = new Date().getHours();
        }
    }
}
bot.command("stopAutoAlert", (msg, reply, next) => {
    //disable autoAlerts by clearing array
    msg.context.HoursToAlert = [];
    reply.text("Auto alerts has been stopped and cleared.");
    console.log("-----Disengaing auto alerts-----")
});
bot.command("contextinfo", (msg, reply, next) => {
    reply.text("onInterval: " + msg.context.onInterval + "\nHoursToAlert: " + msg.context.HoursToAlert + "\nlastSent: " + msg.context.lastSent + "\nPresses: " + msg.context.presses + "\nmsgId: " + msg.context.msgId)
    console.log(msg.context);
})

bot.command("findHDBCarpark", (msg, reply, next) => {
    reply.selective(false);
    msg.context.msgId = msg.id;
    var keyboard1 = [
        [{ text: "Send my location", request: "location" }]
    ];
    // Display the keyboard
    reply.keyboard(keyboard1, true).text("What are you right now?").then((error, result) => {
        if (error) {
            console.log("Encountered an error during keyboard creation for user: " + msg.chat.name + " / @" + msg.chat.username)
            return;
        }
        reply.keyboard().text("Location sent!");
    })
})

bot.all(function (msg, reply, next) {
    console.log("##### " + msg.chat.name, "submitted a request for findHDBCarpark @", Date(), "#####");
    // If we didn't echo this message, we can't edit it either
    if (!msg.context.msgId === msg.id) return;
    // If this is a text message, edit it
    if (msg.type === "location") {
        //console.log("User's location: " + msg.latitude + " : " + msg.longitude);
        var NearestCarpark = [];
        for (var index = 0; index < geo.MyData.length; index++) {
            var distance = geo.converter.calcDistance(msg.latitude, msg.longitude, geo.MyData[index].lat, geo.MyData[index].long, "K")
            //Checking if the distance between the carpark searching is below 1KM
            if (distance <= 1) {
                geo.MyData[index].distance = Math.round(distance * 100) / 100
                NearestCarpark.push(geo.MyData[index]);
            }
        }
        NearestCarpark.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        //concatenate result strings
        var msgResult = "5 Nearest carpark\n";
        for (var i = 0; i < 5; i++) {
            msgResult += "----- Carpark: " + (i + 1) + " -----\n"
            msgResult += "Address: <a href =\'https://www.google.com/maps/search/?api=1&query=" + NearestCarpark[i].lat + "," + NearestCarpark[i].long + "\'>" + NearestCarpark[i].address + "</a>\n"
            msgResult += "Carpark Type: " + NearestCarpark[i].carpark_Type + "\n"
            msgResult += "Payment Mode: " + NearestCarpark[i].payment_mode + "\n"
            msgResult += "Parking Type: " + NearestCarpark[i].shortterm_parking + "\n"
            msgResult += "Distance: " + NearestCarpark[i].distance + "km\n\n"
        }
        //console.log(bot);
        reply.disablePreview(true);
        reply.html(msgResult)
        msg.context.msgId = null;
    }
});
//any other commands
bot.command((msg, reply) => {
    reply.text("Please refer to the commands available from /start");
})