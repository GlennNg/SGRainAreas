

const botgram = require("botgram")
var sharp = require('sharp');
var fs = require('fs')
var request = require('request');
var Jimp = require('jimp');
const bot = botgram("1016820507:AAEB2FIcO-tvMkGRVykdDYUq-hnuht7uWNA")


var http = require('http'),
    Stream = require('stream').Transform,
    fs = require('fs');




bot.command("start", "help", (msg, reply) =>
    reply.text("The following are the commands to check out rain areas in Singapore:\n /CheckMeOut"))

bot.command("CheckMeOut", (msg, reply, next) => {
    reply.text("The image is loading... please wait...");

    let date_ob = new Date();
    date_ob.setHours(date_ob.getHours()+8)
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

    //console.log("unrounded of minutes == " + minutes)
    minutesLO = minutes % 5
    minutes = minutes - minutesLO
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    //console.log("rounded of minutes == " + minutes)

    var url = 'http://www.weather.gov.sg/files/rainarea/50km/v2/dpsri_70km_' + year + month + date + hours + minutes + '0000dBR.dpsri.png';
    //console.log(url);

    var download = function (uri, filename, callback) {
	reply.text("Information given below is still in development and may not be accurate");
	console.log("Update requested by: " + msg.chat.name);
        request.head(uri, function (err, res, body) {
            //console.log('content-type:', res.headers['content-type']);
            //console.log('content-length:', res.headers['content-length']);
            console.log(res.statusCode);
            //console.log("User request from: http://t.me/" + msg.chat.username)
            if (res.statusCode === 404) {
                console.log("Fetching cached @ " + hours +minutes);
                var stream = fs.createReadStream("./Images/Cached.jpg");
                reply.photo(stream, msg.chat.name + ", here's your update. Notice: NEA haven't update. Hence, this is an old update we have");
                return;
            }
            request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
        });
    };

    download(url, './Images/currentWeather.png', () => {
        //console.log("Fetching no problem.");

        Jimp.read('./Images/currentWeather.png')
            .then(data => {
                data
                    .opacity(0.35)
                    .write("./Images/currentWeatherNew.png", () => {
                        if (fs.existsSync("./Images/" +(date%2)+ hours + minutes + ".jpg")) {
                            //file exists
                            console.log("Fetching existing image @ " + hours + minutes);
                            var stream = fs.createReadStream("./Images/Cached.jpg");
                            reply.photo(stream,msg.chat.name + ", here's your update. Update: Cached copy of last update @ " + hours + minutes);
                            return;
                        }
			//setting weather updates with proper size
                        sharp("./Images/currentWeatherNew.png")
                            .resize(853, 479)
                            .toFile("./Images/currentWeather.png", () => {
				console.log("the file currentWeather.png exists?" + fs.existsSync("./Images/currentWeather.png"))
				console.log("The file currentWeatherNew.png exists? "+ fs.existsSync("./Images/currentWeatherNew.png"));
				//var stream2 = fs.createReadStream("./Images/currentWeather.png");
				//reply.photo(stream2, "debugging photo");
				//merging weather with base image
                                sharp("./assets/base-853.png")
                                    .composite([{ input: "./Images/currentWeather.png", gravity: "northwest" }, { input: "./assets/MRT.png", gravity: "northwest" }])
                                    .toFile("./Images/" +(date%2)+ hours + minutes + ".jpg", () => {
                                        var stream = fs.createReadStream("./Images/" +(date%2)+ hours + minutes + ".jpg");
					//var stream2 = fs.createReadStream("./Images/currentWeather.png");
                                        reply.photo(stream, msg.chat.name + ", here's your update. Update: Latest update @ " + hours + minutes);
					//reply.photo(stream2, "Debugging Photo");
					//fs.unlinkSync("./Images/currentWeather.png");
					//fs.unlinkSync("./Images/currentWeatherNew.png");
					//fs.unlinkSync("./Images/currentWeather1.png");
                                    })
                                    .toFile("./Images/Cached.jpg", ()=>{
					fs.unlinkSync("./Images/currentWeather.png");
					fs.unlinkSync("./Images/currentWeatherNew.png");
				});
                            });

                        console.log("Fetching from NEA @ "+ hours + minutes);


                    });// save
                return data;

            })
            .catch(err => {
                console.error(err);
            });
    });

})

bot.command((msg, reply) => {
    console.log("Testing!");
    reply.text("Invalid command.")
})
