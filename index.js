

const botgram = require("botgram")
var sharp = require('sharp');
var fs = require('fs');
var request = require('request');
var Jimp = require('jimp');
var http = require('http');
var Stream = require('stream').Transform;
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
    lastDownloadedTime: "0000",
    BotStartTime: null,
    motd: ""
};

//useless sleep
async function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}
async function downloadImage(filename) {
    let date_ob = new Date();
    //setting GMT +8
    //date_ob.setHours(date_ob.getHours() + 8)
    date_ob.setHours(date_ob.getHours())

    do {
        //console.log("Executing Do Loop for downloading of new images");
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
        //console.log(uri);

        var promise1 = new Promise(function (resolve, reject) {
            request.head(uri, function (err, res, body) {
                //check for err
                if (err) {
                    console.log(err)
                    reject(err);
                }
                //console.log("Status code: " + res.statusCode);
                //console.log("datetime: " + year + month + date + hours + minutes);
                //stuck here
                if (res.statusCode === 200) {
                    request(uri).pipe(fs.createWriteStream(filename)).on('close', () => {
                        timeManager.lastDownloadedTime = String(hours + "" + minutes)
                        fs.copySync(filename, './downloadedImage.png');
                        //console.log("lastDownloadedTime updated with: ", timeManager.lastDownloadedTime)
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
        //console.log("deductMinutes checker: ", timeManager.deductMinutes)
        await sleep(5000);
    } while (timeManager.deductMinutes > 0)
};


//Pre Cached images
setInterval(() => {
    //console.log("-----Fetching images-----")
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
            //console.log('Image successfully downloaded @ ', new Date())
            //console.log("currentWeather download done, and exist? -", fs.existsSync('./Images/currentWeather.png'));

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
                                    //console.log("Image merged @", Date());
                                    //console.log("-----Download completed here-----");
                                })

                        })
                })
            })

        })
    //setting interval at 6mins each time
}, 180000)

bot.on("ready", function () {
    console.log("Bot Started @", Date());
    timeManager.BotStartTime = Date();
});

bot.context({
    onInterval: 0,
    HoursToAlert: [],
    lastSent: 1,
    msgId: null,
    NotifiedChat: false
});

//Documentation
bot.command("start", "help", (msg, reply) => {
    reply.silent(true).text("The following are the commands to check out rain areas in Singapore:\n/rainCheck - Get rain updates\n/setInterval <1-24> - Setting interval updates of rain areas (e.g., /setInterval 1)\n/stopInterval - Terminate interval updates\n/autoAlerts <0-23> - Starting Auto alerts to be sent by the HOUR clock (e.g., /autoAlert 5 or /autoalert 12,14,16)\n/stopAutoAlert - Terminating all AutoAlert scheduled\n/findHDBCarpark - Look for the nearest HDB carparks and its details (PRIVATE CHAT ONLY)")
})

//Documentation
bot.command("setMOTD", (msg, reply) => {
    timeManager.motd = String(msg.args(1)).split("<br/>").join("\n");
    reply.html("MOTD set:\n" + timeManager.motd)
})

