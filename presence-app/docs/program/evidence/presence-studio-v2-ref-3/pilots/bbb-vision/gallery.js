const imagePaths = [
  './assets/benny/klien.JPG',
  './assets/benny/klein.JPG',
  './assets/benny/kelela.JPG',
  './assets/benny/kelela (1).JPG',
  './assets/benny/little simz.JPG',
  './assets/benny/Niecy Blues.JPG',
  './assets/benny/sparkle.JPG',
  './assets/benny/tems.JPG',
  './assets/benny/tems (1).JPG',
  './assets/benny/yves tumor.JPG',
  './assets/landing-slider-shots/akka.JPG',
  './assets/landing-slider-shots/ballerina.JPG',
  './assets/landing-slider-shots/ballerina (1).JPG',
  './assets/landing-slider-shots/ballerina (2).JPG',
  './assets/landing-slider-shots/CD.JPG',
  './assets/landing-slider-shots/fashion week_.JPG',
  './assets/landing-slider-shots/Liv.e.JPG',
  './assets/landing-slider-shots/mk.gee.JPG',
  './assets/landing-slider-shots/sparkle.JPG',
  './assets/landing-slider-shots/tems.JPG'];


class Utilities {
  static norm(value, min, max) {
    return (value - min) / (max - min);
  }

  static lerp(norm, min, max) {
    return (max - min) * norm + min;
  }

  static map(value, sourceMin, sourceMax, destMin, destMax) {
    return this.lerp(this.norm(value, sourceMin, sourceMax), destMin, destMax);
  }

  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  static distance(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;

    return Math.sqrt(dx * dx + dy * dy);
  }

  static randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  static randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  static randomDist(min, max, iterations) {
    let total = 0;

    for (let i = 0; i < iterations; i++) {
      total += this.randomRange(min, max);
    }

    return total / iterations;
  }

  static degreesToRads(degrees) {
    return degrees / 180 * Math.PI;
  }

  static radsToDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  static roundToPlaces(value, places) {
    const mult = Math.pow(10, places);

    return Math.round(value * mult) / mult;
  }

  static roundNearest(value, nearest) {
    return Math.round(value / nearest) * nearest;
  }}


class Loading {
  constructor() {
    this.load = document.getElementsByClassName('loading')[0];
    this.line = document.getElementsByClassName('line')[0];
    this.counter = document.getElementsByClassName('counter')[0];
    this.imagePaths = imagePaths;
    this.loadedNumber = 1;
    this.percentage = 0;
    this.num = 0;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      this.loadImages(resolve, reject);
    });
  }

  loadImages(resolve, reject) {
    for (let i = 0; i < this.imagePaths.length; i++) {
      const path = this.imagePaths[i];
      const image = new Image();

      image.src = path;
      if (/^https?:\/\//.test(path)) {
        image.crossOrigin = "anonymous";
      }

      image.addEventListener('load', () => {
        this.percentage = this.getPercentage(this.loadedNumber++);
      });
    }

    this.drawPercentage(resolve, reject);
  }

  getPercentage(num) {
    return Math.floor(num / this.imagePaths.length * 100);
  }

  drawPercentage(resolve, reject) {
    if (this.num < this.percentage) {
      this.num++;
    }

    this.line.style.width = this.num + '%';
    this.counter.textContent = this.num + '%';

    if (this.num === 100) {
      this.cancelDrawLoopCounterNumber(resolve, reject);

      return;
    }

    this.animationID = requestAnimationFrame(this.drawPercentage.bind(this, resolve, reject));
  }

  cancelDrawLoopCounterNumber(resolve, reject) {
    cancelAnimationFrame(this.animationID);

    this.addClass(resolve, reject);
  }

  addClass(resolve, reject) {
    this.delay(400).
    then(() => {
      this.load.classList.add('loaded');
      this.line.classList.add('loaded');
      this.counter.classList.add('loaded');

      resolve();
    });
  }

  delay(time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }}


class FullScreen {
  constructor() {
    this.setupEvents();
    this.initialize();
  }

  initialize() {
    const vh = window.innerHeight * 0.01;

    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  setupEvents() {
    window.addEventListener('resize', this.onResize.bind(this), false);
  }

  onResize() {
    this.initialize();
  }}


class DrawMainImage {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.initialize();
  }

