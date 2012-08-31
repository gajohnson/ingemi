var type, buffer;
var x, y, z, blockOffset, index;
var dx, dy, forcedHeight, blockSize, width, height, maxIteration, imagedata, minStdDev;

var renderBlock = function() {
    for(var i = 0; i < blockSize / 4; i++) {
        var pos = blockOffset / 4 + i;
        var left = pos % width, top = Math.floor(pos/width);
        pos = (top * width + left); //* 4;
        var value = getValue(left, top);
        setPixelColor(pos, value);
    }
};

var getValue = function(left, top) {
    var scaledX, scaledY;

    scaledX = z * (dx * left / width - 1.75) + x;
    scaledY = z / forcedHeight * (dy * top / height - 1) + y;

    /** Optimize against inner cartoid and return known maxIteration */
    if (isInCartoid(scaledX, scaledY)) {
        return maxIteration;
    }
    var _x = 0;
    var _y = 0;
    var iteration;
    var xtemp;
    for(iteration = 0; _x*_x + _y*_y < 4 && iteration < maxIteration; iteration++) {
        xtemp = _x*_x - _y*_y + scaledX;
        _y = 2*_x*_y + scaledY;
        _x = xtemp;
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
    imagedata[pos - blockOffset / 4] = (255 << 24) | (b << 16) | (g << 8) | r;
};

var filterRandom = function() {
    var points, left, top, max = 100, i = 0;
    do {
        points = [];
        z = 1 / Math.pow(2, Math.floor(Math.random()*22) + 10)
        x = dx * (Math.random() - 0.5);
        y = dy * (Math.random() - 0.5);
        for(var i = 0; i < 32; i++) {
            left = Math.floor((i%4) * width/4);
            top = Math.floor(Math.floor(i / 4) * height/4);
            points.push(getValue(left, top));
        }
        i++;
    } while (stddev(points, average(points)) < minStdDev && i < max);
    return [x, y, z];
};

var average = function(array) {
    var sum = 0, l = array.length;
    for(var i = 0; i < l; i++) {
        sum += array[i];
    }
    return sum / l;
};

var stddev = function(array, average) {
    var l = array.length;
    var sum = 0;
    for(var i = 0; i < l; i++) {
        var x = array[i] - average;
        sum += x * x;
    }
    return Math.pow(sum / l, 0.5);
};

handleInitRequest = function(msg, event) {
    var settings = event['data']['settings'];
    dx = settings['dx'];
    dy = settings['dy'];
    forcedHeight = settings['forcedHeight'];
    width = settings['width'];
    height = settings['height'];
    maxIteration = settings['maxIteration'];
    minStdDev = settings['minStdDev'];
};

handleRenderRequest = function(msg, event) {
    var state = event['data']['state'];
    x = state['x'];
    y = state['y'];
    z = state['z'];
    blockOffset = state['blockOffset'];
    blockSize = state['blockSize'];
    index = state['index'];
    buffer = event['data']['buffer'];
    imagedata = new Uint32Array(buffer);
    renderBlock();
    msg['imagedata'] = buffer;
    msg['blockOffset'] = blockOffset;
    msg['index'] = index;
};

handleRandomRequest = function(msg, event) {
    filterRandom();
};

self.onmessage = function(event) {
    var msg = {};
    type = msg['type'] = event['data']['type'];
    switch (type) {
        case 'init':
            handleInitRequest(msg, event);
            break;
        case 'render':
            handleRenderRequest(msg, event);
            break;
        case 'random':
            handleRandomRequest(msg, event);
            break;
    }
    msg['x'] = x;
    msg['y'] = y;
    msg['z'] = z;
    if (buffer && buffer.byteLength) {
        self['postMessage'](msg, [buffer]);
    } else {
        self['postMessage'](msg);
    }
};
