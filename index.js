

const botgram = require("botgram")
var sharp = require('sharp');
var fs = require('fs');
var request = require('request');
var Jimp = require('jimp');
var http = require('http');
var Stream = require('stream').Transform;
var fs = require('fs');

const bot = botgram("1016820507:AAEB2FIcO-tvMkGRVykdDYUq-hnuht7uWNA")

var timeManager = {
    //predefined deduction
    deductMinutes: 0,
    lastUpdatedTime: "0000"
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
                        timeManager.lastUpdatedTime = String(hours + "" + minutes)
                        console.log("lastUpdatedTime updated with: ", timeManager.lastUpdatedTime)
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
        //await sleep(2000);
    } while (timeManager.deductMinutes > 0)
};

// console.log("testing download");
// downloadImage('./Images/currentWeather.png').then(() => console.log('Image successfully downloaded @ ', new Date()));


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
            console.log("./Images/" + String(hours + "" + minutes) + ".jpg")
            //if (timeManager.lastUpdatedTime !== String(hours+""+minutes)) {

            //setOpacity
            Jimp.read('./Images/currentWeather.png').then(data => {
                //setOpacity and then write to a new fileName currentWeatherOpacitySet
                data.opacity(0.35).write('./Images/currentWeatherOpacitySet.png')
                console.log("currentWeather DONE!")
            }).then(() => {
                //ammend currentWeather found into proper size
                sharp("./Images/currentWeatherOpacitySet.png")
                    .resize(853, 479)
                    //save the ammended currentWeather as currentWeatherNew
                    .toFile("./Images/currentWeatherNew.png", () => {
                        console.log("currentWeatherNew DONE!")
                        //merge all the files when it is done.
                        sharp("./assets/base-853.png")
                            .composite([{ input: "./Images/currentWeatherNew.png", gravity: "northwest" }, { input: "./assets/MRT.png", gravity: "northwest" }])
                            .toFile("./Images/" + timeManager.lastUpdatedTime + ".jpg")
                            .then(() => {
                                console.log("-----Download completed here-----");
                            })
                    })
            })
            //}
        })
    //setting interval at 6mins each time
}, 30000)

bot.command("start", "help", (msg, reply) => {

    reply.text("The following are the commands to check out rain areas in Singapore:\n/CheckMeOut")
})

bot.command("CheckMeOut", (msg, reply, next) => {
    reply.text("Image loading, please wait...");
    var stream = fs.createReadStream("./Images/" + timeManager.lastUpdatedTime + ".jpg");
    reply.photo(stream, msg.chat.name + ", here's the update. Latest update @ " + timeManager.lastUpdatedTime + "hrs.");

})

bot.command((msg, reply) => {
    console.log("Testing!");
    reply.text("Invalid command.");
})