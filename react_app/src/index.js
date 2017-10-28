import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { createStore } from 'redux';

const initialState = {};

const store = createStore((state, action) => {
  state = state || initialState;

  switch(action.type) {
    case 'game': {
      if (!state.game || !action.game || (state.game && action.game && action.game.number && state.game.number != action.game.number)) {
        return Object.assign({}, state, { game: action.game });
      } else {
        if (action.game.update) {
          action.game.cells = Object.assign({}, state.game.cells, action.game.update);
        }

        return Object.assign({}, state, {
          game: Object.assign({}, state.game, action.game)
        });
      }
    }
    case 'coord': {
      return Object.assign({}, state, { coord: action.coord });
    }
    case 'nickname': {
      return Object.assign({}, state, { nickname: action.nickname });
    }
    default:
      return state;
  }
});

function genArray(size) {
  return Array.from(new Array(size));
}

class StoreComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { store: store.getState() };
  }

  componentDidMount() {
    this._unsub = store.subscribe(() => {
      if (!this._calledComponentWillUnmount) {
        const shouldSet = !this.shouldComponentSetState || this.shouldComponentSetState(Object.assign({}, this.state, { store: store.getState() }));

        if (shouldSet) {
          this.setState({ store: store.getState() });
        }
      }
    });
  }

  componentWillUnmount() {
    if (this._unsub) {
      this._unsub();
      delete this._unsub;
    }
  }
}

function sizeWidthLeft(store) {
  return store.game.size[1];
}

class App extends StoreComponent {
  constructor() {
    super();

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
          this.socket.reconnect(event);
          break;
        }
      }
    });

    this.moves = [];
    this.lastMoveStep = 0;
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
      this.socket.send(JSON.stringify(['move', this.state.store.game.number, move]));
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
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(['start', nickname]));
    }
  }

  handleCancel() {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(['stop', this.state.store.game.number]));
      store.dispatch({ type: 'game', game: null });
    }
  }

  handleRestart() {
    store.dispatch({ type: 'game', game: null });
    this.handleStart(this.state.store.nickname);
  }

  handleQuit() {
    store.dispatch({ type: 'game', game: null });
  }

  handleForce() {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(['toggle_force', this.state.store.game.number]));
    }
  }

  handleSurrender() {
    if (this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(['stop', this.state.store.game.number]));
      this.setState({ surrenderDialog: false });
    }
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

class Stat extends StoreComponent {
  render() {
    const style = {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: '#e3e3e3',
      fontSize: '12px'
    };

    const game = this.state.store.game;

    if (!game.playersArmy) {
      return (<div />);
    } else {
      return (<table style={style}><tbody>
        <tr>
          <th>Player</th>
          <th>Troops</th>
          <th>Territory</th>
        </tr>
        {
          genArray(game.players.length)
            .map((v, i) => i)
            .sort((i1, i2) => - game.playersArmy[i1] + game.playersArmy[i2])
            .map((i) => {
              return (<tr key={i} style={{color: (game.playersLeft[i] || game.playersDead[i]) && 'white'}}>
                <td><div className='flag' style={{backgroundColor: COLORS[i]}}/> {game.players[i]}</td>
                <td>{game.playersArmy[i]}</td>
                <td>{game.playersArea[i]}</td>
              </tr>);
            })
        }
      </tbody></table>);
    }
  }
}

class SurrenderDialog extends Component {
  render() {
    const style = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      backgroundColor: '#c3c3c3',
      padding: '10px'
    };

    return (<div style={style}>
      <button className='btn' onClick={this.props.onSurrender}>Surrender</button>
    </div>);
  }
}

class EndDialog extends StoreComponent {
  render() {
    const style = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      backgroundColor: '#c3c3c3',
      padding: '10px'
    };

    return (<div style={style}>
      { this.state.store.game.win ? "Victory!" : "Game over" }
      <div className='space' />
      <button className='btn' onClick={this.props.onRestart}>Play again</button>
      <div className='space' />
      <button className='btn' onClick={this.props.onQuit}>Quit</button>
    </div>);
  }
}

class Lobby extends StoreComponent {

  constructor(props) {
    super(props);
    this.state.force = false;
  }

  handleNickname(e) {
    store.dispatch({ type: 'nickname', nickname: e.target.value });
  }