bot.all(function (msg, reply, next) {
    console.log(msg)
    if (msg.context.NotifiedChat === 0) {
        msg.context.NotifiedChat = false;
    }
    //Disclaimer message
    if (msg.context.NotifiedChat === false) {
        msg.context.NotifiedChat = true;
        reply.text("[NOTICE] @SG_RainBot has recently been updated, kindly re-setup auto alerts if any.\n\nIf you're a rider (bike or bicycle), we have recently developed a new bot that is more inclined to Riders themselves!\n\nCheck out @RidersAssistBot\n\n")
        if (timeManager.motd !== "") {
            reply.text(timeManager.motd[0])
        }
    }
    // If we didn't echo this message, we can't edit it either
    if (!msg.context.msgId === msg.id) return;
    // If this is a text message, edit it
    if (msg.type === "location") {
        //removing keyboard
        reply.keyboard().text("Location sent!");
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
            msgResult += "Short Parking: " + NearestCarpark[i].shortterm_parking + "\n"
            msgResult += "Distance: " + NearestCarpark[i].distance + "km\n\n"
        }
        //console.log(bot);
        reply.disablePreview(true);
        reply.html(msgResult)
        msg.context.msgId = null;
    }
    next();
});
//basic Rain Area check
bot.command("rainCheck", (msg, reply, next) => {
    console.log("##### " + msg.from.username, "submitted a request for rain updates on:", Date(), "#####");
    reply.silent(true).text("Rain areas in Singapore loading, please wait...");
    var stream = fs.createReadStream("./Images/" + timeManager.lastUpdatedTime + ".jpg");
    reply.photo(stream, "Hello " + msg.chat.name + ", here's the latest rain conditions. Last updated @ " + timeManager.lastUpdatedTime + "hrs.");
})
//setting Interval hours to send updates
bot.command("setInterval", (msg, reply, next) => {
    console.log("##### " + msg.from.username + " submitted a request interval updates on:", Date(), "#####");
    //enable Interval
    if (isNaN(parseInt(msg.args(2))) || parseInt(msg.args(2)) > 24 || parseInt(msg.args(2)) < 1) {
        reply.text("Your interval duration should be above 0, below 24 hours and is a number, try again.");
        return;
    }
    else if (msg.context.onInterval > 0) {
        msg.context.onInterval = parseInt(msg.args(2))
        reply.silent(true).text("Ongoing interval update found, setting interval value with latest value.")

    }
    else {
        msg.context.onInterval = parseInt(msg.args(2))
        reply.text("Scheduled rain areas updates at every: " + msg.context.onInterval + " hour.")
        //engage Loop for Interval sendings
        engageLoop(reply, msg);
    }
})
//Sending intervals by Hours
async function engageLoop(reply, msg) {
    try {
        while (msg.context.onInterval >= 1) {
            //setting interval of hours into ms
            //console.log(msg.Interval)
            await sleep(msg.context.onInterval * 3600000)
            //await sleep(10000)
            if (msg.context.onInterval >= 1) {
                reply.silent(true).text("Rain areas in Singapore loading, please wait...").then((err, result) => {
                    if (err) {
                        console.error("Error on engageLoop @ " + Date())
                        msg.context.onInterval = 0
                        return;
                    }
                    else {
                        var stream = fs.createReadStream("./Images/" + timeManager.lastUpdatedTime + ".jpg");
                        reply.photo(stream, "Hello " + msg.chat.name + ", here's the latest rain conditions. Last updated @ " + timeManager.lastUpdatedTime + "hrs.");
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error on engageLoop @ " + Date())
        msg.context.onInterval = 0
        return;
    }
}
bot.command("stopInterval", (msg, reply, next) => {
    //disable Interval
    if (msg.context.onInterval === 0) {
        reply.silent(true).text("There is no ongoing interval alerts.")
        return;
    };
    msg.context.onInterval = 0
    reply.silent(true).text("Interval alerts has been stopped and cleared.");
    return;
});

//setting up AutoAlerts by the hour-clock
bot.command("AutoAlert", (msg, reply, next) => {
    console.log("##### " + msg.from.name, "submitted a request for AutoAlert:", Date(), "#####");
    var msgResponseArray = msg.args(1).toString().replace(/ /g, '').split(",")
    if (msgResponseArray.length === 1) {
        //AutoAlert checks
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
                reply.text("Adding HOUR " + parseInt(msg.args(2)) + " into Auto Alert.")
                reply.text("Starting Auto Alerts")
                //engage Loop for Interval sendings
                engageAlert(reply, msg);
            } else {
                msg.context.HoursToAlert.push(parseInt(msg.args(2)))
                reply.text("Adding HOUR " + parseInt(msg.args(2)) + " into Auto Alert.")
            }
        }
    } else {
        if (msg.context.HoursToAlert.length < 1) {
            msg.context.HoursToAlert = [];
            var TempArray = [];
            msgResponseArray.forEach((item) => {
                if (isNaN(item) || item > 24) {
                    reply.text(item + " is not a valid hour. 0-24 only.")
                    return;
                }
                if (!TempArray.includes(parseInt(item))) {
                    TempArray.push(parseInt(item));
                }
            })
            msg.context.HoursToAlert = TempArray;
            reply.text("Added HOURS: " + TempArray + " into Auto Alert.")
            reply.text("Starting Auto Alerts")
            //engage Loop for Interval sendings
            engageAlert(reply, msg);
        } else {
            var TempArray = [];
            msgResponseArray.forEach((item) => {
                if (isNaN(item) || item > 24) {
                    reply.text(item + " is not a valid hour. 0-24 only.")
                    return;
                }
                if (!TempArray.includes(parseInt(item))) {
                    TempArray.push(parseInt(item));
                }
            })
            //console.log(TempArray)
            msg.context.HoursToAlert = TempArray;
            reply.text("Finished resetting hours with your setting " + TempArray + " into Auto Alert.")
        }
    }
})

//Sending AutoAlerts
async function engageAlert(reply, msg) {
    try {
        //console.log("-----Engaing auto alerts-----")
        while (msg.context.HoursToAlert.length >= 1) {
            //check for time every 15mins
            await sleep(900000)
            if (msg.context.HoursToAlert.length >= 1 && msg.context.HoursToAlert.includes(new Date().getHours()) && new Date().getHours() !== msg.context.lastSent) {
                //console.log("-----Auto alert sent @", Date(), "-----")
                reply.silent(true).text("Auto alert for rain areas generating...")
                    .then((err, result) => {
                        if (err) {
                            console.error("Error on engageAlert @ " + Date())
                            msg.context.HoursToAlert = [];
                            return;
                        }
                        else {
                            var stream = fs.createReadStream("./Images/" + timeManager.lastUpdatedTime + ".jpg");
                            reply.photo(stream, "Here's the latest rain conditions. Last updated @ " + timeManager.lastUpdatedTime + "hrs.");
                            msg.context.lastSent = new Date().getHours();
                        }
                    });
            }
        }
    } catch (error) {
        console.error("Error on engageAlert @ " + Date())
        return;
    }
}
//Stopping autoalerts
bot.command("stopAutoAlert", (msg, reply, next) => {
    //disable autoAlerts by clearing array
    if (msg.context.HoursToAlert === [] || "undefined" !== typeof (msg.context["HoursToAlert"])) {
        reply.silent(true).text("There is no ongoing Auto alerts.")
        return;
    };
    msg.context.HoursToAlert = []
    reply.text("Auto alerts has been stopped and cleared.");
    //console.log("-----Disengaing auto alerts-----")
});

bot.command("findHDBCarpark", (msg, reply, next) => {
    console.log("##### " + msg.from.username, "submitted a request for findHDBCarpark @", Date(), "#####");
    if (msg.chat.type !== "user") {
        reply.silent(true).text("[INFO] Searching for nearest HDB carparks is available only on private chats.")
        return
    }
    reply.selective(false);
    msg.context.msgId = msg.id;
    var keyboard1 = [
        [{ text: "Send my location", request: "location" }]
    ];
    // Display the keyboard
    reply.keyboard(keyboard1, true).text("Where are you right now?").then((error, result) => {
        if (error) {
            console.error("Encountered an error during keyboard creation for user: " + msg.chat.name + " / @" + msg.from.username)
            return;
        }
    })
})
// bot.command("feedback", (msg, reply) => {
//     reply.text("Thank you for your feedback and support of the bot.")
// })
bot.command("diag", (msg, reply, next) => {
    reply.text("onInterval: " + msg.context.onInterval + "\nHoursToAlert: " + msg.context.HoursToAlert + "\nlastSent: " + msg.context.lastSent + "\nmsgId: " + msg.context.msgId + "\nBot last started: " + timeManager.BotStartTime + "\nBot Datetime: " + Date() + "\nNotifiedChat: " + msg.context.NotifiedChat)
})

//any other commands
// bot.command((msg, reply) => {
//     reply.silent(true).text("Please refer to the commands available from /start");
// })