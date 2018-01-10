import React from 'react';
import StoreComponent from './StoreComponent';
import Tile from './Tile';
import { SIDE, genArray, arraysEqual } from './util';

export default class Board extends StoreComponent {
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
