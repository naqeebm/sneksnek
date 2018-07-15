const canv = document.getElementById('canv');
const ctx = canv.getContext('2d');
let socket = null;

console.log('connecting to http://178.128.45.249:8080/');
socket = io.connect('http://178.128.45.249:8080/');
// console.log('connecting to http://localhost:8080/');
// socket = io.connect('http://localhost:8080/');
// console.log('connecting to http://192.168.1.4:8080/');
// socket = io.connect('http://192.168.1.4:8080/');

canv.height = document.documentElement.clientHeight;
canv.width = document.documentElement.clientWidth;

let ready = false;

let first = true;
let snakeId = null;

let snakes = [];
let food = [];
let messages = [];
let sentMessage = '';
let meta = null;

let scale = 1;
let snakeStyle = 'LCH';
let foodStyle = 1;
let bgCol = 'white';
let showNames = true;

let chat = { showing: false, message: null };

ctx.fillRect(0, 0, canv.width, canv.height);

socket.on('id', id => {
  snakeId = id;
  document.getElementById('splash').style.display = 'none';
});

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

  // first time
  if (first) {
    if (socket !== null) {
      handleCommand('/food 0');
    }
  }

  // snakes
  ctx.scale(scale, scale);
  ctx.clearRect(
    0,
    0,
    meta.tiles * meta.tilesize * scale,
    meta.tiles * meta.tileSize * scale
  );
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
    // snake message
    if (snake.message !== null) {
      let message = snake.message.message;
      if (message.length > 16) {
        let msgs = [];
        while (message.length > 0) {
          msgs.push(message.slice(0, 16));
          message = message.slice(16, message.length);
        }
        for (let i = 0; i < msgs.length; i++) {
          ctx.fillStyle = `rgba(0,0,128,${snake.message.life / 25})`;
          ctx.font = `${meta.tileSize * 2}px monospace`;
          ctx.fillText(
            `${msgs[i]}`,
            snake.blocks[snake.blocks.length - 1].x * data.meta.tileSize,
            snake.blocks[snake.blocks.length - 1].y * data.meta.tileSize -
              5 -
              (msgs.length - (i + 1)) * 200
          );
        }
      } else {
        ctx.fillStyle = `rgba(0,0,128,${snake.message.life / 25})`;
        ctx.font = `${meta.tileSize * 2}px monospace`;
        ctx.fillText(
          `${snake.message.message}`,
          snake.blocks[snake.blocks.length - 1].x * data.meta.tileSize,
          snake.blocks[snake.blocks.length - 1].y * data.meta.tileSize - 5
        );
      }
    }
  });

  ctx.scale(1 / scale, 1 / scale);

  // portrait /mobile mode
  if (
    document.documentElement.clientWidth ===
    data.meta.tiles * data.meta.tileSize * scale
  ) {
    if (first) {
      handleCommand('/name MobileU' + snakes.length);
      document.getElementById('controls').style.display = 'none';
      first = false;
    }
    drawTouchArrows(
      ctx,
      0,
      data.meta.tiles * data.meta.tileSize * scale,
      data.meta.tiles * data.meta.tileSize * scale,
      document.documentElement.clientHeight
    );
  } else {
    document.getElementById('mobile').style.display = 'none';
  }

  // scores
  for (let i = 0; i < snakes.length; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(5, 15 + i * 40, 20 + 24 * `${snakes[i].len}`.length, 30);
    ctx.fillStyle = snakes[i].col;
    ctx.fillRect(10, 20 + i * 40, 20, 20);
    ctx.font = '12px calibri';
    ctx.fillText(snakes[i].len, 34, 10 + i * 40 + 16);
    ctx.fillStyle = 'black';
    ctx.font = '12px calibri';
    ctx.fillText(snakes[i].score, 34, 24 + i * 40 + 16);
    if (snakes[i].name !== undefined) {
      ctx.font = `12px sans-serif`;
      ctx.fillStyle = 'white';
      ctx.fillText(snakes[i].name.slice(0, 2), 12, 36 + i * 40);
    }
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

  // messages
  for (let i = 0; i < messages.length; i++) {
    // back
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(80, 18 + i * 16, messages[i].message.length * 10 + 66, 16);
    ctx.lineWidth = 4;
    // msg
    ctx.font = '16px monospace';
    ctx.fillStyle = messages[i].col;
    ctx.fillText(messages[i].message, 130, 15 + i * 16 + 16);
    if (messages[i].name !== undefined) {
      // name
      ctx.fillStyle = messages[i].col;
      ctx.fillText(messages[i].name.slice(0, 3), 85, 15 + i * 16 + 16);
    } else {
      // block
      ctx.fillStyle = messages[i].col;
      ctx.fillRect(85, 20 + i * 16, 16 * 2, 10);
    }
  }
});

