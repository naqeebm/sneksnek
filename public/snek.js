const canv = document.getElementById('canv');
const ctx = canv.getContext('2d');
let socket = null;

// console.log('connecting to http://139.59.164.28:8080');
// socket = io.connect('http://139.59.164.28:8080/');
console.log('connecting to http://localhost:8080/');
socket = io.connect('http://localhost:8080/');

canv.height = document.documentElement.clientHeight;
canv.width = document.documentElement.clientWidth;

let snakes = [];
let food = [];
let messages = [];

let meta = null;
let scale = 1;

let chat = { showing: false, message: null };

ctx.fillRect(0, 0, canv.width, canv.height);

socket.on('data', data => {
  ctx.clearRect(0, 0, canv.width, canv.height);
  if (canv.height < canv.width) {
    scale = canv.height / (data.meta.tileSize * data.meta.tiles);
  } else {
    scale = canv.width / (data.meta.tileSize * data.meta.tiles);
  }
  ctx.fillStyle = 'grey';
  snakes = data.snakes;
  food = data.food;
  messages = data.messages;
  meta = data.meta;

  // snakes
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, canv.width, canv.height);
  ctx.fillRect(0, 0, canv.width, canv.height);
  drawGrid(ctx, data.meta.tiles, data.meta.tileSize, data.meta.offset);

  food.forEach(nomnom =>
    drawFood(ctx, nomnom, data.meta.tileSize, data.meta.offset)
  );

  snakes.forEach(snake => {
    drawSnake(
      ctx,
      snake,
      data.meta.tiles,
      data.meta.tileSize,
      data.meta.offset
    );
    if (snake.message !== null) {
      ctx.fillStyle = `rgba(0,0,0,${snake.message.life / 25})`;
      ctx.font = `${96}px monospace`;
      ctx.fillText(
        `${snake.message.message}`,
        snake.blocks[snake.blocks.length - 1].x * data.meta.tileSize,
        snake.blocks[snake.blocks.length - 1].y * data.meta.tileSize - 5
      );
    }
  });

  ctx.scale(1 / scale, 1 / scale);

  // portrait /mobile mode
  if (
    document.documentElement.clientWidth ===
    data.meta.tiles * data.meta.tileSize * scale
  ) {
    drawTouchArrows(
      ctx,
      0,
      data.meta.tiles * data.meta.tileSize * scale,
      data.meta.tiles * data.meta.tileSize * scale,
      document.documentElement.clientHeight
    );
  }

  // scores
  for (let i = 0; i < snakes.length; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(5, 15 + i * 40, 20 + 24 * `${snakes[i].len}`.length, 30);
    ctx.fillStyle = snakes[i].col;
    ctx.fillRect(10, 20 + i * 40, 20, 20);
    ctx.font = '24px calibri';
    ctx.fillText(snakes[i].len, 40, 20 + i * 40 + 16);
  }

  // chat
  if (chat.showing) {
    ctx.fillStyle = 'darkgrey';
    ctx.fillRect(0, canv.height - 30, canv.width, 2);
    ctx.fillStyle = 'rgba(129,200,200,0.8)';
    ctx.fillRect(0, canv.height - 30, canv.width, 28);
    ctx.fillStyle = 'black';
    ctx.font = '16px monospace';
    ctx.fillText(chat.message, 10, canv.height - 10);
  }
  ctx.scale(scale, scale);

  // messages
  for (let i = 0; i < messages.length; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(290, 40 + i * 68, messages[i].message.length * 38 + 200, 80);
    ctx.lineWidth = 4;
    ctx.font = '68px monospace';
    ctx.fillStyle = 'black';
    ctx.fillText(messages[i].message, 460 + 4, 80 + i * 68 + 20);
    ctx.fillStyle = messages[i].col;
    ctx.fillText(messages[i].message, 460, 80 + i * 68 + 16);
    if (messages[i].name !== undefined) {
      ctx.fillStyle = messages[i].col;
      ctx.fillText(messages[i].name, 310, 80 + i * 68 + 16);
    } else {
      ctx.fillStyle = messages[i].col;
      ctx.fillRect(300, 60 + i * 68, 68 * 2, 40);
    }
  }
  ctx.scale(1 / scale, 1 / scale);
});

function drawGrid(ctx, tiles, tileSize = 8, offset = 1, col = 'white') {
  for (let x = 0; x < tiles; x++) {
    for (let y = 0; y < tiles; y++) {
      ctx.fillStyle = col;
      ctx.fillRect(
        x * tileSize,
        y * tileSize,
        tileSize - offset,
        tileSize - offset
      );
    }
  }
}

function drawSnake(ctx, snakeObj, tiles, tileSize = 8, offset = 1) {
  ctx.fillStyle = snakeObj.col;
  snakeObj.blocks.forEach(block => {
    ctx.fillStyle = snakeObj.col;
    ctx.strokeStyle = snakeObj.col;
    // ctx.strokeRect(block.x * tileSize, block.y * tileSize, tileSize, tileSize);
    ctx.beginPath();
    ctx.arc(
      block.x * tileSize + tileSize / 2,
      block.y * tileSize + tileSize / 2,
      block.size / 2 - offset,
      0,
      2 * Math.PI
    );
    ctx.closePath();
    ctx.fill();
  });
}

