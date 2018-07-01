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
let scaleFacter = 1;

let tiles = 48 * scaleFacter;
let tileSize = 128 / scaleFacter;
const offset = 4;
const foodPerSnek = 4;
const moveScale = 1;
const defaultLength = 4;
const boostFactor = 1;

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
    dead: false,
    boost: false,
    name: 'snek' + snakes.length
  });
  for (let i = 0; i < foodPerSnek; i++) {
    food.push(newFood());
  }

  con.on('move', data => {
    const snake = snakes.filter(snake => snake.id === con.id)[0];
    if (snake !== undefined) {
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
            if (!snake.boost) {
              snake.boost = true;
            } else {
              snake.boost = false;
            }
          }
        default:
          break;
      }
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
    snakes.filter(snake => snake.id === con.id)[0].name = data.slice(0, 8);
  });

  con.on('col', data => {
    snakes.filter(snake => snake.id === con.id)[0].col = data;
  });

  // if (snakes.length >= scaleFacter * 4) {
  //   scaleFacter += 0.1;
  //   tiles = Math.floor(tiles * scaleFacter);
  //   tileSize = Math.floor(tileSize / scaleFacter);
  // }
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
      snake.blocks.push({ x: newX, y: newY, size: tileSize });
      while (snake.blocks.length > snake.len) {
        snake.blocks.splice(0, 1);
      }
      snakes
        .filter(snk => !snk.dead)
        .filter(snk => snk.id !== snake.id)
        .forEach(snake2 => {
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
              if (i === snake2.len - 1) {
                // dead snek
                snakes.push({
                  id: snake2.id,
                  blocks: [
                    {
                      x: Math.floor(Math.random() * tiles),
                      y: Math.floor(Math.random() * tiles)
                    }
                  ],
                  dx: 1,
                  dy: 0,
                  len: defaultLength,
                  col: `rgb(${Math.random() * 255},${Math.random() *
                    255},${Math.random() * 255})`,
                  message: null,
                  name: snake2.name,
                  dead: false,
                  boost: false
                });
                messages.push({
                  id: snake2.id,
                  col: snake2.col,
                  message: '## Snek died!',
                  name: snake2.name,
                  life: 50
                });
                snake2.dead = true;
                snake2.id = null;
                snake2.name = 'X_X';
                snake2.col = 'rgba(0,0,0,0.5)';
                snake.len += snake.len;
              } else if (i < snake2.len - 1) {
                snake.len += i + 1;
                snake2.len -= i + 1;
                snake2.blocks.splice(0, i);
                break;
              } else {
                if (snake2.len > snake.len) {
                  snake2.len += snake.len;
                  snake.len = 1;
                } else if (snake2.len < snake.len) {
                  snake.len += snake2.len;
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
      // boost handler
      if (snake.boost) {
        if (snake.len > 5) {
          for (let i = 0; i < boostFactor; i++) {
            snake.blocks.push({
              x: snake.blocks[snake.blocks.length - 1].x + snake.dx,
              y: snake.blocks[snake.blocks.length - 1].y + snake.dy
            });
            snake.len--;
            food.push(newFood(snake.blocks[0].x, snake.blocks[0].y, true));
          }
        } else {
          snake.boost = false;
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
    if (ticker > 50) {
      messages.splice(0, 1);
    }
  } else {
    if (ticker > 500) {
      let ded = snakes.filter(snk => snk.dead);
      if (ded.length > 0) {
        snakes = snakes.filter(snk => snk.id !== ded[0].id);
      }
      messages.splice(0, 1);
      ticker = 0;
    }
  }

  io.sockets.emit('data', data);
}, 1000 / 18);
