const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const app = express();

app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, resp) => {
  resp.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Listening on port ${server.address().port}, env ${process.env.NODE_ENV}`);
});

const wsConfig = { server };
if (process.env.NODE_ENV == 'development') {
  wsConfig.port = 8080;
}
const wss = new WebSocket.Server(wsConfig);

function genArray(size) {
  return Array.from(new Array(size));
}

const STEP_TIMEOUT = 1000;
const START_TIMEOUT = 3000;

const DIRS = {
  n: [0, -1],
  ne: [1, -1],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  nw: [-1, -1]
};

const OBST = 'o';
const BASE = 'b';
const CITY = 'c';

class Game {
  constructor(number, factory) {
    this.number = number;
    this.factory = factory;
    this.players = {};
    this.playerNames = {};

    this.stepNumber = 1;

    this.cities = [];

    this.curMoves = {};
  }

  at(coord) {
    if (!coord.length) {
      return undefined;
    }
    return this.map[coord[0]].cells[coord[1]];
  }

  connected() {
    let visited = null;

    for (const coord of this.cellsSeq) {
      if (this.at(coord).type != OBST) {
        if (!visited) {
          visited = {};
          visited[coord] = true;
          const front = [coord];
          while (front.length > 0) {
            const c = front.shift();

            this.neighbors(c).forEach((c2) => {
              if (this.at(c2).type != OBST && !visited[c2]) {
                visited[c2] = true;
                front.push(c2);
              }
            });
          }
        } else if (!visited[coord]) {
          return false;
        }
      }
    }

    return true;
  }

  genObstacles() {
    genArray(Math.floor(this.cellsSeq.length / 3)).forEach(() => {
      while (true) {
        const c = this.randomCell();
        if (this.neighbors(c).filter((c) => this.at(c).type == OBST).length < 2) {
          this.at(c).type = OBST;
          if (this.connected()) {
            return;
          } else {
            delete this.at(c).type;
          }
        }
      }
    });
  }

  basesFarEnough(c1, c2) {
    return Math.abs(c1[1] - c2[1]) >= (this.height - 2) ||
           Math.abs(c1[0] - c2[0]) >= (this.height - 2);
  }

  genCities() {
    genArray(3 * Object.keys(this.players).length).forEach(() => {
      while (true) {
        const c = this.randomCell();
        if (!this.at(c).type) {
          this.at(c).type = CITY;
          this.at(c).number = 40;
          this.cities.push(c);
          return;
        }
      }
    });
  }

  genBases() {
    while (true) {

      const coords = Object.keys(this.players).map((pl) => {
        const coord = this.randomCell();
        this.at(coord).type = BASE;
        this.at(coord).player = this.players[pl].index;
        return coord;
      });

      let farEnough = true;
      for (let i = 0; i < coords.length; i++) {
        for (let j = i+1; j < coords.length; j++) {
          farEnough = farEnough && this.basesFarEnough(coords[i], coords[j]);
        }
      }

      if (farEnough) {
        for (const coord of coords) {
          this.cities.push(coord);
        }
        Object.keys(this.players).forEach((pl, i) => {
          this.players[pl].base = coords[i];
        });
        return;
      } else {
        for (const coord of coords) {
          delete this.at(coord).type;
          delete this.at(coord).player;
        }
      }

    }
  }

  neighbor(coord, dir) {
    const [dcol, drow] = DIRS[dir];

    if (dcol != 0) {
      const colCur = this.map[coord[0]];
      const colOther = this.map[coord[0] + dcol];

      if (colOther) {
        const row = coord[1] + (drow + colCur.offset - colOther.offset) / 2;
        if (colOther.cells[row]) {
          return [coord[0] + dcol, row];
        }
      }
    } else if (this.map[coord[0]].cells[coord[1] + drow]) {
      return [coord[0], coord[1] + drow];
    }
  }

  neighbors(coord) {
    return Object.keys(DIRS).map((dir) => this.neighbor(coord, dir)).filter((c) => c);
  }

  randomCell() {
    while(true) {
      const ind = Math.floor(Math.random()*this.cellsSeq.length);
      const [col, row] = this.cellsSeq[ind];
      if (!this.map[col].cells[row].type) {
        return [col, row];
      }
    }
  }

  move(address, mv) {
    this.curMoves[address] = mv;
  }

  cellInfo(coord) {
    const cell = this.at(coord);
    return [cell.type, cell.number, cell.player];
  }

  start() {
    const size = 6 + Object.keys(this.players).length;
    this.height = 8;
    this.widthRight = size;
    this.widthLeft = size;

    let maxHeight = this.height + Math.min(this.widthRight, this.widthLeft) - 1;
    let colsNum = this.widthLeft + this.widthRight - 1;

    this.cellsSeq = [];
    this.map = genArray(colsNum).map((e, i) => {
      let height, offset;
      if (i < this.widthLeft) {
        height = Math.min(maxHeight, this.height + i);
        offset = this.widthLeft - i - 1;
      } else {
        height = Math.min(maxHeight, this.height + colsNum - i - 1);
        offset = i - this.widthLeft + 1;
      }

      const col = {
        offset: offset,
        cells: genArray(height).map(() => { return {}; })
      };

      col.cells.forEach((e, j) => {
        this.cellsSeq.push([i, j]);
      });

      return col;
    });

    this.genObstacles();


    Object.keys(this.players).forEach((pl, i) => {
      this.players[pl].index = i;
      this.players[pl].army = 0;
      this.players[pl].area = 1;
    });
    this.playersList = Object.keys(this.players).map((pl) => this.players[pl]);
    this.genBases();
    this.genCities();
    const obst = {};
    for (const coord of this.cellsSeq.filter((coord) => this.at(coord).type == OBST)) {
      obst[coord] = 1;
    }
    for (const coord of this.cities.filter((coord) => this.at(coord).type == CITY)) {
      obst[coord] = 1;
    }
    Object.keys(this.players).forEach((pl, i) => {
      const base = this.cities.find((coord) => this.at(coord).player == i && this.at(coord).type == BASE);
      const cells = {};
      this.appendCellInfo(cells, base);
      for (const c of this.neighbors(base)) {
        this.appendCellInfo(cells, c);
      }

      this.trySend(this.players[pl].ws, ['game', {
        number: this.number,
        size: [this.widthRight, this.widthLeft, this.height],
        obst: obst,
        cells: cells
      }]);
    });
    this.step();
  }

  trySend(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  doMove(cellFrom, cellTo, half, playersList) {
    if (cellFrom.number && cellFrom.number > 1) {
      const moving = half ? Math.floor(cellFrom.number/2) : (cellFrom.number - 1);

      if (cellTo.player == cellFrom.player) {
        cellTo.number = (cellTo.number || 0) + moving;
        cellFrom.number -= moving;
      } else {
        cellTo.number = cellTo.number || 0;

        const delta = Math.min(cellTo.number, moving);
        playersList[cellFrom.player].army -= delta;
        if (cellTo.player != null) {
          playersList[cellTo.player].army -= delta;
        }

        cellTo.number -= moving;
        cellFrom.number -= moving;
        if (cellTo.number < 0) {
          playersList[cellFrom.player].area += 1;
          if (cellTo.player != null) {
            playersList[cellTo.player].area -= 1;
          }

          cellTo.number *= -1;
          cellTo.player = cellFrom.player;
        }
      }
    }
  }

  appendCellInfo(infos, coord) {
    infos[coord] = this.cellInfo(coord);
    /*
    if (infos.length) {
      const coordLast = infos[infos.length-1][0];
      if (coord[0] != coordLast[0] || coord[1] != coordLast[1]) {
        infos.push(this.cellInfo(coord));
      }
    } else {
      infos.push(this.cellInfo(coord));
    }
    */
  }

  appendCellsInfoToNeighbors(updates, coord) {
      for (const c of this.neighbors(coord)) {
        if (this.at(c).player != null) {
          this.appendCellInfo(updates[this.at(c).player], coord);
        }
      }
  }

  step() {
    const growStep = this.stepNumber % 25 == 0;
    this.stepNumber += 1;

    const updates = {};
    for (const pl of Object.keys(this.players)) {
      updates[this.players[pl].index] = {};
    }

    for (const pl of Object.keys(this.curMoves)) {
      if (!this.curMoves[pl] || this.players[pl].left) {
        continue;
      }
      const [from, to, half] = this.curMoves[pl];
      const cellFrom = this.at(from);
      const cellTo = this.at(to);
      if (cellFrom && cellFrom.player == this.players[pl].index && cellTo.type != OBST) {
        if (cellFrom.number > 1 && this.neighbors(from).some((c2) => c2[0] == to[0] && c2[1] == to[1])) {
          const playerToWas = cellTo.player;
          this.doMove(cellFrom, cellTo, half, this.playersList);

          if (!growStep) {
            this.appendCellInfo(updates[cellFrom.player], from);
            this.appendCellsInfoToNeighbors(updates, from);
            if (cellTo.player != null) {
              this.appendCellInfo(updates[cellTo.player], to);
            }
            this.appendCellsInfoToNeighbors(updates, to);

            if (playerToWas != cellFrom.player && playerToWas != cellTo.player) {
              for (const coord of this.neighbors(to)) {
                this.appendCellInfo(updates[cellTo.player], coord);
              }
            }
          }

          // only memory loss
          if (playerToWas != null && playerToWas != cellTo.player) {
            const affected = this.neighbors(to);
            affected.push(to);
            for (const coord of affected) {
              if (this.at(coord).player != playerToWas && this.neighbors(coord).every((c) => playerToWas != this.at(c).player)) {
                updates[playerToWas][coord] = [];
              }
            }
          }
        }
      }
    }
    this.curMoves = {};

    for (const pl of Object.keys(this.players)) {
      const player = this.players[pl];
      const baseCell = this.at(player.base);

      if (!player.dead && baseCell.player != player.index) {
        player.dead = true;
        baseCell.type = CITY;
        this.appendCellInfo(updates[player.index], player.base);
        this.trySend(player.ws, ['game', { over: true }]);

        for (const coord of this.cellsSeq) {
          if (this.at(coord).player == player.index) {
            this.playersList[player.index].army -= this.at(coord).number;
            this.playersList[player.index].area -= 1;
            const army = Math.floor(this.at(coord).number/2);
            this.playersList[baseCell.player].army += army;
            this.playersList[baseCell.player].area += 1;
            this.at(coord).number = army;
            this.at(coord).player = baseCell.player;

            this.appendCellInfo(updates[player.index], coord);
            this.appendCellInfo(updates[baseCell.player], coord);
            this.appendCellsInfoToNeighbors(updates, coord);

            for (const c of this.neighbors(coord)) {
              this.appendCellInfo(updates[baseCell.player], c);
            }
          }
        }
      }
    }

    if (growStep) {
      for (const coord of this.cellsSeq) {
        const cell = this.at(coord);
        if (cell.player != null) {
          cell.number = cell.number || 0;
          cell.number += 1;
          this.playersList[cell.player].army += 1;

          this.appendCellInfo(updates[cell.player], coord);
          this.appendCellsInfoToNeighbors(updates, coord);
        }
      }
    } else {
      for (const coord of this.cities) {
        const cell = this.at(coord);
        if (cell.player != null) {
          cell.number = cell.number || 0;
          cell.number += 1;
          this.playersList[cell.player].army += 1;

          this.appendCellInfo(updates[cell.player], coord);
          this.appendCellsInfoToNeighbors(updates, coord);
        }
      }
    }

    for (const pl of Object.keys(this.players)) {
      if (!this.players[pl].dead || Object.keys(updates[this.players[pl].index]).length > 0) {
        this.trySend(this.players[pl].ws, ['game', {
          number: this.number,
          step: this.stepNumber,
          update: updates[this.players[pl].index],
          playersArmy: this.playersList.map((p) => p.army),
          playersArea: this.playersList.map((p) => p.area),
          playersLeft: this.playersList.map((p) => p.left),
          playersDead: this.playersList.map((p) => p.dead)
        }]);
      }
    }

    const alive = Object.keys(this.players).filter((pl) => {
      return !this.players[pl].left && this.at(this.players[pl].base).player == this.players[pl].index;
    });
    if (alive.length <= 1) {
      if (alive[0]) {
        this.trySend(this.players[alive[0]].ws, ['game', {
          over: true,
          win: true
        }]);
      }
      this.factory.end(this.number);
    } else {
      setTimeout(this.step.bind(this), STEP_TIMEOUT);
    }
  }

  forceCount() {
    return Object.keys(this.players).map((pl) => this.players[pl].force ? 1 : 0).reduce((a, b) => a + b, 0);
  }

  sendLobby() {
    Object.keys(this.players).forEach((pl, i) => {
      this.trySend(this.players[pl].ws, ['game', {
        number: this.number,
        players: Object.keys(this.playerNames),
        index: i,
        forceCount: this.forceCount(),
        force: this.players[pl].force,
        ready: this.ready()
      }]);
    });
  }

  addPlayer(ws, name, address) {
    if (this.players[address]) {
      this.trySend(ws, ['error', 'address_in_use']);
    } else if (this.playerNames[name]) {
      this.trySend(ws, ['error', 'name_in_use']);
    } else if (this.ready()) {
    } else {
      ws.games = ws.games || [];
      ws.games.push(this.number);

      name = name.toString().substring(0, 20);
      this.playerNames[name] = true;
      this.players[address] = {
        name: name,
        ws: ws
      };

      this.sendLobby();
      if (this.ready()) {
        setTimeout(this.start.bind(this), START_TIMEOUT);
      }
    }
  }

  toggleForce(address) {
    if (this.players[address] && !this.ready()) {
      this.players[address].force = !this.players[address].force;

      this.sendLobby();
      if (this.ready()) {
        setTimeout(this.start.bind(this), START_TIMEOUT);
      }
    }
  }

  stop(address) {
    if (this.players[address]) {
      if (this.ready()) {
        this.players[address].left = true;
        this.trySend(this.players[address].ws, ['game', { over: true }]);
      } else {
        delete this.playerNames[this.players[address].name];
        delete this.players[address];

        this.sendLobby();
        if (this.ready()) {
          setTimeout(this.start.bind(this), START_TIMEOUT);
        }
      }
    }
  }

  ready() {
    const players = Object.keys(this.players).length;
    return players == 8 || (players >= 2 && this.forceCount() >= Math.ceil(players * 0.7));
  }
}

class GameFactory {
  constructor() {
    this.number = 1;
    this.activeGames = {};
  }

  find(number) {
    return this.activeGames[number];
  }

  end(number) {
    delete this.activeGames[number];
  }

  createGame() {
    const game = new Game(this.number++, this);
    this.activeGames[game.number] = game;
    return game;
  }
}

const gameFactory = new GameFactory();
let gameNew = gameFactory.createGame();

function handleMessage(ws, msgRaw, address) {
  let msg;
  try {
    msg = JSON.parse(msgRaw);
  } catch(e) {
  }

  if (!msg || !(msg instanceof Array)) {
    return;
  }

  if (msg[0] == 'start') {
    if (gameNew.ready()) {
      gameNew = gameFactory.createGame();
    }
    gameNew.addPlayer(ws, msg[1], address);
  } else {
    const game = gameFactory.find(msg[1]);
    if (game) {
      switch(msg[0]) {
        case 'toggle_force': {
          game.toggleForce(address);
          break;
        }
        case 'stop': {
          game.stop(address);
          break;
        }
        case 'move': {
          game.move(address, msg[2]);
          break;
        }
      }
    }
  }
}

function wsAddress(ws) {
  const addr = ws.upgradeReq.headers['x-forwarded-for'] || ws._socket.remoteAddress; 
  if (process.env.NODE_ENV == 'development') {
    return addr + ws.id;
  } else {
    return addr;
  }
}

wss.on('connection', (ws) => {
  if (ws.id == null) {
    ws.id = Math.random();
  }

  const address = wsAddress(ws);

  ws.on('message', (msg) => handleMessage(ws, msg, address));

  ws.on('close', () => {
    for (const gameNumber of (ws.games || [])) {
      const game = gameFactory.find(gameNumber);
      if (game) {
        game.stop(address);
      }
    }
  });
});