  onPlay() {
    this.props.onStart(this.state.store.nickname);
  }

  handleForce() {
    if (this.state.force == !!this.state.store.game.force) {
      this.state.force = !this.state.force;
      this.props.onForce();
    }
  }

  render() {
    const styleLobby = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translateX(-50%) translateY(-50%)'
    };

    const styleText = {
      color: 'white'
    };

    const styleColor = {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      backgroundColor: this.state.store.game && COLORS[this.state.store.game.index]
    };

    return (<div style={styleLobby}>
      {
        this.state.store.game
        && <div>
          <div style={styleText}>
            {
              this.state.store.game.ready
              && <div>Starting</div>
              || <div>Waiting for players...</div>
            }
            <div>{this.state.store.game.players.length} of 8</div>
            <div>Your color - <div style={styleColor} /></div>
          </div>
          <div className='space' />
          {
            !this.state.store.game.ready &&
            <button className={`btn ${this.state.store.game.force && 'active' || ''}`}
                    onClick={this.handleForce.bind(this)}>
              Force start
              { this.state.store.game.forceCount > 0 && ` ${this.state.store.game.forceCount}/${Math.ceil(this.state.store.game.players.length * 0.7)}` }
            </button>
          }
          <div className='space' />
          <button className='btn' onClick={this.props.onCancel}>Cancel</button>
        </div>
        || <div>
          <input value={this.state.store.nickname || ''} onChange={this.handleNickname.bind(this)} type='text' />
          <div className='space' />
          <button className='btn' onClick={this.onPlay.bind(this)} disabled={!this.state.store.nickname}>
            Play
          </button>
          <div className='space' />
          <div style={Object.assign({}, styleText, { fontSize: '10px' })}>
            <div>[q][w][e][a][s][d] for movement</div>
            <div>[Q][W][E][A][S][D] for moving 50%</div>
            <div>[X] to cancel the sequence of moves</div>
            <div>[Z] to exit game</div>
          </div>
        </div>
      }
    </div>);
  }
}

function direction(from, to, widthLeft) {
  if (from[0] == to[0]) {
    if (from[1] == to[1] + 1) {
      return 'n';
    } else if (from[1] == to[1] - 1) {
      return 's';
    }
  } else if (from[0] == to[0] - 1) {
    if (from[0] < widthLeft - 1) {
      if (from[1] == to[1] - 1) {
        return 'se';
      } else if (from[1] == to[1]) {
        return 'ne';
      }
    } else {
      if (from[1] == to[1] + 1) {
        return 'ne';
      } else if (from[1] == to[1]) {
        return 'se';
      }
    }
  } else if (from[0] == to[0] + 1) {
    if (from[0] < widthLeft) {
      if (from[1] == to[1] + 1) {
        return 'nw';
      } else if (from[1] == to[1]) {
        return 'sw';
      }
    } else {
      if (from[1] == to[1] - 1) {
        return 'sw';
      } else if (from[1] == to[1]) {
        return 'nw';
      }
    }
  }
}

class Board extends StoreComponent {
  constructor(props) {
    super(props);
  }

  shouldComponentSetState(newState) {
    return newState.store.game && this.shouldComponentUpdate(this.props, newState);
  }

  shouldComponentUpdate(newProps, newState) {
    return !arraysEqual(this.state.store.game.size, newState.store.game.size);
  }

  parseSize() {
    return {
      widthRight: this.state.store.game.size[0],
      widthLeft: this.state.store.game.size[1],
      height: this.state.store.game.size[2]
    };
  }

  render() {
    const size = this.parseSize();
    const maxHeight = size.height + Math.min(size.widthRight, size.widthLeft) - 1;
    const colsNum = size.widthLeft + size.widthRight - 1;

    const style = {
      position: 'relative',
      width: colsNum * (1 + SIDE * 3 / 2) + SIDE / 2,
      margin: 'auto'
    };

    return (<div style={style}>{
      genArray(colsNum).map((e, i) => {
        let height, offset;
        if (i < size.widthLeft) {
          height = Math.min(maxHeight, size.height + i);
          offset = size.widthLeft - i - 1;
        } else {
          height = Math.min(maxHeight, size.height + colsNum - i - 1);
          offset = i - size.widthLeft + 1;
        }

        return genArray(height).map((e, j) => {
          const coord = [i, j];
          return <Tile left={i} top={offset + 2*j}
                       coord={coord}
                       lastVertical={j == height-1}
                       onSelect={this.props.onSelect.bind(this, coord)} />;
        });
      })
    }</div>);
  }
}

