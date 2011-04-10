"use strict";
if (!window.console) console = {};
console.log = console.log || function(){};
console.warn = console.warn || function(){};
console.error = console.error || function(){};
console.info = console.info || function(){};

String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : '{' + number + '}'
    ;
  });
};

var TAU = Math.PI * 2;

var KEY = {'left': 37, 'up': 38, 'right': 39, 'down': 40, 'x': 88, 'z': 90};

var canvas = null;
var ctx = null;

var world = {
    'sun_mass': 1e3,
    'sun_radius': 400,
    'camera': null,
    'keys': {},
    'grid_size': 100,
}

var actors = [];

// Called when the page is ready
function init() {
    canvas = $('#canvas')
    ctx = canvas[0].getContext("2d");

    window.addEventListener('keydown',
        function(event) {
            world.keys[event.keyCode] = true;
        },
        true);
    window.addEventListener('keyup',
        function(event) {
            world.keys[event.keyCode] = false;
        },
        true);

    world.ship = new Actor(world, {'x': world.sun_radius * 7, 'y': 0, 'vx': 0, 'vy': -2, 'mass': 30});
    world.ship = Ship(world.ship);
    actors.push(world.ship);
    world['camera'] = new Camera(world, {'zoom': 0.5, 'follow': world.ship});

    // make asteroids
    for (var i=0; i<150; i++) {
        var p = {};
        var d = Math.random() * (world.sun_radius * 3) + world.sun_radius * 5;
        var a = Math.random()*TAU;
        p.x = Math.cos(a) * d;
        p.y = Math.sin(a) * d;
        p.mass = Math.random() + 4.5;

        // Make the asteroids go ~in circles, at a stable speed.
        a -= TAU / 4;
        a += Math.random()*0.5 - 0.25;
        var v = 2.25*Math.sqrt((world.sun_mass * world.sun_mass) / ((p.mass + world.sun_mass) * d));
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v;

        p.vang = Math.random() * 0.06 - 0.03;
        actors.push(Asteroid(new Actor(world, p)));
    }

    return setInterval(main_draw,30);
}
$(document).ready(init);

function ui() {
    var border = [[30, 10], [canvas.width()-30, 10],
            [canvas.width()-10, 30], [canvas.width()-10, canvas.height()-30],
            [canvas.width()-30, canvas.height()-10], [30, canvas.height()-10],
            [10, canvas.height()-30],  [10, 30]];

    ctx.strokeStyle = "rgba(0,255,0,127)";
    ctx.fillStyle = "rgba(0,255,0,127)";

    ctx.beginPath();
        ctx.moveTo(border[0][0], border[0][1]);
        for (var i=1; i<border.length; i++) {
            ctx.lineTo(border[i][0], border[i][1]);
        }
    ctx.closePath();
    ctx.stroke();

    var v = world.ship.vel;
    ctx.fillText("Velocity:", 30, 30);
    ctx.fillText(world.ship.vel.m.toFixed(2), 80, 30);
    ctx.fillText("Distance:", 30, 40);
    ctx.fillText(world.ship.pos.m.toFixed(2), 80, 40);
}

var timestep = 1;
// Main loop
function main_draw() {
    // tick
    for (var i = 0; i < actors.length; i++) {
        actors[i].tick(timestep);
    }
    world.camera.tick();

    // draw
    ctx.save();
    world.camera.transform();
    draw_stars();
    for (var i = 0; i < actors.length; i++) {
        actors[i].draw();
    }
    ctx.restore();

    ui();

    return true;
}

function draw_stars() {
    // black out
    ctx.fillStyle = "rgb(0,0,0)";
    var bounds = world.camera.get_bounds();
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

    // grid
    if (world.camera.zoom > 0.25) {
        ctx.fillStyle = "rgb(255,255,255)";
        var start_x = bounds.x - (bounds.x % world.grid_size);
        var start_y = bounds.y - (bounds.y % world.grid_size);
        for(var x = start_x; x <= bounds.x + bounds.w; x+=world.grid_size) {
            for(var y = start_y; y <= bounds.y + bounds.h; y+=world.grid_size) {
                ctx.fillRect(x,y,2,2);
            }
        }
    }

    // draw the sun
    ctx.fillStyle = "rgb(255,127,10)";
    ctx.beginPath();
        ctx.arc(0, 0, world.sun_radius, world.sun_radius, 0, TAU);
    ctx.closePath();
    ctx.fill()
}

