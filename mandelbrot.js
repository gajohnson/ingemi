(function (){
function Mandelbrot (canvas, context, width, height, maxIteration) {
    this.scale = 2;
    this.canvas = canvas;
    this.realWidth = width;
    this.realHeight = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.context = context;

    this.rangeLeft = 1;
    this.rangeTop = 1;
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.currentRow = 0;
    this.renderedPixels = 0;
    this.renderedPixelsInRow = 0;
    
    this.scaleCanvas();
    
    this.maxIteration = maxIteration;
    this.zoomer = new MandelbrotZoom(this);
}

Mandelbrot.prototype.scaleCanvas = function () {
    this.width = this.canvas.width = Math.floor(this.realWidth / this.scale);
    this.height = this.canvas.height = Math.floor(this.realHeight / this.scale);
    this.image = context.createImageData(this.width, this.height);
    this.totalPixels = this.width * this.height;
};

Mandelbrot.prototype.render = function () {
    this.timer = new Date().getTime();
    this.renderedPixels = 0;
    this.renderedPixelsInRow = 0;
    this.currentRow = 0;
    this.renderRow();
};

Mandelbrot.prototype.renderRow = function () {
    var j;
    for (j = 0; j < this.height; j += 1) {
        this.setPixel(this.currentRow, j);
    }
};

Mandelbrot.prototype.setPixel = function (left, top) {
    var _this = this;
    setTimeout(function () {
        var pos = _this.gridToLine(left, top) * 4;
        var value = _this.getValue(left, top);
        _this.setPixelColor(pos, value);
        if (_this.renderedPixels == _this.totalPixels) {
            _this.context.putImageData(_this.image, 0, 0);
            _this.logStats();
        } else if (_this.renderedPixelsInRow === _this.height) {
            _this.currentRow += 1;
            _this.renderedPixelsInRow = 0;
            _this.renderRow();
        }
    }, 0);
};

Mandelbrot.prototype.setPixelColor = function(pos, value) {
    this.image.data[pos] = value;
    this.image.data[pos+1] = value;
    this.image.data[pos+2] = value;
    this.image.data[pos+3] = 255;
    this.renderedPixels += 1;
    this.renderedPixelsInRow += 1;
};

Mandelbrot.prototype.getValue = function (left, top) {
    var scaledX = (this.rangeLeft * 3.5 * left / this.width) - 2.5 + this.offsetLeft;
    var scaledY = (this.rangeTop * 2 * top / this.height) - 1 + this.offsetTop;
    if (this.isInCartoid(scaledX, scaledY)) {   // Optimize against inner cartoid
        return this.maxIteration;
    } else {
        var x = 0;
        var y = 0;
        var iteration = 0;
        var xtemp;
        while (x*x + y*y < 4 && iteration < this.maxIteration) {
            xtemp = x*x - y*y + scaledX;
            y = 2*x*y + scaledY;
            x = xtemp;
            iteration += 1;
        }
        return iteration;
    }
};

Mandelbrot.prototype.isInCartoid = function (left, top) {
    var p = Math.pow(left - 0.25, 2) + (top * top);
    var q = Math.sqrt(p);
    return left <= q - (2 * p) + 0.25;
};

Mandelbrot.prototype.gridToLine = function (left, top) {
    return top * this.width + left;
};

Mandelbrot.prototype.logStats = function() {
    console.log(
        'Rendered ' + this.width + ' * ' + this.height + ' pixels in ' +
        ((new Date().getTime() - this.timer)/1000) + ' seconds.'
    );
};

function MandelbrotZoom (mandelbrot) {
    this.mandelbrot = mandelbrot;
    this.binds();
}

MandelbrotZoom.prototype.binds = function () {
    var _this = this;
    addEventListener("click", function (e) {
        _this.handleClick(e.pageX, e.pageY);
    });
    addEventListener("keydown", function (e) {
        _this.handleKeydown(e.keyCode);
    });
};

MandelbrotZoom.prototype.handleClick = function (x, y) {
    x = x / this.mandelbrot.scale;
    y = y / this.mandelbrot.scale;
    var targetLeft = x / this.mandelbrot.width - 0.5;
    var targetTop = y / this.mandelbrot.height - 0.5;
    this.mandelbrot.offsetLeft += targetLeft * this.mandelbrot.rangeLeft * 3.5;
    this.mandelbrot.offsetTop += targetTop * this.mandelbrot.rangeTop * 2;
    this.mandelbrot.render();
};

MandelbrotZoom.prototype.handleKeydown = function (keyCode) {
    switch (keyCode) {
        case 38: this.handleKeyDUp();
            break; 
        case 40: this.handleKeyDDown();
            break;
        case 37: this.handleKeyDLeft();
            break;
        case 39: this.handleKeyDRight();
            break;
    };
}

MandelbrotZoom.prototype.handleKeyDUp = function (keyCode) {
    this.mandelbrot.rangeLeft *= 2;
    this.mandelbrot.rangeTop *= 2;
    this.mandelbrot.offsetLeft += this.mandelbrot.rangeLeft * 1.75;
    this.mandelbrot.offsetTop += this.mandelbrot.rangeTop;
    this.mandelbrot.render();
};
MandelbrotZoom.prototype.handleKeyDDown = function (keyCode) {
    this.mandelbrot.rangeLeft /= 2;
    this.mandelbrot.rangeTop /= 2;
    this.mandelbrot.offsetLeft += this.mandelbrot.rangeLeft * 1.75;
    this.mandelbrot.offsetTop += this.mandelbrot.rangeTop;
    this.mandelbrot.render();
};
MandelbrotZoom.prototype.handleKeyDLeft = function (keyCode) {
    if (this.mandelbrot.scale <= 1) {
        return;
    }
    this.mandelbrot.scale -= 1;
    this.mandelbrot.scaleCanvas();
    this.mandelbrot.render();
};
MandelbrotZoom.prototype.handleKeyDRight = function (keyCode) {
    this.mandelbrot.scale += 1;
    this.mandelbrot.scaleCanvas();
    this.mandelbrot.render();
};
window.Mandelbrot = Mandelbrot;
})();