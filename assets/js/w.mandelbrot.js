var type, buf;
var x, y, z, offset, block;
var dx, dy, hScale, size, w, h, iterations, image, minStdDev;

var renderBlock = function() { 
    for(var i = offset / 4, l = i + size / 4, c = i; i < l; i++) {
        setPixelColor(i - c, getValue(i % w, Math.floor(i / w)));
    }
};

var getValue = function(left, top) {
    var scaledX = z * (dx * left / w - 1.75) + x;
    var scaledY = z / hScale * (dy * top / h - 1) + y;

    /** Optimize against inner cartoid and return known iterations */
    if (isInCartoid(scaledX, scaledY)) return iterations;

    var xi = 0, yi = 0, iteration;
    for(iteration = 0; xi*xi + yi*yi < 4 && iteration < iterations; iteration++) {
        var xtemp = xi*xi - yi*yi + scaledX;
        yi = 2*xi*yi + scaledY;
        xi = xtemp;
    }
    return iteration;
};

var isInCartoid = function(left, top) {
    var p = (left - 0.25) * (left - 0.25) + (top * top);
    return left <= Math.sqrt(p) - (2 * p) + 0.25;
};

var setPixelColor = function(pos, value) {
    var r, g, b;
    value = 6 * value / iterations;
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
    image[pos] = (255 << 24) | (b << 16) | (g << 8) | r;
};

var filterRandom = function() {
    var points, max = 100, i = 0;
    do {
        points = [];
        z = 1 / Math.pow(2, Math.floor(Math.random()*22) + 10)
        x = dx * (Math.random() - 0.5);
        y = dy * (Math.random() - 0.5);
        for(var i = 0; i < 64; i++) {
            var left = Math.floor((i % 8) * w / 8);
            var top = Math.floor(Math.floor(i / 8) * h / 8);
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

init = function(settings) {
    dx = settings['dx'];
    dy = settings['dy'];
    hScale = settings['hScale'];
    w = settings['w'];
    h = settings['h'];
    iterations = settings['iterations'];
    minStdDev = settings['minStdDev'];
};

draw = function(msg, data) {
    var state = data['state'];
    x = state['x'];
    y = state['y'];
    z = state['z'];
    offset = state['offset'];
    size = state['size'];
    block = state['block'];
    buf = data['buf'];
    image = new Uint32Array(buf);
    renderBlock();
    msg['image'] = buf;
    msg['offset'] = offset;
    msg['block'] = block;
};

rand = function() {
    filterRandom();
};

self.onmessage = function(event) {
    var msg = {};
    var data = event['data'];
    type = msg['type'] = data['type'];
    switch (type) {
        case 'init':
            init(data['settings']);
            break;
        case 'draw':
            draw(msg, data);
            break;
        case 'rand':
            rand();
            break;
    }
    msg['x'] = x;
    msg['y'] = y;
    msg['z'] = z;
    if (buf && buf.byteLength) {
        self['postMessage'](msg, [buf]);
    } else {
        self['postMessage'](msg);
    }
};
