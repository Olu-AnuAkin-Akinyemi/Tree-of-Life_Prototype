/**
 * MAIN.JS
 * Application entry point.
 * Initializes the Pautti Neteru app when ready.
 */

import { init } from './app/commander.js';



console.log('🚀 Main.js loaded');

// Wait for DOM and THREE.js to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    // Give THREE.js time to load from CDN
    setTimeout(() => {
      try {
        init();
      } catch (err) {
        console.error('❌ Initialization failed:', err);
        alert('Failed to initialize app. Check console for details.');
      }
    }, 100);
  });
} else {
  // DOM already loaded
  console.log('📄 DOM Already Ready');
  setTimeout(() => {
    try {
      init();
    } catch (err) {
      console.error('❌ Initialization failed:', err);
      alert('Failed to initialize app. Check console for details.');
    }
  }, 100);
}

