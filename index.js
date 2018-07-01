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
const boostFactor = 5;

const checkProximity = (x1, y1, x2, y2, leeway) => {
  len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  if (Math.abs(len) < leeway) {
    return true;
  } else {
    return false;
  }
};

const newFood = (
  x = Math.floor(Math.random() * tiles),
  y = Math.floor(Math.random() * tiles),
  perishable = false
) => {
  return {
    x,
    y,
    size: tileSize,
    perishable
  };
};

io.on('connection', con => {
  console.log(con.id, 'made connection');
  messages.push({
    id: con.id,
    col: 'blue',
    message: '## Welcome new snek! ##',
    name: 'SYS',
    life: 50
  });
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
    food.push(newFood());
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
      case 'boost':
        if (snake.len > 1) {
          snake.dx = snake.dx * boostFactor;
          snake.dy = snake.dy * boostFactor;
          snake.len--;
          food.push(newFood(snake.blocks[0].x, snake.blocks[0].y, true));
        }
      default:
        break;
    }
  });
  con.on('disconnecting', reason => {
    console.log(con.id, 'disconnecting');
    snakes = snakes.filter(snake => snake.id !== con.id);
    messages.push({
      id: con.id,
      col: 'blue',
      message: '## Goodbye fellow snek! ##',
      name: 'SYS',
      life: 50
    });
    food.splice(0, foodPerSnek);
  });
  con.on('message', data => {
    let newMsg = {
      id: con.id,
      col: snakes.filter(snake => snake.id === con.id)[0].col,
      message: data,
      name: undefined,
      life: 150
    };
    if (snakes.filter(snake => snake.id === con.id)[0].name !== undefined) {
      newMsg.name = snakes.filter(snake => snake.id === con.id)[0].name;
    }
    messages.push(newMsg);
    snake = snakes.filter(snake => snake.id === con.id)[0];
    if (snake !== null) {
      snake.message = null;
      snake.message = newMsg;
    }
    console.log('>>', con.id, data);
  });
  con.on('name', data => {
    const newMsg = {
      id: con.id,
      col: 'blue',
      message: 'Snek changed their name!',
      name: 'SYS',
      life: 50
    };
    messages.push(newMsg);
    snakes.filter(snake => snake.id === con.id)[0].name = data
      .slice(0, 3)
      .toUpperCase();
  });
});

ticker = 0;

setInterval(() => {
  if (messages.length === 0) {
    ticker = 0;
  } else {
    ticker++;
  }
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
          if (fud.perishable) {
            food = food.filter(f => !(f.x === fud.x && f.y === fud.y));
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
      snakes.filter(snk => snk.id !== snake.id).forEach(snake2 => {
        for (let i = 0; i < snake2.blocks.length; i++) {
          if (
            checkProximity(
              snake2.blocks[i].x,
              snake2.blocks[i].y,
              newX,
              newY,
              1
            )
          ) {
            if (i < snake2.len - 1) {
              snake.len += i + 1;
              snake2.len -= i + 1;
              snake2.blocks.splice(0, i);
              break;
            } else {
              if (snake2.len > snake.len) {
                snake2.len += snake.len - 1;
                snake.len = 1;
              } else if (snake2.len < snake.len) {
                snake.len += snake2.len - 1;
                snake2.len = 1;
              }
              snake.dx = -snake.dx;
              snake.dy = -snake.dy;
              snake2.dx = -snake2.dx;
              snake2.dy = -snake2.dy;
            }
          }
        }
      });
    }
    if (Math.abs(snake.dx) > 1 || Math.abs(snake.dy) > 1) {
      if (snake.dx !== 0) {
        snake.dx = snake.dx / boostFactor;
      }
      if (snake.dy !== 0) {
        snake.dy = snake.dy / boostFactor;
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