  initialize() {
    this.canvas = document.createElement('canvas');
    this.ctx2 = this.canvas.getContext('2d');
    this.image = null;
    this.stopWatch = new Stopwatch();
    this.dataArr = [];
  }

  drawImage(src) {
    this.isLoaded = false;
    this.image = new Image();
    this.image.src = src;
    if (/^https?:\/\//.test(src)) {
      this.image.crossOrigin = "anonymous";
    }

    this.image.addEventListener('load', () => {
      this.stopWatch.initialize();

      let imageWidth, ratio, imageHeight;

      if (this.image.width >= this.image.height) {
        imageWidth = Math.min(this.width * 0.9, this.image.width);
        ratio = this.image.width / this.image.height;
        imageHeight = imageWidth / ratio;
      } else {
        imageHeight = Math.min(this.height * 0.9, this.image.height);
        ratio = this.image.height / this.image.width;
        imageWidth = imageHeight / ratio;

        if (imageWidth >= this.width * 0.9) {
          imageWidth = Math.min(this.width * 0.9, this.image.width);
          ratio = this.image.width / this.image.height;
          imageHeight = imageWidth / ratio;
        }
      }

      this.canvas.width = imageWidth;
      this.canvas.height = imageHeight;

      this.ctx2.clearRect(0, 0, imageWidth, imageHeight);
      this.ctx2.drawImage(this.image, 0, 0, imageWidth, imageHeight);

      this.getImageData();
      this.isLoaded = true;
    });
  }

  getImageData() {
    this.dataArr = [];

    let preHeight = 0,addHeight = 0;
    for (let i = 0; i < this.canvas.height; i += addHeight) {
      const obj = {};

      addHeight = Utilities.randomInt(5, 20);

      if (preHeight + addHeight > this.canvas.height) {
        addHeight = Math.floor(this.canvas.height - preHeight);
      }

      if (addHeight === 0) return;

      const image = this.ctx2.getImageData(
      0,
      preHeight,
      this.canvas.width,
      addHeight);


      obj.image = image;
      obj.height = preHeight;
      obj.width = Math.random() * this.width * 0.5 - this.width * 0.25;

      this.dataArr.push(obj);

      preHeight += addHeight;
    }
  }

  addImage(t) {
    if (!this.isLoaded) return;

    for (let i = 0; i < this.dataArr.length; i++) {
      this.ctx.putImageData(
      this.dataArr[i].image,
      this.width / 2 - this.canvas.width / 2 + this.dataArr[i].width,
      this.height / 2 - this.canvas.height / 2 + this.dataArr[i].height);

    }

    this.moveImage();
  }

  moveImage() {
    this.stopWatch.calculateTime();

    const t = 1.0 - Math.min(this.stopWatch.getElapsedTime() * 0.0001333333333, 1.0);

    this.e = this.ease(t);

    for (let i = 0; i < this.dataArr.length; i++) {
      this.dataArr[i].width *= this.e;
    }
  }

  deleteImage(t) {
    if (!this.isLoaded) return;

    for (let i = 0; i < this.dataArr.length; i++) {
      this.ctx.putImageData(
      this.dataArr[i].image,
      this.width / 2 - this.canvas.width / 2 + this.dataArr[i].width + Math.tan(t * 0.01 + this.dataArr[i].height / Math.PI) * 100,
      this.height / 2 - this.canvas.height / 2 + this.dataArr[i].height);

    }
  }

  ease(x) {
    return 1 - Math.sqrt(1 - Math.pow(x, 2));
  }}


class Sketch {
  constructor() {
    this.setupCanvas();
    this.setupEvents();
    this.initialize();
  }

  setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.canvas.ariaLabel = 'This is images gallery.';
    this.canvas.role = 'img';

    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.minHeight = '100vh';
    this.canvas.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    this.canvas.style.display = 'block';
    this.canvas.style.background = '#000000';
    this.canvas.style.zIndex = '-1';