function _default_get(name, def) {
    if (name in this) {
        return this[name];
    } else {
        return def;
    }
}

// "Interface" to hold common functions
function Actor(world, params) {
    params.get = _default_get;

    var x = params.get('x', 0);
    var vx = params.get('vx', 0);
    var ax = params.get('ax', 0);

    var y = params.get('y', 0);
    var vy = params.get('vy', 0);
    var ay = params.get('ay', 0);

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

        this.vang += this.aang;
        this.aang = 0;
        this.ang += this.vang * t;

        var grav_mult = -1 * (this.mass * world.sun_mass) / Math.pow(this.pos.m, 3);
        var grav_vec = this.pos.copy().times(grav_mult);
        this.accel = this.accel.add(grav_vec);

        var vel = this.vel.times(t);
        var tSq = t*t;
        if (t < 0) {
            tSq = -tSq;
        }
        var newpos = this.pos.add(this.vel).add(this.accel.times(tSq));

        this.oldpos = this.pos;
        this.pos = newpos;

        this.accel = new Vector();
        this.oldt = t;
    }

    this.draw = function() {
        ctx.fillStyle = "rgb(255,0,0)";
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

    this.__defineGetter__('vel', function() {
        return this.pos.subtract(this.oldpos);
    });
}

function Camera(world, params) {
    this.world = world;
    params.get = _default_get;

    var x = params.get('x', 0);
    var y = params.get('y', 0);
    this.pos = new Vector().xy(x,y);
    this.ang = params.get('ang', 0);
    this.zoom = params.get('zoom', 1.0);
    this.follow = params.get('follow', null);

    this.tick = function() {
        if (this.follow) {
            this.pos = this.follow.pos;
        }
        if (world.keys[KEY.z]) {
            this.zoom /= 1.02;
        }
        if (world.keys[KEY.x]) {
            this.zoom *= 1.02;
        }
    }

    this.transform = function() {
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.pos.x, -this.pos.y);
        ctx.translate(canvas.width()/this.zoom/2, canvas.height()/this.zoom/2);
    }

    this.get_bounds = function(pos) {
        return new Bounds().centered_at(this.pos, canvas.width()/this.zoom, canvas.height()/this.zoom);
    }
}

function Asteroid(self) {
    self.shape = make_shape();

    self.draw = function() {
        var scale = 20;
        ctx.save();
            ctx.fillStyle = "rgb(60,60,60)";
            ctx.strokeStyle = "rgb(60,60,60)";
            ctx.lineWidth = 1.5/scale;
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(this.ang);
            ctx.scale(scale, scale);
            ctx.beginPath();
                ctx.moveTo(this.shape[0].x, this.shape[0].y);
                for (var i=1; i < this.shape.length; i++) {
                    ctx.lineTo(this.shape[i].x, this.shape[i].y);
                }
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        ctx.restore();
    }

    function make_shape() {
        var points = [];
        var ang = 0;
        do {
            var r = Math.random() * 0.6 + 0.7; // [0.7, 1.3)
            var x = Math.cos(ang) * r;
            var y = Math.sin(ang) * r;

            points.push({'x': x, 'y': y});
            ang += Math.random() * (TAU / 18) + (TAU / 18); // [TAU/18, TAU/9)
        } while(ang < TAU);
        return points;
    }

    return self;
}

