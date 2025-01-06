// ATTRIBUTION -> gif.js 0.2.0 - https://github.com/jnordberg/gif.js
// THIS IS JUST AN IMPLEMENTATION OF jnordberg CODE FOR ES6

// Browser detection utility
const browser = {
    name: (() => {
        const ua = navigator.userAgent.toLowerCase();
        const UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, "unknown", 0];
        return UA[1] === "version" ? UA[3] : UA[1];
    })(),
    version: (() => {
        const ua = navigator.userAgent.toLowerCase();
        const UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, "unknown", 0];
        const mode = UA[1] === "ie" && document.documentMode;
        return mode || parseFloat(UA[1] === "opera" && UA[4] ? UA[4] : UA[2]);
    })(),
    platform: {
        name: (() => {
            const ua = navigator.userAgent.toLowerCase();
            const platform = navigator.platform.toLowerCase();
            return ua.match(/ip(?:ad|od|hone)/) ? "ios" : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ["other"])[0];
        })()
    }
};

// Event Emitter base class
class EventEmitter {
    constructor() {
        this._events = {};
        this._maxListeners = undefined;
    }

    setMaxListeners(n) {
        if (typeof n !== 'number' || n < 0 || isNaN(n)) {
            throw new TypeError('n must be a positive number');
        }
        this._maxListeners = n;
        return this;
    }

    emit(type, ...args) {
        if (!this._events) this._events = {};

        // Special case for error events
        if (type === 'error') {
            if (!this._events.error || (typeof this._events.error === 'object' && !this._events.error.length)) {
            const err = args[0];
            if (err instanceof Error) {
                throw err;
            }
            const error = new Error(`Uncaught, unspecified "error" event. (${err})`);
            error.context = err;
            throw error;
            }
        }

        const handler = this._events[type];
        if (!handler) return false;

        if (typeof handler === 'function') {
            switch (args.length) {
            case 0:
                handler.call(this);
                break;
            case 1:
                handler.call(this, args[0]);
                break;
            case 2:
                handler.call(this, args[0], args[1]);
                break;
            default:
                handler.apply(this, args);
            }
        } else if (Array.isArray(handler)) {
            const listeners = handler.slice();
            for (const listener of listeners) {
            listener.apply(this, args);
            }
        }
        return true;
    }

    addListener(type, listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('listener must be a function');
        }

        if (!this._events) this._events = {};

        // Emit newListener event if registered
        if (this._events.newListener) {
            this.emit('newListener', type, typeof listener.listener === 'function' ? listener.listener : listener);
        }

        if (!this._events[type]) {
            this._events[type] = listener;
        } else if (Array.isArray(this._events[type])) {
            this._events[type].push(listener);
        } else {
            this._events[type] = [this._events[type], listener];
        }

        // Check for listener leak
        if (Array.isArray(this._events[type]) && !this._events[type].warned) {
            const m = this._maxListeners !== undefined ? this._maxListeners : EventEmitter.defaultMaxListeners;
            if (m && m > 0 && this._events[type].length > m) {
            this._events[type].warned = true;
            console.error(`Possible EventEmitter memory leak detected. ${this._events[type].length} listeners added. Use emitter.setMaxListeners() to increase limit`);
            console.trace();
            }
        }

