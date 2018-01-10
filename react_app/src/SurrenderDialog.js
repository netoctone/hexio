import React, { Component } from 'react';

export default class SurrenderDialog extends Component {
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