    document.body.appendChild(this.canvas);
  }

  setupEvents() {
    window.addEventListener('resize', this.onResize.bind(this), false);
    window.addEventListener('wheel', this.onWheel.bind(this), false);
    document.body.addEventListener('click', this.onClick.bind(this), false);
    document.body.addEventListener('mousemove', this.onMousemove.bind(this), false);
    document.body.addEventListener('touchstart', this.onTouchstart.bind(this), false);
    document.body.addEventListener('touchmove', this.onTouchmove.bind(this), false);
  }

  onMousemove(e) {
    this.touchInfos.mouse.x = e.clientX / this.width * this.width - this.width / 2;
    this.touchInfos.mouse.y = e.clientY / this.height * this.height - this.height / 2;
  }

  onTouchstart(e) {
    const t = e.targetTouches[0];

    this.touchInfos.fing.start.x = t.pageX;
    this.touchInfos.fing.start.y = t.pageY;
  }

  onTouchmove(e) {
    const t = e.targetTouches[0];

    this.touchInfos.mouse.x = t.pageX / this.width * this.width - this.width / 2;
    this.touchInfos.mouse.y = t.pageY / this.height * this.height - this.height / 2;

    this.touchInfos.fing.move.x = t.pageX;
    this.touchInfos.fing.move.y = t.pageY;

    this.touchInfos.fing.end.x = this.touchInfos.fing.start.x - this.touchInfos.fing.move.x;
    this.touchInfos.fing.end.y = this.touchInfos.fing.start.y - this.touchInfos.fing.move.y;

    this.touchInfos.delta.x += this.touchInfos.fing.end.x * 0.0003;
    this.touchInfos.delta.y += this.touchInfos.fing.end.y * 0.0003;
  }

  onResize() {
    if (this.preWidth === window.innerWidth) {
      this.height = this.canvas.height = window.innerHeight;

      return;
    }

    this.initialize();
  }

  onWheel(e) {
    this.touchInfos.delta.x += e.deltaX * 0.0005;
    this.touchInfos.delta.y += e.deltaY * 0.0005;
  }

  onClick(e) {
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('.brand-link')) {
      return;
    }

    if (this.isDisplayed) {
      this.isDeleating = true;

      setTimeout(() => {
        this.isDeleating = false;
        this.isDisplayed = false;
      }, 240);

      return;
    } else {
      this.isDisplayed = false;
    }

    const x = this.touchInfos.mouse.x = e.clientX / this.width * this.width - this.width / 2;
    const y = this.touchInfos.mouse.y = e.clientY / this.height * this.height - this.height / 2;

    for (let i = 0; i < this.shapes.length; i++) {
      const s = this.shapes[i];

      if (this.isHovered(s, x, y)) {
        this.isDisplayed = true;
        this.M.drawImage(s.image.src);

        return;
      }
    }
  }

  initialize() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.paths = imagePaths;
    this.isDisplayed = false;

    this.hasHover = window.matchMedia('(hover: hover)').matches;

    this.setupSizes();
    this.setupShapes();

    this.focus = {
      x: 0,
      y: 0,
      s: this.size };


    this.touchInfos = {
      mouse: {
        x: 0,
        y: 0 },

      delta: {
        x: 0,
        y: 0 },

      fing: {
        start: {
          x: null,
          y: null },

        move: {
          x: null,
          y: null },

        end: {
          x: null,
          y: null } } };




    this.G = new Glitch(this.ctx, this.width, this.height, 50, 200);
    this.M = new DrawMainImage(this.ctx, this.width, this.height);

    this.render(0);
  }

  setupSizes() {
    this.width = this.preWidth = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  setupShapes() {
    const edge = Math.max(this.width, this.height);
    //const edge = Math.sqrt(this.width * this.width + this.height * this.height);

    this.radius = edge / 2;
    this.numberOfShape = 16;
    this.size = this.radius / (this.numberOfShape / 6);
    this.shapes = [];

    let index = 0;
    for (let x = 0; x < this.numberOfShape; x++) {
      for (let y = 0; y < this.numberOfShape; y++) {
        const params = {
          x: x,
          y: y,
          i: index++,
          c: this.ctx,
          s: this.size,
          r: this.radius,
          n: this.numberOfShape,
          p: this.paths[Math.floor(Math.random() * this.paths.length)] };

        const s = new Shape(params);

        this.shapes.push(s);
      }
    }
  }

  drawFocus(s, hover) {
    if (hover === false) {
      this.focus.s += (0 - this.focus.s) * 0.16;
      this.focus.x += (this.touchInfos.mouse.x - this.focus.x) * 0.16;
      this.focus.y += (this.touchInfos.mouse.y - this.focus.y) * 0.16;

      this.ctx.save();
      this.ctx.strokeStyle = '#ffd84d';
      this.ctx.shadowColor = 'rgba(255, 216, 77, 0.85)';
      this.ctx.shadowBlur = 12;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(this.focus.x - this.focus.s / 2, this.focus.y - this.focus.s / 2, this.focus.s, this.focus.s);
      this.ctx.restore();
    } else {
      this.focus.s += (this.size * s.ratio - this.focus.s) * 0.16;
      this.focus.x += (s.x - this.focus.x) * 0.16;
      this.focus.y += (s.y - this.focus.y) * 0.16;

      this.ctx.save();
      this.ctx.strokeStyle = '#ffd84d';
      this.ctx.shadowColor = 'rgba(255, 216, 77, 0.95)';
      this.ctx.shadowBlur = 20;
      //this.ctx.globalCompositeOperation = 'lighter'; 
      this.ctx.lineWidth = 5 * s.ratio;
      this.ctx.strokeRect(this.focus.x - this.focus.s / 2, this.focus.y - this.focus.s / 2, this.focus.s, this.focus.s);
      this.ctx.restore();
    };
  }

  isHovered(shape, x, y) {
    if (
    shape.displayed === true &&
    x > shape.x - this.size / 2 * shape.ratio &&
    x < shape.x + this.size / 2 * shape.ratio &&
    y > shape.y - this.size / 2 * shape.ratio &&
    y < shape.y + this.size / 2 * shape.ratio)

    {
      return true;
    }
  }

  resetParams() {
    this.hover = false;
    document.body.style.cursor = 'initial';
  }

  render(t) {
    this.resetParams();

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);

    let hoveredIndex;
    for (let i = 0; i < this.shapes.length; i++) {
      const s = this.shapes[i];

      this.shapes[i].draw(this.touchInfos);

      if (this.isHovered(s, this.touchInfos.mouse.x, this.touchInfos.mouse.y)) {
        document.body.style.cursor = 'zoom-in';
        this.hover = true;
        hoveredIndex = i;
      }
    }

    this.drawFocus(this.shapes[hoveredIndex], this.hover);

    if (Math.random() < 0.01) {
      this.G.draw(t);
    }

    if (this.isDisplayed && this.isDeleating !== true) {
      this.ctx.globalAlpha = 0.8;
      this.ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      this.M.addImage(t);
    }

    if (this.isDeleating) {
      this.M.deleteImage(t);
    }

    this.ctx.restore();

    this.animationId = requestAnimationFrame(this.render.bind(this));
  }}


