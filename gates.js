if (!window.console) console = {};
console.log = console.log || function(){};
console.warn = console.warn || function(){};
console.error = console.error || function(){};
console.info = console.info || function(){};

TWOPI = Math.PI * 2;

canvas = null;
ctx = null;

width = null;
height = null;

world = {
    'G': 1,
    'center_mass': 3e2,
}

actors = new Array();

// Called when the page is ready
function init() {
    canvas = $('#canvas')
    ctx = canvas[0].getContext("2d");

    width = canvas.width();
    height = canvas.height();

    ui();
    main_draw();

    actors.push(new Actor({'x': 50, 'y': 50, 'vx': 2, 'vy': 1, 'vang': 0.1}));

    return setInterval(main_draw,30);
}
$(document).ready(init);

function ui() {
}

timestep = 1;
// Main loop
function main_draw() {
    // tick
    for (var i = 0; i < actors.length; i++) {
        actors[i].tick(timestep);
    }

    // draw
    ctx.save();
    ctx.translate(10,10);
    draw_stars();
    for (var i = 0; i < actors.length; i++) {
        actors[i].draw();
    }
    ctx.restore();
    return true;
}

function draw_stars() {
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0,0,width,height);
}

// "Interface" to hold common functions
function Actor(params) {
    params.get = function(name, def) {
        if (name in params) {
            return params[name];
        } else {
            return def;
        }
    }

    x = params.get('x', 0);
    vx = params.get('vx', 0);
    ax = params.get('ax', 0);

    y = params.get('y', 0);
    vy = params.get('vy', 0);
    ay = params.get('ay', 0);

    this.ang = params.get('ang', 0);
    this.vang = params.get('vang', 0);
    this.aang = params.get('aang', 0);

    this.mass = params.get('mass', 1);
    this.radius = params.get('radius', 10);

    this.pos = new Vector().xy(x,y);
    this.oldpos = new Vector().xy(x-vx, y-vy);
    this.accel = new Vector().xy(ax,ay);

    this.oldt = 1;

    this.tick = function(t) {
        var tcv = t / this.oldt;

        this.ang += this.vang * t;

        grav_mult = -1 * (this.mass * world.center_mass * world.G) / Math.pow(this.pos.m, 3);
        grav_vec = this.pos.copy().times(grav_mult);
        this.accel = this.accel.add(grav_vec);

        var vel = this.pos.subtract(this.oldpos).times(tcv);
        var tSq = t*t;
        if (t < 0) {
            tSq = -tSq;
        }
        var newpos = this.pos.add(vel).add(this.accel.times(tSq));

        this.oldpos = this.pos;
        this.pos = newpos;

        this.accel = new Vector();
        this.oldt = t;
    }

    this.draw = function() {
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(this.ang);
            ctx.beginPath();
                ctx.moveTo(-this.radius, -this.radius);
                ctx.lineTo( this.radius, -this.radius);
                ctx.lineTo( this.radius,  this.radius);
                ctx.lineTo(-this.radius,  this.radius);
            ctx.closePath();
            ctx.fill();
        ctx.restore();
    }
}

function Vector() {
    this.x = 0;
    this.y = 0;
    this.a = 0;
    this.m = 0;

    this.xy = function(x,y) {
        this.x = x;
        this.y = y;
        this.updatePolar();
        return this;
    }

    this.polar = function(m,a) {
        this.m = m;
        this.a = a;
        this.updateXY();
        return this;
    }

    this.updateXY = function() {
        this.x = this.m * Math.cos(this.a);
        this.y = this.m * Math.sin(this.a);
    }

    this.updatePolar = function() {
        this.m = Math.sqrt(this.x*this.x + this.y*this.y);
        this.a = Math.atan2(this.y,this.x);
    }

    this.add = function(v1) {
        return new Vector().xy(this.x + v1.x, this.y + v1.y);
    }

    this.subtract = function(v1) {
        return new Vector().xy(this.x - v1.x, this.y - v1.y);
    }

    this.times = function(s) {
        return new Vector().polar(this.m * s, this.a);
    }

    this.divide = function(s) {
        return new Vector().polar(this.m / s, this.a);
    }

    this.unit = function() {
        return new Vector.polar(this.a, 1);
    }

    this.dot = function(v) {
        return this.x * v.x + this.y * v.y;
    }

    // calculates a right hand normal
    this.normal = function() {
        return new Vector().xy(-this.y, this.x).unit();
    }

    this.toString = function() {
        return "(" + this.x + ", " + this.y + ")";
    }

    this.copy = function() {
        v = new Vector();
        v.x = this.x;
        v.y = this.y;
        v.a = this.a;
        v.m = this.m;
        return v;
    }
}
