var settings = {};
var offsetLeft, offsetTop, zoom;

var blockSize, upscale, width, height, maxIteration, leftRange, topRange, forcedHeight, totalPixels;

var init = function(args) {
    blockSize = args['blockSize'] || 2000;
    upscale = args['upscale'] || 1;
    width = Math.floor(args['width'] / upscale) || 200;
    height = Math.floor(args['height'] / upscale) || 100;
    maxIteration = args['maxIteration'] || 255;
    leftRange = args['leftRange'] || 3.5;
    topRange = args['topRange'] || 2;
    forcedHeight = Math.round(width * topRange / leftRange) / height;
    totalPixels = width * height;
}

/**
 * Render one row asynchronously. Increasing blockSize can potentially
 *     decrease rendering times at the expense of CPU usage.
 */
var renderBlock = function(offset) {
    var lim = blockSize + offset > totalPixels ? totalPixels - offset : blockSize;
    var i;
    for(i = 0; i < lim; i++) {
        var pos = offset + i;
        var left = pos % width, top = Math.floor(pos/width);
        var pos = (top * width + left) * 4;
        var value = getValue(left, top);
        setPixelColor(pos, value);
    }
};

/**
 * Main logic for Mandelbrot generation
 *     - TODO Abstract out for more fractal types.
 * @param {Integer} left
 * @param {Integer} top
 */
var getValue = function(left, top) {
    var scaledX, scaledY;

    scaledX = zoom * (leftRange * left / width - 1.75) + offsetLeft;
    scaledY = zoom / forcedHeight * (topRange * top / height - 1) + offsetTop;

    /** Optimize against inner cartoid and return known maxIteration */
    if (isInCartoid(scaledX, scaledY)) {
        return maxIteration;
    }
    var x = 0;
    var y = 0;
    var iteration;
    var xtemp;
    for(iteration = 0; x*x + y*y < 4 && iteration < maxIteration; iteration++) {
        xtemp = x*x - y*y + scaledX;
        y = 2*x*y + scaledY;
        x = xtemp;
    }
    return iteration;
};

/**
 * Simple optimization to prevent computing to maximum iteration in the center
 *     of the unzoomed Mandelbrot set.
 * @param {Float} left
 * @param {Float} top
 */
var isInCartoid = function(left, top) {
    var p = (left - 0.25) * (left - 0.25) + (top * top);
    return left <= Math.sqrt(p) - (2 * p) + 0.25;
};

/**
 * Map an integer [0...maxIteration] into some rgb spectrum
 *     and write it to the imageData array.
 * @param {Integer} pos The linear position of the pixel being modified
 * @param {Integer} value The value returned by getValue [1...maxIteration]
 */
var setPixelColor = function(pos, value) {
    var r, g, b;
    value = 6 * value / maxIteration;
    if (value < 1) {
        r = 255;
        g = value * 255;
        b = 0;
    } else if (value < 2) {
        r = (2 - value) * 255;
        g = 255;
        b = 0;
    } else if (value < 3) {
        r = 0;
        g = 255;
        b = (value - 2) * 255;
    } else if (value < 4) {
        r = 0;
        g = (4 - value) * 255;
        b = 255;
    } else if (value < 5) {
        r = (value - 4) * 255;
        g = 0;
        b = 255;
    } else {
        r = 255;
        g = 0;
        b = (6 - value) * 255;
    }
    this.image.data[pos] = r;
    this.image.data[pos+1] = g;
    this.image.data[pos+2] = b;
    this.image.data[pos+3] = 255;
};

self.onmessage = function(e) {
    
};
