import React from 'react';
import StoreComponent from './StoreComponent';
import { COLORS, SIDE, arraysEqual, sizeWidthLeft, direction } from './util';

export default class Tile extends StoreComponent {

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
