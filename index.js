var express = require('express');
var socket = require('socket.io');

var app = express();
var server = app.listen(8080, () => {
  console.log('listening on port 8080');
});

app.use(express.static('public'));

var io = socket(server);

const startTime = new Date().getTime();

let snakes = [];
let comps = [];

let messages = [];
let scaleFacter = 1;

let tiles = 58 * scaleFacter;
let tileSize = 118 / scaleFacter;
const offset = 4;
const foodPerSnek = 0;
const moveScale = 1;
const compLength = 4;
const defaultLength = 6;
const boostFactor = 1;
const foodMaxWeight = 5;
const maxFoodNo = 4;

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

const newPerishableFoodWithWeight = weight => {
  let newFood = newFood(
    Math.floor(Math.random() * tiles),
    Math.floor(Math.random() * tiles),
    true
  );
  newFood.weight = weight;
  return newFood;
};

let food = [];
for (let i = 0; i < maxFoodNo; i++) {
  food.push(newFood());
}

const removeMessagesHead = () => {
  if (messages.length > 0) {
    let snk = snakes.filter(snk => snk.id === messages[0].id)[0];
    if (snk !== undefined) {
      snk.message = null;
    }
    messages.splice(0, 1);
  }
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
    len: id === -1 ? compLength : defaultLength,
    col: `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() *
      255})`,
    message: null,
    dead: false,
    boost: false,
    lastMove: '',
    name
  };
};

const killSnake = snake => {
  const name = snake.name;
  const id = snake.id;
  setTimeout(() => {
    snake.dead = false;
    snake.name = name;
    snake.col = `rgb(${Math.random() * 255},${Math.random() *
      255},${Math.random() * 255})`;
    snake.len = defaultLength;
    snake.blocks = [
      {
        x: Math.floor(Math.random() * tiles),
        y: Math.floor(Math.random() * tiles)
      }
    ];
  }, 2500);

  messages.push({
    id: snake.id,
    col: snake.col,
    message: '## Snek ' + snake.name + ' died!',
    name: snake.name,
    life: 50
  });

  snake.dead = true;
  snake.name = 'X_X';
  snake.col = 'rgba(0,0,0,0.5)';
};

