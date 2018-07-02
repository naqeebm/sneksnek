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

let tiles = 58 * scaleFacter;
let tileSize = 118 / scaleFacter;
const offset = 4;
const foodPerSnek = 4;
const moveScale = 1;
const defaultLength = 4;
const boostFactor = 1;
const foodMaxWeight = 5;

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
    weight: perishable ? 1 : Math.floor(Math.random() * foodMaxWeight),
    size: tileSize,
    perishable
  };
};

const newSnake = (id, name = 'snek' + snakes.length) => {
  return {
    id,
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
    name
  };
};

const killSnake = snake => {
  const name = snake.name;
  const id = snake.id;
  setTimeout(() => {
    snakes.push({
      id: id,
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
      name: name,
      dead: false,
      boost: false
    });
  }, 2500);

  messages.push({
    id: snake.id,
    col: snake.col,
    message: '## Snek ' + snake.name + ' died!',
    name: snake.name,
    life: 50
  });
  snake.dead = true;
  snake.id = null;
  snake.name = 'X_X';
  snake.col = 'rgba(0,0,0,0.5)';
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
  const thisSnake = newSnake(con.id);
  snakes.push(thisSnake);

  for (let i = 0; i < foodPerSnek; i++) {
    food.push(newFood());
  }

  con.on('move', data => {
    switch (data) {
      case 'u':
        thisSnake.dx = 0;
        thisSnake.dy = -1;
        break;
      case 'l':
        thisSnake.dx = -1;
        thisSnake.dy = 0;
        break;
      case 'd':
        thisSnake.dx = 0;
        thisSnake.dy = 1;
        break;
      case 'r':
        thisSnake.dx = 1;
        thisSnake.dy = 0;
        break;
      case 'boost':
        if (thisSnake.len > 1) {
          if (!thisSnake.boost) {
            thisSnake.boost = true;
          } else {
            thisSnake.boost = false;
          }
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
      col: thisSnake.col,
      message: data,
      name: undefined,
      life: 150
    };
    if (thisSnake.name !== undefined) {
      newMsg.name = thisSnake.name;
    }
    messages.push(newMsg);
    thisSnake.message = null; // ?
    thisSnake.message = newMsg;
    console.log('>>', con.id, thisSnake.name, data);
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
    thisSnake.name = data.slice(0, 8);
  });

  con.on('col', data => {
    thisSnake.col = data;
  });

  con.on('request', data => {
    switch (data) {
      case 'kms':
        killSnake(thisSnake);
        break;
      case 'comp':
        snakes.push(newSnake(-1, 'COMP'));
        break;
      case 'delcomp':
        snakes.filter(snk => snk.id === -1).map(snk => {
          snk.dead = true;
          snk.col = 'darkslategrey';
          snk.name = 'X_X';
        });
      default:
        break;
    }
  });
  // resize map when more players
  // if (snakes.length >= scaleFacter * 4) {
  //   scaleFacter += 0.1;
  //   tiles = Math.floor(tiles * scaleFacter);
  //   tileSize = Math.floor(tileSize / scaleFacter);
  // }
});

ticker = 0;

setInterval(() => {
  if (messages.length !== 0) {
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
        if (checkProximity(fud.x, fud.y, newX, newY, 2) === true) {
          snake.len += fud.weight;
          if (fud.perishable) {
            food = food.filter(f => !(f.x === fud.x && f.y === fud.y));
          } else {
            fud.x = Math.floor(Math.random() * tiles);
            fud.y = Math.floor(Math.random() * tiles);
            fud.weight = Math.floor(Math.random() * foodMaxWeight);
          }
        }
      });

      snake.blocks.push({ x: newX, y: newY, size: tileSize });
      snake.blocks.splice(0, snake.blocks.length - snake.len);

      snakes.filter(snk => !snk.dead && snk.id !== snake.id).forEach(snake2 => {
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
              if (snake.len > snake2.len) {
                snake.len += snake2.len;
                killSnake(snake2);
              } else if (snake.len < snake2.len) {
                snake2.len += snake.len;
                killSnake(snake);
              }
            } else {
              snake.dx = -snake.dx;
              snake.dy = -snake.dy;
            }
          }
        }
      });
      // self collision
      const ownBlocks = snake.blocks;
      for (let i = 0; i < ownBlocks.length - 2; i++) {
        if (checkProximity(ownBlocks[i].x, ownBlocks[i].y, newX, newY, 1)) {
          for (let j = 0; j <= i; j++) {
            food.push(newFood(snake.blocks[0].x, snake.blocks[0].y, true));
            snake.blocks.splice(0, 1);
            snake.len--;
          }
          break;
        }
      }
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

  messages.forEach(msg => {
    if (msg.life > 0) {
      msg.life--;
    } else {
      const snake = snakes.filter(snk => snk.id === msg.id)[0];
      if (snake !== undefined) {
        snake.message = null;
      }
    }
  });

  if (messages.length > 10) {
    if (ticker > 10) {
      messages.splice(0, 1);
      ticker = 0;
    }
  } else {
    if (ticker > 100) {
      let ded = snakes.filter(snk => snk.dead);
      if (ded.length > 0) {
        snakes = snakes.filter(snk => snk.id !== ded[0].id);
      }
      messages.splice(0, 1);
      ticker = 0;
    }
  }

  let data = {
    snakes,
    food,
    messages,
    meta: { tiles, tileSize, offset }
  };

  io.sockets.emit('data', data);
}, 1000 / 18);
