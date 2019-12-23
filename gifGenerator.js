var getPixels = require('get-pixels')
var GifEncoder = require('gif-encoder');
var gif = new GifEncoder(853, 479);
var file = require('fs').createWriteStream('img.gif');
var pics = ['./Images/1.jpg', './Images/2.jpg', './Images/3.jpg', './Images/0.jpg'];

gif.pipe(file);
gif.setQuality(75);
gif.setDelay(500);
gif.writeHeader();

var addToGif = function(images, counter = 0) {
  console.log(images[counter]);
  getPixels(images[counter], function(err, pixels) {
    gif.addFrame(pixels.data);
    gif.read();
    if (counter === images.length - 1) {
      gif.finish();
    } else {
      addToGif(images, ++counter);
    }
  })
}
addToGif(pics);