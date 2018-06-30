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
<<<<<<< HEAD
const tiles = 48;
const tileSize = 64;
const offset = 1;
=======
const tiles = 24;
const tileSize = 32;
const offset = 0.1;
>>>>>>> d627beb551820d99df599feb77552f8be74dd27d
const foodPerSnek = 5;
const moveScale = 1;
const defaultLength = 4;

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
    snake.message = newMsg;
    console.log('>>', con.id, data);
  });
});

setInterval(() => {
  // console.log(`snakes: ${snakes.length}`);
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
        if (fud.x === newX && fud.y === newY) {
          snake.len++;
          if (snakes.length * foodPerSnek < food.length) {
            food = food.filter(iFud => iFud.x !== fud.x && iFud.y !== fud.y);
          } else {
            fud.x = Math.floor(Math.random() * tiles);
            fud.y = Math.floor(Math.random() * tiles);
          }
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
      if (msg.life == 0) {
        let snek = snakes.filter(snake => snake.id === msg.id)[0];
        if (snek !== null) {
          snek.message = null;
        }
        messages = messages.filter(msg2 => msg2.id !== msg.id);
      }
    }
  });

  io.sockets.emit('data', data);
}, 1000 / 12);