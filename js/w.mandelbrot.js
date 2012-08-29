var offsetLeft, offsetTop, zoom, blockOffset;
var dx, dy, forcedHeight, blockSize, totalPixels, width, height, maxIteration, imagedata;

var renderBlock = function() {
    var lim = blockSize + blockOffset > totalPixels ? totalPixels - blockOffset : blockSize;
    var i;
    for(i = 0; i < lim; i++) {
        var pos = blockOffset + i;
        var left = pos % width, top = Math.floor(pos/width);
        pos = (top * width + left); //* 4;
        var value = getValue(left, top);
        setPixelColor(pos, value);
    }
};

var getValue = function(left, top) {
    var scaledX, scaledY;

    scaledX = zoom * (dx * left / width - 1.75) + offsetLeft;
    scaledY = zoom / forcedHeight * (dy * top / height - 1) + offsetTop;

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

var isInCartoid = function(left, top) {
    var p = (left - 0.25) * (left - 0.25) + (top * top);
    return left <= Math.sqrt(p) - (2 * p) + 0.25;
};

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
    imagedata[pos] = (255   << 24) | (b << 16) | (g <<  8) | r;
    //imagedata[pos+1] = g;
    //imagedata[pos+2] = b;
    //imagedata[pos+3] = 255;
};

self.onmessage = function(event) {
    var state = event['data']['state'];
    var settings = event['data']['settings'];
    offsetLeft = state['offsetLeft'];
    offsetTop = state['offsetTop'];
    zoom = state['zoom'];
    blockOffset = state['blockOffset'];

    dx = settings['dx'];
    dy = settings['dy'];
    forcedHeight = settings['forcedHeight'];
    blockSize = settings['totalPixels'];
    totalPixels = settings['totalPixels'];
    width = settings['width'];
    height = settings['height'];
    maxIteration = settings['maxIteration'];

    var buffer = event['data']['buffer'];
    imagedata = new Uint32Array(buffer, 0, totalPixels);

    renderBlock();

    var msg = {};
    msg['imagedata'] = buffer;
    msg['blockOffset'] = blockOffset;
    self['webkitPostMessage'](msg, [buffer]);
};
