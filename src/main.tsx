import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './index.css';

// Register Service Worker for 100% offline support
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New version detected. Reloading...');
  },
  onOfflineReady() {
    console.log('Pokédex is cached and ready for offline use.');
  }
});

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
