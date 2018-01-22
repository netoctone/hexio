export const COLORS = ['red', 'blue', 'green', 'purple', 'cyan', 'gold', 'tomato', 'fuchsia'];
export const SIDE = 20;
export const startTone = new Audio('public/start_tone.mp3');

export function sizeWidthLeft(store) {
  return store.game.size[1];
}

export function genArray(size) {
  return Array.from(new Array(size));
}

export function arraysEqual(a1, a2) {
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

export function direction(from, to, widthLeft) {
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
