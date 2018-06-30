var express = require('express');
var socket = require('socket.io');

var app = express();
var server = app.listen(8080, () => {
  console.log('listening on port 8080');
});

app.use(express.static('public'));

var io = socket(server);

let snakes = [];
let food = [];
let messages = [];
const startTime = null;

const tiles = 48;
const tileSize = 64;
const offset = 4;
const foodPerSnek = 4;
const moveScale = 0.5;
const defaultLength = 16;

const checkProximity = (x1, y1, x2, y2, leeway) => {
  len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  if (Math.abs(len) < leeway) {
    return true;
  } else {
    return false;
  }
};

io.on('connection', con => {
  console.log(con.id, 'made connection');
  snakes.push({
    id: con.id,
    blocks: [
      {
        x: Math.floor(Math.random() * tiles),
        y: Math.floor(Math.random() * tiles)
      }
    ],
    dx: 1,
    dy: 0,
    len: defaultLength,
    col: `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() *
      255})`,
    message: null,
    dead: false
  });
  for (let i = 0; i < foodPerSnek; i++) {
    food.push({
      x: Math.floor(Math.random() * tiles),
      y: Math.floor(Math.random() * tiles),
      size: tileSize
    });
  }

  con.on('move', data => {
    const snake = snakes.filter(snake => snake.id === con.id)[0];
    switch (data) {
      case 'u':
        snake.dx = 0;
        snake.dy = -1;
        break;
      case 'l':
        snake.dx = -1;
        snake.dy = 0;
        break;
      case 'd':
        snake.dx = 0;
        snake.dy = 1;
        break;
      case 'r':
        snake.dx = 1;
        snake.dy = 0;
        break;
      default:
        break;
    }
  });
  con.on('disconnecting', reason => {
    console.log(con.id, 'disconnecting');
    snakes = snakes.filter(snake => snake.id !== con.id);
  });
  con.on('message', data => {
    const newMsg = {
      id: con.id,
      col: snakes.filter(snake => snake.id === con.id)[0].col,
      message: data,
      life: 50
    };
    messages.push(newMsg);
    snake = snakes.filter(snake => snake.id === con.id)[0];
    if (snake !== null) {
      snake.message = null;
      snake.message = newMsg;
    }
    console.log('>>', con.id, data);
  });
});

ticker = 0;
setInterval(() => {
  ticker++;
  snakes.forEach(snake => {
    if (!snake.dead) {
      const newX =
        (snake.blocks[snake.blocks.length - 1].x +
          snake.dx * moveScale +
          tiles) %
        tiles;
      const newY =
        (snake.blocks[snake.blocks.length - 1].y +
          snake.dy * moveScale +
          tiles) %
        tiles;
      food.forEach(fud => {
        if (checkProximity(fud.x, fud.y, newX, newY, 1) === true) {
          snake.len++;
          fud.x = Math.floor(Math.random() * tiles);
          fud.y = Math.floor(Math.random() * tiles);
        }
      });
      snake.blocks.push({ x: newX, y: newY });
      while (snake.blocks.length > snake.len) {
        snake.blocks.splice(0, 1);
      }
      let offset = Math.min(4, snake.blocks.length);
      for (let i = 0; i < snake.blocks.length; i++) {
        snake.blocks[snake.blocks.length - 1 - i].size = tileSize - offset;
        if (tileSize - offset > 24) {
          offset += 0.64;
        }
      }
    }
  });

  let data = {
    snakes,
    food,
    messages,
    meta: { tiles, tileSize, offset }
  };

  messages.forEach(msg => {
    if (msg.life > 0) {
      msg.life--;
    }
  });

  if (messages.length > 10) {
    if (ticker > 10) {
      messages.splice(0, 1);
    }
  } else {
    if (ticker > 200) {
      messages.splice(0, 1);
      ticker = 0;
    }
  }

  io.sockets.emit('data', data);
}, 1000 / 30);
