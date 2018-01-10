import { createStore } from 'redux';

const initialState = {};

export default createStore((state, action) => {
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