function Ship(self) {
    self.thrust = 0.2;
    self.spin_thrust = 0.015;

    self.points = {
        'wing_l': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgb(65,65,65)",
            'points': [{'x':-7,'y':0}, {'x':-8,'y':1}, {'x':-8,'y':6}, {'x':-7,'y':6}],
        },
        'wing_r': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgb(65,65,65)",
            'points': [{'x':7,'y':6}, {'x':8,'y':6}, {'x':8,'y':1}, {'x':7,'y':0}],
        },
        'thruster_l': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgb(65,65,65)",
            'points': [{'x':-1,'y':7.5}, {'x':-3,'y':7.5}, {'x':-3.5,'y':9.5}, {'x':-0.5,'y':9.5}],
        },
        'thruster_r': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgb(65,65,65)",
            'points': [{'x':1,'y':7.5}, {'x':3,'y':7.5}, {'x':3.5,'y':9.5}, {'x':0.5,'y':9.5}],
        },
        'body': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgb(150,20,30)",
            'points': [
                {'x':1, 'y':-9}, {'x':1.5,'y':-8}, {'x':3,'y':0}, {'x':6,'y':2}, {'x':7,'y':2},
                {'x':7,'y':5.5}, {'x':6,'y':5}, {'x':3,'y':5}, {'x':3.5,'y':7.5},
                {'x':-3.5,'y':7.5}, {'x':-3,'y':5}, {'x':-6,'y':5}, {'x':-7,'y':5.5},
                {'x':-7,'y':2}, {'x':-6,'y':2}, {'x':-3,'y':0}, {'x':-1.5,'y':-8}, {'x':-1, 'y':-9}
            ],
        },
        'cockpit': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgb(65,65,65)",
            'points': [{'x':2,'y':-1}, {'x':1.25,'y':-5}, {'x':-1.25,'y':-5}, {'x':-2,'y':-1}]
        },
        'gun': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgb(65,65,65)",
            'points': [{'x':0.5,'y':-7}, {'x':0.4,'y':-11}, {'x':-0.4,'y':-11}, {'x':-0.5,'y':-7}]
        },
        'seam1': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgba(0,0,0,0)",
            'points': [{'x':-3,'y':0}, {'x':-3,'y':5},],
        },
        'seam2': {
            'stroke': "rgb(0,0,0)",
            'fill': "rgba(0,0,0,0)",
            'points': [{'x':3,'y':5}, {'x':3,'y':0}],
        }
    }

    self.parent_tick = self.tick;
    self.tick = function(t) {
        if (world.keys[KEY.up]) {
            this.accel = this.accel.add(new Vector().polar(this.thrust, this.ang));
            console.log('up');
        }
        if (world.keys[KEY.down]) {
            this.accel = this.accel.add(new Vector().polar(-this.thrust/2, this.ang));
            console.log('down');
        }
        if (world.keys[KEY.left]) {
            this.aang -= this.spin_thrust;
            console.log('left');
        }
        if (world.keys[KEY.right]) {
            this.aang += this.spin_thrust;
            console.log('right');
        }
        this.parent_tick(t);

        this.vx *= 0.9;
        this.vy *= 0.9;
        this.vang *= 0.9;
    }

    self.draw = function() {
        ctx.save();
            var scale = 2.5;
            ctx.translate(this.pos.x, this.pos.y);
            ctx.scale(scale, scale);
            ctx.rotate(this.ang + TAU/4);

            ctx.strokeStyle = "rgb(65,65,65)";
            ctx.lineWidth = 0.5 / scale;
            ctx.fillStyle = "rgb(190,190,190)";

            for(var name in self.points) {
                var part = self.points[name];
                ctx.strokeStyle = part['stroke'];
                ctx.fillStyle = part['fill'];
                ctx.beginPath();
                    ctx.moveTo(part.points[0].x, part.points[0].y);
                    for(var i=1; i<part.points.length; i++) {
                        ctx.lineTo(part.points[i].x, part.points[i].y);
                    }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        ctx.restore();
    }
    return self;
}

/****** UTILITIES *******/
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
        return "({0}, {1})".format(this.x.toFixed(2), this.y.toFixed(2));
    }

    this.copy = function() {
        var v = new Vector();
        v.x = this.x;
        v.y = this.y;
        v.a = this.a;
        v.m = this.m;
        return v;
    }
}

function Bounds() {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;

    this.centered_at = function(pos, w, h) {
        this.x = pos.x - w/2;
        this.y = pos.y - h/2;
        this.w = w;
        this.h = h;
        return this;
    }

    this.contains = function(pos) {
        return (pos.x > this.x && pos.y > this.y &&
            pos.x < this.x + this.w && pos.y < this.y + this.h);
    }
}
