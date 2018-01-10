import React from 'react';
import Board from './Board';
import Stat from './Stat';
import Lobby from './Lobby';
import SurrenderDialog from './SurrenderDialog';
import EndDialog from './EndDialog';
import StoreComponent from './StoreComponent';
import { arraysEqual, sizeWidthLeft, direction } from './util';
import store from './store';

class Game extends Board {
}

export default class App extends StoreComponent {
  constructor() {
    super();

    this.connect();
    setInterval(() => this.trySend(JSON.stringify(['ping'])), 30*1000);

    this.moves = [];
    this.lastMoveStep = 0;
  }

  connect() {
    let url;
    if (window.location.origin[4] == 's') {
      url = `wss://${window.location.hostname}`;
    } else {
      url = `ws://${window.location.hostname}:8080`;
    }

    this.socket = new WebSocket(url);
    this.socket.addEventListener('open', (event) => {
    });
    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.length) {
        switch (data[0]) {
          case 'game': {
            store.dispatch({ type: 'game', game: data[1] });
            if (data[1].size) {
              this.lastMoveStep = 0;
            }
            this.dispatchMoves();
            this.makeMove();
            break;
          }
          case 'error': {
            alert(data[1]);
            break;
          }
        }
      }
    });
    this.socket.addEventListener('error', (event) => {
      switch(event.code) {
        case 'ECONNREFUSED': {
          break;
        }
      }
    });
  }

  trySend(data) {
    if (this.socket.readyState == 1) {
      this.socket.send(data);
    } else {
      alert('connection lost');
      this.connect();
      store.dispatch({ type: 'game', game: null });
    }
  }

  handleKey(e) {
    const coord = this.state.store.coord;

    if (coord) {
      const widthLeft = sizeWidthLeft(this.state.store);
      const upcase = e.charCode < 97;

      if (e.charCode == 120 || e.charCode == 88) {
        this.moves = [];
      } else if (e.charCode == 122 || e.charCode == 90) {
        this.setState({ surrenderDialog: !this.state.surrenderDialog });
      } else if (e.charCode == 113 || e.charCode == 81) {
        this.onSelect([coord[0] - 1, coord[1] + (coord[0] < widthLeft ? -1 : 0)], upcase);
      } else if (e.charCode == 97 || e.charCode == 65) {
        this.onSelect([coord[0] - 1, coord[1] + (coord[0] < widthLeft ? 0 : 1)], upcase);
      } else if (e.charCode == 119 || e.charCode == 87) {
        this.onSelect([coord[0], coord[1] - 1], upcase);
      } else if (e.charCode == 115 || e.charCode == 83) {
        this.onSelect([coord[0], coord[1] + 1], upcase);
      } else if (e.charCode == 101 || e.charCode == 69) {
        this.onSelect([coord[0] + 1, coord[1] + (coord[0] < (widthLeft-1) ? 0 : -1)], upcase);
      } else if (e.charCode == 100 || e.charCode == 68) {
        this.onSelect([coord[0] + 1, coord[1] + (coord[0] < (widthLeft-1) ? 1 : 0)], upcase);
      }
    }
  }

  makeMove() {
    if (this.moves[0] && this.state.store.game.step > this.lastMoveStep) {
      let data = this.state.store.game.cells[this.moves[0][0]];
      while (this.moves[0] && (!data || data[2] == null || data[1] <= 1 || data[2] != this.state.store.game.index || !direction(this.moves[0][0], this.moves[0][1], sizeWidthLeft(this.state.store)))) {
        this.moves.shift();
        if (this.moves[0]) {
          data = this.state.store.game.cells[this.moves[0][0]];
        }
      }

      const move = this.moves.shift();
      this.trySend(JSON.stringify(['move', this.state.store.game.number, move]));
      this.lastMoveStep = this.state.store.game.step;
    }
  }

  dispatchMoves() {
    const moves = {};
    for (const move of this.moves) {
      moves[move[0]] = move[1];
    }
    store.dispatch({ type: 'game', game: { moves: moves } });
  }

  onMove(from, to, upcase) {
    this.moves.push([from, to, upcase && 1]);
    this.dispatchMoves();
    this.makeMove();
  }

  onSelect(coord, upcase) {
    if (this.state.store.coord) {
      this.onMove(this.state.store.coord, coord, upcase);
    }

    store.dispatch({ type: 'coord', coord: coord });
  }

  handleStart(nickname) {
    this.trySend(JSON.stringify(['start', nickname]));
  }

  handleCancel() {
    this.trySend(JSON.stringify(['stop', this.state.store.game.number]));
    store.dispatch({ type: 'game', game: null });
  }

  handleRestart() {
    store.dispatch({ type: 'game', game: null });
    this.handleStart(this.state.store.nickname);
  }

  handleQuit() {
    store.dispatch({ type: 'game', game: null });
  }

  handleForce() {
    this.trySend(JSON.stringify(['toggle_force', this.state.store.game.number]));
  }

  handleSurrender() {
    this.trySend(JSON.stringify(['stop', this.state.store.game.number]));
    this.setState({ surrenderDialog: false });
  }

  shouldComponentSetState(newState) {
    return true;
  }

  shouldComponentUpdate(newProps, newState) {
    const sizeOld = this.state.store.game && !this.state.store.game.over && this.state.store.game.size;
    const sizeNew = newState.store.game && !newState.store.game.over && newState.store.game.size;
    return !arraysEqual(sizeOld, sizeNew) || this.state.surrenderDialog != newState.surrenderDialog;
  }

  render() {
    return (<div tabIndex={0} onKeyPress={this.handleKey.bind(this)} style={{outline: 'none'}}>
      {
        (this.state.store.game && this.state.store.game.size)
          && (<div>
                <Game onSelect={this.onSelect.bind(this)} />
                <Stat />
             </div>)
          || (<Lobby onCancel={this.handleCancel.bind(this)}
                     onStart={this.handleStart.bind(this)}
                     onForce={this.handleForce.bind(this)}/>)
      }
      {
        (this.state.store.game && this.state.store.game.over)
        && (<EndDialog onQuit={this.handleQuit.bind(this)}
                       onRestart={this.handleRestart.bind(this)} />)
      }
      {
        (this.state.surrenderDialog && (!this.state.store.game || !this.state.store.game.over))
        && (<SurrenderDialog onSurrender={this.handleSurrender.bind(this)} />)
      }
    </div>);
  }
}
