import { Component } from 'react';
import store from './store';

class StoreComponent extends Component {

  constructor(props) {
    super(props);
    this.state = { store: StoreComponent.store.getState() };
  }

  componentDidMount() {
    this._unsub = StoreComponent.store.subscribe(() => {
      if (!this._calledComponentWillUnmount) {
        const shouldSet = !this.shouldComponentSetState || this.shouldComponentSetState(Object.assign({}, this.state, { store: StoreComponent.store.getState() }));

        if (shouldSet) {
          this.setState({ store: StoreComponent.store.getState() });
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

StoreComponent.store = store;

export default StoreComponent;