const makeMove = (snake, move) => {
  // console.log(snake.id, move);
  switch (move) {
    case 'u':
      snake.lastMove = move;
      snake.dx = 0;
      snake.dy = -1;
      break;
    case 'l':
      snake.lastMove = move;
      snake.dx = -1;
      snake.dy = 0;
      break;
    case 'd':
      snake.lastMove = move;
      snake.dx = 0;
      snake.dy = 1;
      break;
    case 'r':
      snake.lastMove = move;
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
};

io.on('connection', con => {
  io.to(con.id).emit('id', con.id);
  console.log(con.id, 'made connection');
  messages.push({
    id: con.id,
    col: 'blue',
    message: '## Welcome new snek! ##',
    name: 'SYS',
    life: 50
  });

  let thisSnake = newSnake(con.id);
  snakes.push(thisSnake);

  for (let i = 0; i < foodPerSnek; i++) {
    food.push(newFood());
  }

  con.on('move', data => {
    makeMove(thisSnake, data);
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
    // food.splice(0, foodPerSnek);
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
    console.log('req', data);
    switch (data) {
      case 'kms':
        killSnake(thisSnake);
        break;
      case 'comp':
        const newComp = newSnake(-(comps.length + 1), 'COMP');
        snakes.push(newComp);
        comps.push(newComp);
        break;
      case 'rmcomps':
        snakes.filter(snk => snk.id < 0).forEach(snk2 => {
          snk2.dead = true;
          snk2.col = 'darkslategrey';
          snk2.name = 'X_X';
        });
        comps = [];
      case 'info':
        console.log('snakes');
        for (let i = 0; i < snakes.length; i++) {
          console.log(
            `id: [${snakes[i].id}], name: [${snakes[i].name}], msg: [${
              snakes[i].message
            }], ded: [${snakes[i].dead}], type:[${
              comps.filter(cmp => cmp.id === snakes[i].id).length > 0
                ? 'C'
                : 'P'
            }]`
          );
        }
        break;
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
  // LOG let timer = { time: new Date().getTime(), data: 0 };
  if (messages.length !== 0) {
    ticker++;
    // LOG timer.data++;
  }
  comps.forEach(comp => {
    // LOG timer.data++;
    if (!comp.dead) {
      // LOG timer.data++;
      const nd = new Date();
      if (nd.getTime() % 31 === 0) {
        // LOG timer.data++;
        makeMove(comp, ['u', 'd', 'l', 'r'][Math.floor(Math.random() * 4)]);
      }
      if (nd.getTime() % 197 === 0) {
        const newMessage = {
          id: comp.id,
          col: comp.col,
          message: 'snek snek!',
          name: comp.name,
          life: 50
        };
        comp.message = newMessage;
        messages.push(newMessage);
      }
      // LOG timer.data++;
    }
  });
  snakes.forEach(snake => {
    // LOG timer.data++;

    if (!snake.dead) {
      // LOG timer.data++;
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
        // LOG timer.data++;
        if (checkProximity(fud.x, fud.y, newX, newY, 2) === true) {
          // LOG timer.data++;
          snake.len += fud.weight;
          if (fud.perishable) {
            // LOG timer.data++;
            food = food.filter(
              f => !(f.x === fud.x && f.y === fud.y && fud.perishable)
            );
            if (food.length < maxFoodNo) {
              food.push(newFood());
            }
          } else {
            // LOG timer.data++;
            fud.x = Math.floor(Math.random() * tiles);
            fud.y = Math.floor(Math.random() * tiles);
            fud.weight = Math.floor(Math.random() * foodMaxWeight);
          }
        }
      });

      snake.blocks.push({ x: newX, y: newY, size: tileSize });
      snake.blocks.splice(0, snake.blocks.length - snake.len);

      snakes.filter(snk => !snk.dead && snk.id !== snake.id).forEach(snake2 => {
        // LOG timer.data++;
        for (let i = 0; i < snake2.blocks.length; i++) {
          // LOG timer.data++;
          if (
            checkProximity(
              snake2.blocks[i].x,
              snake2.blocks[i].y,
              newX,
              newY,
              1
            )
          ) {
            // LOG timer.data++;
            if (i === snake2.len - 1) {
              // LOG timer.data++;
              if (snake.len > snake2.len) {
                // LOG timer.data++;
                snake.len += snake2.len;
                killSnake(snake2);
              } else if (snake.len < snake2.len) {
                // LOG timer.data++;
                snake2.len += snake.len;
                killSnake(snake);
              }
            } else {
              // LOG timer.data++;
              snake.lastMove = '';
              snake.dx = -snake.dx;
              snake.dy = -snake.dy;
            }
          }
        }
      });
      // // self collision
      const ownBlocks = snake.blocks;
      for (let i = 0; i < ownBlocks.length - 2; i++) {
        // LOG timer.data++;
        if (checkProximity(ownBlocks[i].x, ownBlocks[i].y, newX, newY, 1)) {
          // LOG timer.data++;
          let j = 0;
          while (j <= i) {
            let newfud = newFood(snake.blocks[0].x, snake.blocks[0].y, true);
            const weight = Math.min(5, i - j + 1);
            newfud.weight = weight;
            food.push(newfud);
            snake.blocks.splice(0, weight);
            snake.len -= weight;
            j += weight;
          }
          // for (let j = 0; j <= i; j++) {
          //   // LOG timer.data++;
          //   food.push(newFood(snake.blocks[0].x, snake.blocks[0].y, true));
          //   snake.blocks.splice(0, 1);
          //   snake.len--;
          // }
          break;
        }
      }
      // boost handler
      if (snake.boost) {
        // LOG timer.data++;
        if (snake.len > 5) {
          // LOG timer.data++;
          for (let i = 0; i < boostFactor; i++) {
            // LOG timer.data++;
            snake.blocks.push({
              x: snake.blocks[snake.blocks.length - 1].x + snake.dx,
              y: snake.blocks[snake.blocks.length - 1].y + snake.dy
            });
            snake.len--;
            food.push(newFood(snake.blocks[0].x, snake.blocks[0].y, true));
          }
        } else {
          // LOG timer.data++;
          snake.boost = false;
        }
      }
    }
  });

  messages.forEach(msg => {
    // LOG timer.data++;
    if (msg.life > 0) {
      // LOG timer.data++;
      msg.life--;
    } else {
      // LOG timer.data++;
      const snake = snakes.filter(snk => snk.id === msg.id)[0];
      if (snake !== undefined) {
        // LOG timer.data++;
        snake.message = null;
      }
    }
  });

  if (messages.length > 10) {
    // LOG timer.data++;
    if (ticker > 10) {
      // LOG timer.data++;
      removeMessagesHead();
      ticker = 0;
    }
  } else {
    // LOG timer.data++;
    if (ticker > 100) {
      // LOG timer.data++;
      snakes = snakes.filter(snk => !(snk.id < 0 && snk.dead));
      removeMessagesHead();
      ticker = 0;
    }
  }

  let data = {
    snakes,
    food,
    messages,
    meta: { tiles, tileSize, offset }
  };

  // LOG timer.data++;
  io.sockets.emit('data', data);
  // LOG timer.data++;
  // console.log(
  //   `time: ${new Date().getTime() - timer.time} primops: ${
  //     timer.data
  //   } snakes: ${snakes.length} -> comps: ${comps.length} food: ${
  //     food.length
  //   } messages: ${messages.length}`
  // );
}, 1000 / 24);
