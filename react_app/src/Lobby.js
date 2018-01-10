import React from 'react';
import StoreComponent from './StoreComponent';
import { COLORS } from './util';
import store from './store';

export default class Lobby extends StoreComponent {

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
