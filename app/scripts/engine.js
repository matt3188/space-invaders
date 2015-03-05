/* global GameScreen, Sprites, AlienFlock, GameBoard, GameScreen */

// Needed for proper code
'use strict';

var Game = new function() {
  var KEY_CODES = {
    37: 'left',
    39: 'right',
    32: 'fire'
  };
  this.keys = {};

  this.initialize = function(canvasDom, levelData, spriteData, callbacks) {
    this.canvasElem = $(canvasDom)[0];
    this.canvas = this.canvasElem.getContext('2d');
    this.width = $(this.canvasElem).attr('width');
    this.height = $(this.canvasElem).attr('height');

    $(window).keydown(function(event) {
      if (KEY_CODES[event.keyCode]) {
        Game.keys[KEY_CODES[event.keyCode]] = true;
      }
    });

    $(window).keyup(function(event) {
      if (KEY_CODES[event.keyCode]) {
        Game.keys[KEY_CODES[event.keyCode]] = false;
      }
    });

    this.levelData = levelData;
    this.callbacks = callbacks;
    Sprites.load(spriteData, this.callbacks.start);
  };

  this.loadBoard = function(board) {
    Game.board = board;
  };

  this.loop = function() {
    Game.board.step(30 / 1000);
    Game.board.render(Game.canvas);
    setTimeout(Game.loop, 30);
  };
};

var Sprites = new function() {
  this.map = {};

  this.load = function(spriteData, callback) {
    this.map = spriteData;
    this.image = new Image();
    this.image.onload = callback;
    this.image.src = 'images/sprites.png';
  };

  this.draw = function(canvas, sprite, x, y, frame) {
    var s = this.map[sprite];
    if (!frame) {
      frame = 0;
    }
    canvas.drawImage(this.image, s.sx + frame * s.w, s.sy, s.w, s.h, x, y, s.w, s.h);
  };
};

var GameScreen = function GameScreen(text, text2, callback) {
  this.step = function() {
    if (Game.keys.fire && callback) {
      callback();
    }
  };

  this.render = function(canvas) {
    canvas.clearRect(0, 0, Game.width, Game.height);
    canvas.font = 'bold 40px arial';
    var measure = canvas.measureText(text);
    canvas.fillStyle = '#FFFFFF';
    canvas.fillText(text, Game.width / 2 - measure.width / 2, Game.height / 2);
    canvas.font = 'bold 20px arial';
    var measure2 = canvas.measureText(text2);
    canvas.fillText(text2, Game.width / 2 - measure2.width / 2, Game.height / 2 + 40);
  };
};

var GameBoard = function GameBoard(levelNumber) {
  this.removedObjs = [];
  this.missiles = 0;
  this.level = levelNumber;
  var board = this;

  this.add = function(obj) {
    obj.board = this;
    this.objects.push(obj);
    return obj;
  };
  this.remove = function(obj) {
    this.removedObjs.push(obj);
  };

  this.addSprite = function(name, x, y, opts) {
    var sprite = this.add(new Sprites.map[name].cls(opts));
    sprite.name = name;
    sprite.x = x;
    sprite.y = y;
    sprite.w = Sprites.map[name].w;
    sprite.h = Sprites.map[name].h;
    return sprite;
  };


  this.iterate = function(func) {
    for (var i = 0, len = this.objects.length; i < len; i++) {
      func.call(this.objects[i]);
    }
  };

  this.detect = function(func) {
    for (var i = 0, len = this.objects.length; i < len; i++) {
      if (func.call(this.objects[i])) {
        return this.objects[i];
      }
    }
    return false;
  };

  this.step = function(dt) {
    this.removedObjs = [];
    this.iterate(function() {
      if (!this.step(dt)) {
        this.die();
      }
    });

    for (var i = 0, len = this.removedObjs.length; i < len; i++) {
      var idx = this.objects.indexOf(this.removedObjs[i]);
      if (idx !== -1) {
        this.objects.splice(idx, 1);
      }
    }
  };

  this.render = function(canvas) {
    canvas.clearRect(0, 0, Game.width, Game.height);
    this.iterate(function() {
      this.draw(canvas);
    });
  };

  this.collision = function(o1, o2) {
    return !((o1.y + o1.h - 1 < o2.y) || (o1.y > o2.y + o2.h - 1) ||
      (o1.x + o1.w - 1 < o2.x) || (o1.x > o2.x + o2.w - 1));
  };

  this.collide = function(obj) {
    return this.detect(function() {
      if (obj != this && !this.invulnrable) {
        return board.collision(obj, this) ? this : false;
      }
    });
  };

  this.loadLevel = function(level) {
    this.objects = [];
    this.player = this.addSprite('player', // Sprite
      Game.width / 2, // X
      Game.height - Sprites.map.player.h - 10); // Y

    var flock = this.add(new AlienFlock());
    for (var y = 0, rows = level.length; y < rows; y++) {
      for (var x = 0, cols = level[y].length; x < cols; x++) {
        var alien = Sprites.map['alien' + level[y][x]];
        if (alien) {
          this.addSprite('alien' + level[y][x], // Which Sprite
            (alien.w + 10) * x, // X
            alien.h * y, // Y
            {
              flock: flock
            }); // Options
        }
      }
    }
  };

  this.nextLevel = function() {
    return Game.levelData[levelNumber + 1] ? (levelNumber + 1) : false;
  };

  this.loadLevel(Game.levelData[levelNumber]);
};

var GameAudio = new function(a) {
  this.loadQueue = [];
  this.loadingSounds = 0;
  this.sounds = {};

  var channelMax = 10;
  var audioChannels = [];
  for (a = 0; a < channelMax; a++) {
    audioChannels.a = [];
    audioChannels.a.channel = new Audio();
    audioChannels.a.finished = -1;
  }

  this.load = function(files, callback) {
    var audioCallback = function() {
      GameAudio.finished(callback);
    };

    for (var name in files) {
      var filename = files[name];
      this.loadingSounds++;
      var snd = new Audio();
      this.sounds[name] = snd;
      snd.addEventListener('canplaythrough', audioCallback, false);
      snd.src = filename;
      snd.load();
    }
  };

  this.finished = function(callback) {
    this.loadingSounds--;
    if (this.loadingSounds === 0) {
      callback();
    }
  };

  this.play = function(s) {
    for (a = 0; a < audioChannels.length; a++) {
      var thistime = new Date();
      if (audioChannels.a.finished < thistime.getTime()) {
        audioChannels.a.finished = thistime.getTime() + this.sounds[s].duration * 1000;
        audioChannels.a.channel.src = this.sounds[s].src;
        audioChannels.a.channel.load();
        audioChannels.a.channel.play();
        break;
      }
    }
  };
};