function init(random = true) {
  if (random) {
    let newCol = '#';
    let arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 0; i < 6; i++) {
      newCol += arr[Math.floor(Math.random() * arr.length)];
    }
    document.getElementById('col').value = newCol;
    return;
  }
  handleCommand('/name ' + document.getElementById('name').value);
  if (!random) {
    handleCommand('/col ' + document.getElementById('col').value);
  }
  bgCol = document.getElementById('bgcol').value;
  document.getElementById('main').style.display = 'block';
  document.getElementById('initial').style.display = 'none';
  ready = true;
}

const checkProximity = (x1, y1, x2, y2, leeway) => {
  len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  if (Math.abs(len) < leeway) {
    return true;
  } else {
    return false;
  }
};

function drawGrid(ctx, tiles, tileSize = 8, offset = 1, col = bgCol) {
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
  //halo
  if (snakeObj.id === snakeId) {
    const head = snakeObj.blocks[snakeObj.blocks.length - 1];
    ctx.fillStyle = 'rgba(0,255,128,0.5)';
    for (let i = tileSize * 2; i > tileSize; i *= 0.5) {
      ctx.beginPath();
      ctx.arc(
        head.x * tileSize + tileSize / 2,
        head.y * tileSize + tileSize / 2,
        i - offset,
        0,
        2 * Math.PI
      );
      ctx.closePath();
      ctx.fill();
    }
  }
  // first 2 blocks affected
  let i = 0;
  let prev = {
    x: snakeObj.blocks[0].x * tileSize + tileSize / 2,
    y: snakeObj.blocks[0].y * tileSize + tileSize / 2
  };
  ctx.lineCap = 'round';
  snakeObj.blocks.forEach(block => {
    const x = block.x * tileSize + tileSize / 2;
    const y = block.y * tileSize + tileSize / 2;
    // let sizeOffset = Math.max(Math.abs(block.size - tileSize / 2 - i), 10);
    // lines
    if (snakeStyle.indexOf('L') !== -1) {
      if (checkProximity(x, y, prev.x, prev.y, 2 * tileSize)) {
        ctx.strokeStyle = snakeObj.col;
        ctx.lineWidth = block.size - /* sizeOffset */ -offset;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
    prev.x = x;
    prev.y = y;

    // circles
    if (snakeStyle.indexOf('C') !== -1) {
      ctx.fillStyle = snakeObj.col;
      ctx.strokeStyle = snakeObj.col;
      ctx.beginPath();
      ctx.arc(
        block.x * tileSize + tileSize / 2,
        block.y * tileSize + tileSize / 2,
        (block.size - /* sizeOffset */ -offset) / 2,
        0,
        2 * Math.PI
      );
      ctx.closePath();
      ctx.fill();
    }
    i++;
  });
  // highlight
  if (snakeStyle.indexOf('H') !== -1) {
    const head = snakeObj.blocks[snakeObj.blocks.length - 1];
    ctx.beginPath();
    ctx.arc(
      head.x * tileSize + (3 * tileSize) / 8,
      head.y * tileSize + (3 * tileSize) / 8,
      tileSize / 4 - offset,
      0,
      2 * Math.PI
    );
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();
    // name
    if (showNames) {
      if (snakeObj.name !== undefined) {
        ctx.font = `${1600 * scale}px sans-serif`;
        ctx.fillStyle = snakeObj.col;
        ctx.fillText(
          `${snakeObj.name} ☺`,
          head.x * tileSize - 100 * snakeObj.name.length * 4 * scale,
          head.y * tileSize + 2400 * scale
        );
      }
    }
  }
}

function drawFood(ctx, food, tileSize = 8, offset = 1) {
  if (food.perishable) {
    ctx.beginPath();
    if (foodStyle === 1) {
      ctx.fillStyle = `128,${Math.random() * 255},${Math.random() * 255})`;
      ctx.arc(
        food.x * tileSize + tileSize / 2,
        food.y * tileSize + tileSize / 2,
        tileSize / (Math.random() * 1 + 2),
        0,
        2 * Math.PI
      );
    } else {
      ctx.fillStyle = 'blue';
      ctx.arc(
        food.x * tileSize + tileSize / 2,
        food.y * tileSize + tileSize / 2,
        tileSize / 4,
        0,
        2 * Math.PI
      );
    }
    ctx.closePath();
    ctx.fill();
  } else {
    if (foodStyle === 1) {
      ctx.fillStyle = `rgb(255,${Math.random() * 255},${Math.random() * 255})`;
    } else {
      if (food.weight >= 4) {
        ctx.fillStyle = 'voilet';
      } else if (food.weight >= 3) {
        ctx.fillStyle = 'blue';
      } else if (food.weight >= 2) {
        ctx.fillStyle = 'green';
      } else {
        ctx.fillStyle = 'red';
      }
    }
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
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;

  ctx.strokeRect(x1, y1, xDist, yDist);

  ctx.strokeRect(x1, y1, xDist / 4, yDist);
  ctx.strokeRect(x1, y1, 3 * (xDist / 4), yDist);
  ctx.strokeRect(x1, y1, 3 * (xDist / 4), yDist);
  ctx.strokeRect(xDist / 4, y1, xDist / 2, yDist / 2);

  ctx.font = '32px arial';
  ctx.fillStyle = 'white';
  ctx.fillText('↑', xDist / 2 - 16, y1 + yDist / 4 + 8);
  ctx.fillText('↓', xDist / 2 - 16, y1 + (3 * yDist) / 4 + 16);
  ctx.fillText('←', xDist / 8 - 16, y1 + yDist / 2 + 16);
  ctx.fillText('→', 7 * (xDist / 8) - 16, y1 + yDist / 2 + 16);
}

function handleCommand(message) {
  let command = message.split(' ')[0];
  let arg = message.slice(command.length + 1, message.length);
  switch (command) {
    case '/name':
      if (arg.length > 0) {
        socket.emit('name', arg);
      }
      break;
    case '/snake':
      if (
        arg.length > 0 &&
        (arg.indexOf('L') !== -1 || arg.indexOf('C') !== -1)
      ) {
        snakeStyle = arg;
      }
      break;
    case '/food':
      if (arg.length > 0 && Number(arg) !== NaN) {
        foodStyle = Number(arg);
      }
      break;
    case '/col':
      if (arg.length > 0) {
        socket.emit('col', arg);
      }
      break;

    case '/bgcol':
      if (arg.length > 0) {
        bgCol = arg;
      }
      break;
    case '/names':
      showNames = !showNames;
      break;
    case '/req':
      if (arg.length > 0) {
        socket.emit('request', arg);
      }
      break;
    default:
      break;
  }
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
  let found = false;
  blocks.forEach(block => {
    if (
      block.x1 < touch.pageX &&
      block.x2 > touch.pageX &&
      block.y1 < touch.pageY &&
      block.y2 > touch.pageY
    ) {
      socket.emit('move', block.dir);
      found = true;
    }
  });
  if (!found) {
    if (touch.pageY > yDist / 2) {
      socket.emit('move', 'boost');
    } else {
      if (touch.pageX < xDist / 2) {
        if (foodStyle === 0) {
          foodStyle = 1;
          snakeStyle = 'CLH';
          showNames = true;
        } else {
          snakeStyle = 'LH';
          foodStyle = 0;
          showNames = false;
        }
      } else {
        socket.emit('message', 'snek snek');
      }
    }
  }
});

window.addEventListener('keydown', e => {
  if (!ready) {
    return;
  }
  if (!chat.showing) {
    let move = null;
    let moves = ['u', 'd', 'l', 'r', 'boost'];
    let keys = ['w', 's', 'a', 'd', ' '];
    move = moves[keys.indexOf(e.key)];
    if (move !== snakes.filter(snk => snk.id === snakeId)[0].lastMove) {
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
          socket.emit('move', 'boost');
          break;
        case 'Enter':
          chat.showing = true;
          chat.message = '';
          break;
        default:
          break;
      }
    }
  } else {
    if (e.keyCode === 13) {
      if (chat.message.length > 0) {
        if (chat.message[0] === '/') {
          sentMessage = chat.message;
          handleCommand(chat.message);
        } else {
          sentMessage = chat.message;
          while (chat.message.length > 0) {
            socket.emit('message', chat.message.slice(0, 64));
            chat.message = chat.message.slice(64, chat.message.length);
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
    } else if (e.keyCode === 38) {
      chat.message = sentMessage;
    } else {
      if (chat.message.length < 64) {
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
  }
});