class Game extends Board {
}

const SIDE = 20;
const COLORS = ['red', 'blue', 'green', 'purple', 'cyan', 'gold', 'tomato', 'fuchsia'];

class Tile extends StoreComponent {

  move(direction, side, height, color, top, left) {
    switch (direction) {
      case 'n': {
        return (<div style={{position: 'absolute', top: top + 1, left: left + side/2, height: height/4, borderLeft: '1px solid white'}} />);
      }
      case 's': {
        return (<div style={{position: 'absolute', top: top + (height - height/4), left: left + side/2, height: height/4, borderLeft: '1px solid white'}} />);
      }
      case 'ne': {
        const style = {
          position: 'absolute',
          top: top + height/4,
          left: left + side,
          borderTop: `${height/4}px solid transparent`,
          borderRight: `${side/4}px solid white`,
        };
        const styleInner = Object.assign({}, style, {
          top: style.top + 1,
          borderRight: `${side/4}px solid ${color}`
        });

        return (<div>
          <div style={style} />
          <div style={styleInner} />
        </div>);
      }
      case 'se': {
        const style = {
          position: 'absolute',
          left: left + side,
          top: top + 1 + height/2,
          borderBottom: `${height/4}px solid transparent`,
          borderRight: `${side/4}px solid white`,
        };
        const styleInner = Object.assign({}, style, {
          top: style.top - 1,
          borderRight: `${side/4}px solid ${color}`
        });

        return (<div>
          <div style={style} />
          <div style={styleInner} />
        </div>);
      }
      case 'sw': {
        const style = {
          position: 'absolute',
          top: top + 1 + height/2,
          left: left - side/2 + side/4,
          borderBottom: `${height/4}px solid transparent`,
          borderLeft: `${side/4}px solid white`,
        };
        const styleInner = Object.assign({}, style, {
          top: style.top - 1,
          borderLeft: `${side/4}px solid ${color}`
        });

        return (<div>
          <div style={style} />
          <div style={styleInner} />
        </div>);
      }
      case 'nw': {
        const style = {
          position: 'absolute',
          top: top + height/4,
          left: left - side/2 + side/4,
          borderTop: `${height/4}px solid transparent`,
          borderLeft: `${side/4}px solid white`,
        };
        const styleInner = Object.assign({}, style, {
          top: style.top + 1,
          borderLeft: `${side/4}px solid ${color}`
        });

        return (<div>
          <div style={style} />
          <div style={styleInner} />
        </div>);
      }
    }
  }

  shouldComponentSetState(newState) {
    return newState.store.game && this.shouldComponentUpdate(this.props, newState);
  }

  shouldComponentUpdate(newProps, newState) {
    return JSON.stringify(this.tileData(this.props, this.state)) != JSON.stringify(this.tileData(newProps, newState));
  }

  tileData(props, state) {
    const selected = arraysEqual(state.store.coord, props.coord);
    const obst = state.store.game.obst && state.store.game.obst[props.coord];
    const move = state.store.game.moves && state.store.game.moves[props.coord] && direction(props.coord, state.store.game.moves[props.coord], sizeWidthLeft(state.store));
    const data = state.store.game.cells && state.store.game.cells[props.coord];

    return {
      selected: selected,
      obst: obst,
      move: move,
      data: data
    };
  }

