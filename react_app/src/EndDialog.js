import React from 'react';
import StoreComponent from './StoreComponent';

export default class EndDialog extends StoreComponent {
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