        return this;
    }

    on(type, listener) {
        return this.addListener(type, listener);
    }

    once(type, listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('listener must be a function');
        }

        let fired = false;

        const g = (...args) => {
            this.removeListener(type, g);
            if (!fired) {
            fired = true;
            listener.apply(this, args);
            }
        };

        g.listener = listener;
        this.on(type, g);
        return this;
    }

    removeListener(type, listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('listener must be a function');
        }

        if (!this._events || !this._events[type]) return this;

        const list = this._events[type];
        const position = list === listener || 
            (list.listener && list.listener === listener) ? 0 : 
            Array.isArray(list) ? list.indexOf(listener) : -1;

        if (position < 0) return this;

        if (Array.isArray(list)) {
            if (list.length === 1) {
            list.length = 0;
            delete this._events[type];
            } else {
            list.splice(position, 1);
            }
        } else {
            delete this._events[type];
        }

        if (this._events.removeListener) {
            this.emit('removeListener', type, listener);
        }

        return this;
    }

    removeAllListeners(type) {
        if (!this._events) return this;

        if (!this._events.removeListener) {
            if (arguments.length === 0) {
            this._events = {};
            } else if (this._events[type]) {
            delete this._events[type];
            }
            return this;
        }

        // Special handling for removeListener event
        if (arguments.length === 0) {
            for (const key in this._events) {
            if (key === 'removeListener') continue;
            this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = {};
            return this;
        }

        const listeners = this._events[type];
        if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
        } else if (listeners) {
            while (listeners.length) {
            this.removeListener(type, listeners[listeners.length - 1]);
            }
        }
        delete this._events[type];
        return this;
    }

    listeners(type) {
        const evlistener = !this._events || !this._events[type] ? [] :
            typeof this._events[type] === 'function' ? [this._events[type]] :
            this._events[type].slice();
        return evlistener;
    }

    listenerCount(type) {
        if (this._events) {
            const evlistener = this._events[type];
            if (typeof evlistener === 'function') {
            return 1;
            } else if (evlistener) {
            return evlistener.length;
            }
        }
        return 0;
    }
}

EventEmitter.defaultMaxListeners = 10;

// Main GIF class
export class GIF extends EventEmitter {
    constructor(options = {}) {
        super();
        const defaults = {
            workerScript: 'gif.worker.js',
            workers: 2,
            repeat: 0,
            background: '#fff',
            quality: 10,
            width: null,
            height: null,
            transparent: null,
            debug: false,
            dither: false
        };

        this.running = false;
        this.options = { ...defaults };
        this.frames = [];
        this.freeWorkers = [];
        this.activeWorkers = [];
        
        this.setOptions(options);
    }

    setOption(key, value) {
        this.options[key] = value;
        if (this._canvas && (key === 'width' || key === 'height')) {
            this._canvas[key] = value;
        }
    }

    setOptions(options) {
        for (const key in options) {
            if (Object.hasOwn(options, key)) {
            this.setOption(key, options[key]);
            }
        }
    }

    addFrame(image, options = {}) {
        const frameDefaults = {
            delay: 500,
            copy: false,
            transparent: this.options.transparent
        };

        const frame = {};
        frame.transparent = this.options.transparent;
        for (const key in frameDefaults) {
            frame[key] = options[key] || frameDefaults[key];
        }
        
        if (!this.options.width) this.setOption('width', image.width);
        if (!this.options.height) this.setOption('height', image.height);

        if (image instanceof ImageData) {
            frame.data = image.data;
        } else if (image instanceof CanvasRenderingContext2D || image instanceof WebGLRenderingContext) {
            frame.data = options.copy ? this.getContextData(image) : frame.context = image;
        } else if (image.childNodes) {
            frame.data = options.copy ? this.getImageData(image) : frame.image = image;
        } else {
            throw new Error('Invalid image');
        }

        this.frames.push(frame);
        return frame;
    }

    render() {
        if (this.running) throw new Error('Already running');
        if (!this.options.width || !this.options.height) {
            throw new Error('Width and height must be set prior to rendering');
        }

        this.running = true;
        this.nextFrame = 0;
        this.finishedFrames = 0;
        this.imageParts = Array(this.frames.length).fill(null);

        const numWorkers = this.spawnWorkers();
        if (this.options.globalPalette === true) {
            this.renderNextFrame();
        } else {
            for (let i = 0; i < numWorkers; i++) {
            this.renderNextFrame();
            }
        }

        this.emit('start');
        this.emit('progress', 0);
    }

    abort() {
        let worker;
        while ((worker = this.activeWorkers.shift())) {
            this.log('killing active worker');
            worker.terminate();
        }
        this.running = false;
        this.emit('abort');
    }