  render() {
    const tileData = this.tileData(this.props, this.state);
    const selected = tileData.selected;
    const obst = tileData.obst;
    const move = tileData.move;
    const data = tileData.data;

    const color = (data && data.length) ? (data[2] != null ? COLORS[data[2]] : '#a3a3a3') : 'grey';
    const side = SIDE;
    let height = Math.round(side * Math.sqrt(3));
    if (height % 2 == 1) {
      height = height - 1;
    }
    const borderColor = 'black';
    const borderStyle = `1px solid ${borderColor}`;

    const styleCenter = {
      width: side,
      height: height - 1,
      backgroundColor: color,
      borderTop: borderStyle,
      position: 'absolute',
      top: (this.props.top / 2) * height,
      left: this.props.left + this.props.left * side * 3 / 2 + side / 2
    };

    if (this.props.lastVertical) {
      styleCenter.borderBottom = borderStyle;
    }

    const styleLeft = {
      width: 0,
      height: 1,
      position: 'absolute',
      top: styleCenter.top,
      left: styleCenter.left - side / 2 - 1,
      borderRight: `${side/2 + 1}px solid ${borderColor}`,
      borderTop: `${height/2}px solid transparent`,
      borderBottom: `${height/2}px solid transparent`
    };

    const styleRight = Object.assign({}, styleLeft, {
      left: styleCenter.left + side,
      borderLeft: styleLeft.borderRight,
      borderRight: 'none'
    });

    const styleLeftFill = Object.assign({}, styleLeft, {
      top: styleLeft.top + 1,
      left: styleLeft.left + 1,
      borderRight: `${side/2}px solid ${color}`,
      borderTop: `${height/2 - 1}px solid transparent`,
      borderBottom: `${height/2 - 1}px solid transparent`
    });

    const styleRightFill = Object.assign({}, styleRight, {
      top: styleLeftFill.top,
      left: styleRight.left,
      borderLeft: styleLeftFill.borderRight,
      borderTop: styleLeftFill.borderTop,
      borderBottom: styleLeftFill.borderBottom
    });

    const styleCount = {
      width: styleCenter.width * 2,
      height: styleCenter.height,
      position: 'absolute',
      top: styleCenter.top + 1,
      left: styleCenter.left - styleCenter.width / 2,
      verticalAlign: 'middle',
      display: 'table',
      fontSize: '12px'
    };

    const styleCircle = {
      width: side,
      height: side,
      position: 'absolute',
      top: styleCenter.top + (height - side) / 2 - 1,
      left: styleCenter.left - 1,
      border: '1px solid white',
      borderRadius: side / 2
    };

    let moveDiv = (<div />);
    if (move) {
      moveDiv = this.move(move, side, height, color, styleCenter.top, styleCenter.left);
    }

    const styleBase1 = {
      position: 'absolute',
      width: side/2,
      height: side,
      top: styleCenter.top + Math.floor((height - side) / 2),
      left: styleCenter.left + side/4,
      backgroundColor: 'white'
    };
    const styleBase2 = {
      position: 'absolute',
      width: side,
      height: side/2,
      top: styleBase1.top + side/4,
      left: styleBase1.left - side/4,
      backgroundColor: 'white'
    };
    const styleCity = {
      position: 'absolute',
      top: styleBase1.top,
      left: styleCenter.left,
      borderBottom: `${side}px solid white`,
      borderLeft: `${side/2}px solid transparent`,
      borderRight: `${side/2}px solid transparent`
    };

    return (<div>
      <div style={styleLeft}></div>
      <div style={styleLeftFill}></div>
      <div style={styleCenter} onClick={this.props.onSelect}></div>
      <div style={styleRight}></div>
      <div style={styleRightFill}></div>
      {moveDiv}
      { data && data[0] == 'b' && (<div><div style={styleBase1} /><div style={styleBase2} /></div>) }
      { data && data[0] == 'c' && (<div style={styleCity} />) }
      { selected && <div style={styleCircle} /> }
      <div style={styleCount} onClick={this.props.onSelect}>
        <div style={{display: 'table-cell', verticalAlign: 'middle', textAlign: 'center', cursor: 'default'}}>
          {
            data && data[1]
          }
          {
            (data && data[0] == 'o') && 'x'
          }
          {
            (!data || !data.length) && obst && "?"
          }
        </div>
      </div>
    </div>);
  }
}

function arraysEqual(a1, a2) {
  if (!a1 || !a2) {
    return a1 === a2;
  } else {
    if (a1.length !== a2.length) {
      return false;
    } else {
      for (let i = 0; i < a1.length; i++) {
        if (a1[i] !== a2[i]) {
          return false;
        }
      }
      return true;
    }
  }
}

window.addEventListener('load', () => {
  ReactDOM.render(
    <App />,
    document.getElementById('app')
  );
});