function drawFood(ctx, food, tileSize = 8, offset = 1) {
  if (food.perishable) {
    ctx.fillStyle = `128,${Math.random() * 255},${Math.random() * 255})`;
    ctx.beginPath();
    ctx.arc(
      food.x * tileSize + tileSize / 2,
      food.y * tileSize + tileSize / 2,
      tileSize / (Math.random() * 1 + 2),
      0,
      2 * Math.PI
    );
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = `rgb(255,${Math.random() * 255},${Math.random() * 255})`;
    ctx.fillRect(
      food.x * tileSize,
      food.y * tileSize,
      tileSize - offset,
      tileSize - offset
    );
  }
}

function drawTouchArrows(ctx, x1, y1, x2, y2) {
  const xDist = Math.abs(x2 - x1);
  const yDist = Math.abs(y2 - y1);
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'white';

  ctx.strokeRect(x1, y1, xDist, yDist);

  ctx.strokeRect(x1, y1, xDist / 4, yDist);
  ctx.strokeRect(x1, y1, 3 * (xDist / 4), yDist);
  ctx.strokeRect(x1, y1, 3 * (xDist / 4), yDist);
  ctx.strokeRect(xDist / 4, y1, xDist / 2, yDist / 2);

  ctx.font = '68px arial';
  ctx.fillStyle = 'lightgrey';
  ctx.fillText('^', xDist / 2 - 16, y1 + yDist / 4 + 32);
  ctx.fillText('v', xDist / 2 - 16, y1 + (3 * yDist) / 4 + 16);
  ctx.fillText('<', xDist / 8 - 16, y1 + yDist / 2 + 16);
  ctx.fillText('>', 7 * (xDist / 8) - 16, y1 + yDist / 2 + 16);
}

window.addEventListener('touchend', e => {
  const touch = e.changedTouches[0];
  const x = 0;
  const y = meta.tiles * meta.tileSize * scale;
  const xDist = Math.abs(meta.tiles * meta.tileSize * scale - x);
  const yDist = Math.abs(document.documentElement.clientHeight - y);
  let blocks = [];
  blocks.push({
    x1: 0,
    y1: y,
    x2: xDist / 4,
    y2: y + yDist,
    dir: 'l'
  });
  blocks.push({
    x1: xDist / 4,
    y1: y + yDist / 2,
    x2: 3 * (xDist / 4),
    y2: y + yDist,
    dir: 'd'
  });
  blocks.push({
    x1: xDist / 4,
    y1: y,
    x2: 3 * (xDist / 4),
    y2: y + yDist / 2,
    dir: 'u'
  });
  blocks.push({
    x1: 3 * (xDist / 4),
    y1: y,
    x2: 4 * (xDist / 4),
    y2: y + yDist,
    dir: 'r'
  });
  blocks.forEach(block => {
    if (
      block.x1 < touch.pageX &&
      block.x2 > touch.pageX &&
      block.y1 < touch.pageY &&
      block.y2 > touch.pageY
    ) {
      socket.emit('move', block.dir);
    }
  });
});

window.addEventListener('keyup', e => {
  {
    if (!chat.showing) {
      switch (e.key) {
        case ' ':
          console.log('boost finish');
          break;
        default:
          break;
      }
    }
  }
});

window.addEventListener('keydown', e => {
  if (!chat.showing) {
    switch (e.key) {
      case 'w':
        socket.emit('move', 'u');
        break;
      case 'a':
        socket.emit('move', 'l');
        break;
      case 's':
        socket.emit('move', 'd');
        break;
      case 'd':
        socket.emit('move', 'r');
        break;
      case ' ':
        console.log('boost');
        socket.emit('move', 'boost');
        break;
      case 'Enter':
        chat.showing = true;
        chat.message = '';
        break;
      default:
        break;
    }
  } else {
    if (e.keyCode === 13) {
      if (chat.message.length > 0) {
        if (chat.message.startsWith('/name')) {
          const name = chat.message.slice(
            chat.message.indexOf(' ') + 1,
            chat.message.length
          );
          if (name.length > 0) {
            socket.emit('name', name);
          }
        } else {
          while (chat.message.length > 0) {
            socket.emit('message', chat.message.slice(0, 64));
            chat.message = chat.message.slice(32, chat.message.length);
          }
        }
      }
      chat.message = null;
      chat.showing = false;
    } else if (e.keyCode === 8) {
      chat.message = chat.message.slice(0, chat.message.length - 1);
    } else if (e.keyCode === 27) {
      chat.message = null;
      chat.showing = false;
    } else {
      if (
        (e.keyCode > 47 && e.keyCode < 58) ||
        e.keyCode == 32 ||
        (e.keyCode > 64 && e.keyCode < 91) ||
        (e.keyCode > 95 && e.keyCode < 112) ||
        (e.keyCode > 185 && e.keyCode < 193) ||
        (e.keyCode > 218 && e.keyCode < 223)
      ) {
        chat.message += e.key;
      }
    }
  }
});