    spawnWorkers() {
        const numWorkers = Math.min(this.options.workers, this.frames.length);
        
        Array.from({ length: numWorkers - this.freeWorkers.length }).forEach((_, i) => {
            this.log(`spawning worker ${i}`);
            const worker = new Worker(this.options.workerScript);
            
            worker.onmessage = (event) => {
            this.activeWorkers.splice(this.activeWorkers.indexOf(worker), 1);
            this.freeWorkers.push(worker);
            this.frameFinished(event.data);
            };
            
            this.freeWorkers.push(worker);
        });
        
        return numWorkers;
    }

    frameFinished(frame) {
        this.log(`frame ${frame.index} finished - ${this.activeWorkers.length} active`);
        this.finishedFrames++;
        this.emit('progress', this.finishedFrames / this.frames.length);
        this.imageParts[frame.index] = frame;

        if (this.options.globalPalette === true) {
            this.options.globalPalette = frame.globalPalette;
            this.log('global palette analyzed');
            if (this.frames.length > 2) {
            for (let i = 1; i < this.freeWorkers.length; i++) {
                this.renderNextFrame();
            }
            }
        }

        if (this.imageParts.includes(null)) {
            this.renderNextFrame();
        } else {
            this.finishRendering();
        }
    }

    finishRendering() {
        let len = 0;
        for (const frame of this.imageParts) {
            len += (frame.data.length - 1) * frame.pageSize + frame.cursor;
        }
        const lastFrame = this.imageParts[this.imageParts.length - 1];
        len += lastFrame.pageSize - lastFrame.cursor;

        this.log(`rendering finished - filesize ${Math.round(len / 1000)}kb`);
        const data = new Uint8Array(len);
        let offset = 0;

        for (const frame of this.imageParts) {
            for (let i = 0; i < frame.data.length; i++) {
            const page = frame.data[i];
            data.set(page, offset);
            if (i === frame.data.length - 1) {
                offset += frame.cursor;
            } else {
                offset += frame.pageSize;
            }
            }
        }

        const image = new Blob([data], { type: 'image/gif' });
        this.emit('finished', image, data);
    }

    renderNextFrame() {
        if (this.freeWorkers.length === 0) {
            throw new Error('No free workers');
        }
        if (this.nextFrame >= this.frames.length) {
            return;
        }

        const frame = this.frames[this.nextFrame++];
        const worker = this.freeWorkers.shift();
        const task = this.getTask(frame);

        this.log(`starting frame ${task.index + 1} of ${this.frames.length}`);
        this.activeWorkers.push(worker);
        worker.postMessage(task);
        }

        getContextData(ctx) {
        return ctx.getImageData(0, 0, this.options.width, this.options.height).data;
    }

    getImageData(image) {
        if (!this._canvas) {
          this._canvas = document.createElement('canvas');
          this._canvas.width = this.options.width;
          this._canvas.height = this.options.height;
        }
    
        const ctx = this._canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = this.options.background;
        ctx.fillRect(0, 0, this.options.width, this.options.height);
        ctx.drawImage(image, 0, 0);
    
        return this.getContextData(ctx);
    }

    getTask(frame) {
        const index = this.frames.indexOf(frame);
        const task = {
            index,
            last: index === this.frames.length - 1,
            delay: frame.delay,
            transparent: frame.transparent,
            width: this.options.width,
            height: this.options.height,
            quality: this.options.quality,
            dither: this.options.dither,
            globalPalette: this.options.globalPalette,
            repeat: this.options.repeat,
            canTransfer: browser.name === 'chrome'
        };

        if (frame.data != null) {
            task.data = frame.data;
        } else if (frame.context != null) {
            task.data = this.getContextData(frame.context);
        } else if (frame.image != null) {
            task.data = this.getImageData(frame.image);
        } else {
            throw new Error('Invalid frame');
        }

        return task;
    }

    log(...args) {
        if (!this.options.debug) return;
        console.log(...args);
    }
}

// Additional utility exports if needed
export { browser, EventEmitter };
