/**
 * CORE/SETTINGS.JS
 * Settings state management for the application.
 * Handles persistence to localStorage and provides getters/setters.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const SETTINGS_KEY = 'neteru-settings-v1';

/**
 * Default settings values
 * @type {Object}
 */
const DEFAULT_SETTINGS = {
  // Audio settings
  autoplay: false,
  fadeDuration: 0.8,
  
  // Display settings
  reduceEffects: false,
  reduceMotion: false
};

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Load settings from localStorage with defaults
 * @returns {Object} Settings object
 */
export const loadSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
};

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log('⚙️ Settings saved');
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
};

/**
 * Update a single setting and persist
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @returns {Object} Updated settings object
 */
export const updateSetting = (key, value) => {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
  return settings;
};

/**
 * Get a single setting value
 * @param {string} key - Setting key
 * @returns {*} Setting value or default
 */
export const getSetting = (key) => {
  const settings = loadSettings();
  return settings[key] ?? DEFAULT_SETTINGS[key];
};

// ============================================================================
// SETTINGS APPLICATION
// ============================================================================

/**
 * Apply reduce motion setting to document
 * @param {boolean} enabled - Whether reduce motion is enabled
 */
export const applyReduceMotion = (enabled) => {
  if (enabled) {
    document.documentElement.classList.add('reduce-motion');
  } else {
    document.documentElement.classList.remove('reduce-motion');
  }
  console.log('⚙️ Reduce motion:', enabled);
};

/**
 * Apply reduce effects setting (for Three.js)
 * @param {boolean} enabled - Whether reduce effects is enabled
 */
export const applyReduceEffects = (enabled) => {
  if (enabled) {
    document.documentElement.classList.add('reduce-effects');
  } else {
    document.documentElement.classList.remove('reduce-effects');
  }
  console.log('⚙️ Reduce effects:', enabled);
};

/**
 * Apply all settings on page load
 */
export const applyAllSettings = () => {
  const settings = loadSettings();
  applyReduceMotion(settings.reduceMotion);
  applyReduceEffects(settings.reduceEffects);
  console.log('⚙️ All settings applied:', settings);
};

/**
 * Get default settings object
 * @returns {Object} Default settings
 */
export const getDefaultSettings = () => ({ ...DEFAULT_SETTINGS });
