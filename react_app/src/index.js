import React from 'react';
import ReactDOM from 'react-dom';

import { startTone } from './util';
import App from './App';

window.addEventListener('load', () => {
  ReactDOM.render(
    <App />,
    document.getElementById('app')
  );
});
