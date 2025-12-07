/**
 * MAIN.JS
 * Application entry point.
 * Initializes the Pautti Neteru app when ready.
 */

import { init } from './app/commander.js';

console.log('🚀 Main.js loaded');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    // Small delay to ensure THREE.js is available on window
    setTimeout(() => {
      try {
        init();
      } catch (err) {
        console.error('❌ Initialization failed:', err);
      }
    }, 50);
  });
} else {
  // DOM already loaded
  console.log('📄 DOM Already Ready');
  setTimeout(() => {
    try {
      init();
    } catch (err) {
      console.error('❌ Initialization failed:', err);
    }
  }, 50);
}
