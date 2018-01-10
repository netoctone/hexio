import React from 'react';
import StoreComponent from './StoreComponent';
import { COLORS, genArray } from './util';

export default class Stat extends StoreComponent {
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