class Shape {
  constructor(params) {
    this.ctx = params.c;
    this.xIndex = params.x;
    this.yIndex = params.y;
    this.index = params.i;
    this.radius = params.r;
    this.numberOfShape = params.n;
    this.size = params.s;
    this.image = new Image();
    if (/^https?:\/\//.test(params.p)) {
      this.image.crossOrigin = "anonymous";
    }
    this.thumbCanvas = document.createElement('canvas');
    this.thumbCtx = this.thumbCanvas.getContext('2d');
    this.thumbSize = 192;
    this.thumbReady = false;
    this.image.src = params.p;
    this.ratio = 0;
    this.displayed = true;
    this.initialize();
    this.setupCropAnchor(params.p);
    this.image.addEventListener('load', this.buildThumbnail.bind(this));
  }

  initialize() {
    this.xRadian = Math.PI * 2 / this.numberOfShape * this.xIndex;
    this.yRadian = Math.PI * 2 / this.numberOfShape * this.yIndex;
  }

  setupCropAnchor(path) {
    const hash = this.hashString(path);
    const seedA = (hash + (this.index + 1) * 9719 + (this.xIndex + 1) * 6151 + (this.yIndex + 1) * 3137) * 0.0001;
    const seedB = (hash + (this.index + 1) * 1879 + (this.xIndex + 1) * 1117 + (this.yIndex + 1) * 7211) * 0.0001;
    this.cropU = this.fract(Math.sin(seedA) * 43758.5453123);
    this.cropV = this.fract(Math.sin(seedB) * 96321.3145789);
  }

  hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    return hash;
  }

  fract(value) {
    return value - Math.floor(value);
  }

  buildThumbnail() {
    if (!this.image.naturalWidth || !this.image.naturalHeight) {
      return;
    }

    const sourceWidth = this.image.naturalWidth;
    const sourceHeight = this.image.naturalHeight;
    const maxCropArea = sourceWidth * sourceHeight / 3;
    const cropSide = Math.min(sourceWidth, sourceHeight, Math.sqrt(maxCropArea));
    const cropWidth = cropSide;
    const cropHeight = cropSide;
    const srcX = (sourceWidth - cropWidth) * this.cropU;
    const srcY = (sourceHeight - cropHeight) * this.cropV;

    this.thumbCanvas.width = this.thumbSize;
    this.thumbCanvas.height = this.thumbSize;
    this.thumbCtx.clearRect(0, 0, this.thumbSize, this.thumbSize);
    this.thumbCtx.drawImage(
    this.image,
    srcX,
    srcY,
    cropWidth,
    cropHeight,
    0,
    0,
    this.thumbSize,
    this.thumbSize);

    this.thumbReady = true;
  }

  updateParams(infos) {
    this.x = Math.sin(this.xRadian + infos.delta.x) * this.radius;
    this.y = Math.cos(this.yRadian + infos.delta.y) * this.radius;

    this.ratio = this.getNormalizedDist(infos);
  }

  getNormalizedDist(infos) {
    let tmp;
    tmp = Math.sqrt(this.x * this.x + this.y * this.y) / this.radius;
    tmp = this.ease(tmp);
    tmp = 1 - Math.min(tmp, 1);

    return tmp;
  }

  ease(t) {
    return t * t * t;
  }

  draw(infos) {
    this.updateParams(infos);

    if (Math.sin(this.yRadian + infos.delta.y) > 0 || Math.cos(this.xRadian + infos.delta.x) > 0) {
      this.displayed = false;

      return;
    }

    this.displayed = true;

    this.ctx.save();
    this.ctx.translate(this.x, this.y);
    this.ctx.scale(this.ratio, this.ratio);
    this.ctx.translate(-this.x, -this.y);

    this.ctx.globalAlpha = this.ratio;
    if (!this.thumbReady && this.image.naturalWidth > 0 && this.image.naturalHeight > 0) {
      this.buildThumbnail();
    }

    if (this.thumbReady) {
      const frameSize = this.size;
      this.ctx.drawImage(
      this.thumbCanvas,
      this.x - frameSize / 2,
      this.y - frameSize / 2,
      frameSize,
      frameSize);
    }


    this.ctx.restore();
  }}


class Glitch {
  constructor(ctx, width, height, min, max) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.min = min;
    this.max = max;
    this.dataArr = [];
  }

  getImageData() {
    let preHeight = 0,addHeight = 0;
    for (let i = 0; i < this.height; i += addHeight) {
      const obj = {};

      addHeight = Utilities.randomInt(this.min, this.max);

      if (preHeight + addHeight > this.height) {
        addHeight = Math.floor(this.height - preHeight);
      }

      if (addHeight === 0) {
        return;
      }

      const image = this.ctx.getImageData(0, preHeight, this.width, preHeight + addHeight);

      obj.image = image;
      obj.height = preHeight;

      this.dataArr.push(obj);

      preHeight += addHeight;
    }
  }

  addImage(t) {
    for (let i = 0; i < this.dataArr.length; i++) {
      if (Math.random() > 0.01) {
        this.ctx.putImageData(
        this.dataArr[i].image,
        Math.tan(this.dataArr[i].height * 0.1 + t) * 10 * Math.random(),
        this.dataArr[i].height);

      } else {
        this.ctx.putImageData(
        this.dataArr[Math.floor(this.dataArr.length * Math.random())].image,
        this.width * Math.random() - this.width / 2,
        this.dataArr[i].height);

      }
    }
  }

  draw(t) {
    this.dataArr = [];
    this.getImageData();
    this.addImage(t);
  }}


class Stopwatch {
  constructor() {
    this.initialize();
  }

  initialize() {
    const time = Date.now();

    this.startTime = time;
    this.lastTime = time;
  }

  calculateTime() {
    const time = Date.now();

    this.elapsedTime = time - this.startTime;
    this.lastTime = time;
  }

  getElapsedTime() {
    return this.elapsedTime;
  }}


window.addEventListener('load', () => {
  const F = new FullScreen();
  const L = new Loading();

  L.initialize().
  then(() => {
    const S = new Sketch();
  });
});
