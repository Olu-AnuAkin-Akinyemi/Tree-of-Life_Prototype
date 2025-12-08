/**
 * CORE/PURE.JS
 * Pure functions and data structures.
 * No side effects, no mutations, no I/O.
 * 
 * Contains:
 * - Data definitions (PAUTTI_NETERU)
 * - Validation functions
 * - Calculation functions
 * - Data transformation helpers
 */

// ============================================================================
// DATA DEFINITIONS - The Divine Company (Pautti Neteru)
// ============================================================================

export const PAUTTI_NETERU = {
  0: {
    id: 0,
    sphere: 0,
    name: 'Amun-Nun',
    title: 'The Hidden One',
    frequency: 432,
    chakra: 'Crown + Beyond',
    color: 0x1a0033,
    teaching: 'Unmanifested source of all creation, infinite potential.',
    symbol: '∞'
  },
  1: {
    id: 1,
    sphere: 1,
    name: 'Ra-Atum',
    title: 'The Self-Created',
    frequency: 396,
    chakra: 'Crown',
    color: 0xffdd44,
    teaching: 'Divine consciousness awakening to itself.',
    symbol: '☉'
  },
  2: {
    id: 2,
    sphere: 2,
    name: 'Tehuti',
    title: 'Divine Wisdom',
    frequency: 417,
    chakra: 'Third Eye',
    color: 0x4488ff,
    teaching: 'Cosmic intelligence and the power of the word.',
    symbol: '𓁟'
  },
  3: {
    id: 3,
    sphere: 3,
    name: 'Seker',
    title: 'The Light in Darkness',
    frequency: 528,
    chakra: 'Throat',
    color: 0x00ff88,
    teaching: 'Hidden life force waiting to emerge from stillness.',
    symbol: '◬'
  },
  4: {
    id: 4,
    sphere: 4,
    name: 'Maat',
    title: 'Truth & Justice',
    frequency: 639,
    chakra: 'Heart',
    color: 0xff6b9d,
    teaching: 'Divine order, balance, and righteous living.',
    symbol: '⚖'
  },
  5: {
    id: 5,
    sphere: 5,
    name: 'Heru-Khuti',
    title: "Karma's Guardian",
    frequency: 741,
    chakra: 'Solar Plexus',
    color: 0xff9933,
    teaching: 'The enforcer of cosmic law and karmic balance.',
    symbol: '𓅃'
  },
  6: {
    id: 6,
    sphere: 6,
    name: 'Heru',
    title: 'The Will',
    frequency: 852,
    chakra: 'Solar Plexus',
    color: 0xffaa00,
    teaching: 'Individual choice and the power to act.',
    symbol: '⊕'
  },
  7: {
    id: 7,
    sphere: 7,
    name: 'Het-Heru',
    title: 'Joy & Emotion',
    frequency: 963,
    chakra: 'Sacral',
    color: 0xff66cc,
    teaching: 'Love, beauty, and emotional nourishment.',
    symbol: '♀'
  },
  8: {
    id: 8,
    sphere: 8,
    name: 'Aset',
    title: 'The Healer',
    frequency: 174,
    chakra: 'Throat + Heart',
    color: 0x66ddff,
    teaching: 'Intuitive wisdom and the power to restore.',
    symbol: '𓊨'
  },
  9: {
    id: 9,
    sphere: 9,
    name: 'Asar',
    title: 'Resurrection',
    frequency: 285,
    chakra: 'Root + Heart',
    color: 0x00cc66,
    teaching: 'Death, rebirth, and eternal transformation.',
    symbol: '𓋹'
  },
  10: {
    id: 10,
    sphere: 10,
    name: 'Geb',
    title: 'Earth Foundation',
    frequency: 111,
    chakra: 'Root',
    color: 0x8b6914,
    teaching: 'Physical manifestation and grounded presence.',
    symbol: '⛰'
  },
};

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  sessions: 'kemetic_practices',
  journals: 'kemetic_journals',
  lastNeter: 'kemetic_last_neter'
};

// ============================================================================
// PURE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate today's neter based on day of month
 * @param {Date} date - Optional date, defaults to today
 * @returns {Object} Neter object with id
 */
export const getDailyNeter = (date = new Date()) => {
  const day = date.getDate();
  const neterId = day % 11;
  return { id: neterId, ...PAUTTI_NETERU[neterId] };
};

/**
 * Get neter by ID with validation
 * @param {number} id - Neter ID (0-10)
 * @returns {Object|null} Neter object or null if invalid
 */
export const getNeterById = (id) => {
  if (!isValidNeterId(id)) return null;
  return { id, ...PAUTTI_NETERU[id] };
};

/**
 * Get all neter IDs as array
 * @returns {number[]} Array of valid neter IDs
 */
export const getAllNeterIds = () => Object.keys(PAUTTI_NETERU).map(Number);

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate neter ID
 * @param {number} id - ID to validate
 * @returns {boolean} True if valid
 */
export const isValidNeterId = (id) => {
  return typeof id === 'number' && id >= 0 && id <= 10 && Number.isInteger(id);
};

/**
 * Validate frequency value
 * @param {number} freq - Frequency in Hz
 * @returns {boolean} True if valid frequency
 */
export const isValidFrequency = (freq) => {
  return typeof freq === 'number' && freq > 0 && freq < 20000;
};

/**
 * Validate color hex value
 * @param {number} color - Hex color value
 * @returns {boolean} True if valid hex color
 */
export const isValidColor = (color) => {
  return typeof color === 'number' && color >= 0x000000 && color <= 0xffffff;
};

// ============================================================================
// DATA TRANSFORMATION HELPERS
// ============================================================================

/**
 * Convert hex color to CSS hex string
 * @param {number} color - Hex color value
 * @returns {string} CSS hex color string
 */
export const colorToHex = (color) => {
  if (!isValidColor(color)) return '#000000';
  return `#${color.toString(16).padStart(6, '0')}`;
};

/**
 * Format duration in seconds to human readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "5m 23s")
 */
export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

/**
 * Format date to locale string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

/**
 * Create neter display badge text
 * @param {Object} neter - Neter object
 * @returns {string} Badge text
 */
export const createBadgeText = (neter) => {
  if (!neter || !neter.frequency || !neter.chakra) return '';
  return `${neter.frequency} Hz • ${neter.chakra}`;
};

// ============================================================================
// STATE HELPERS (Pure - return new objects)
// ============================================================================

/**
 * Create initial application state
 * @returns {Object} Initial state object
 */
export const createInitialState = () => ({
  currentNeter: getDailyNeter(),
  isPlaying: false,
  isMuted: false,
  sessionStart: null
});

/**
 * Update state with new neter (immutable)
 * @param {Object} state - Current state
 * @param {number} neterId - New neter ID
 * @returns {Object} New state object
 */
export const updateNeterInState = (state, neterId) => {
  const neter = getNeterById(neterId);
  if (!neter) return state;
  
  return {
    ...state,
    currentNeter: neter,
    isPlaying: false,
    sessionStart: null
  };
};

/**
 * Toggle playing state (immutable)
 * @param {Object} state - Current state
 * @returns {Object} New state object
 */
export const togglePlaying = (state) => ({
  ...state,
  isPlaying: !state.isPlaying,
  sessionStart: !state.isPlaying ? Date.now() : state.sessionStart
});

/**
 * Toggle mute state (immutable)
 * @param {Object} state - Current state
 * @returns {Object} New state object
 */
export const toggleMute = (state) => ({
  ...state,
  isMuted: !state.isMuted
});

// Export storage keys
export const storageKeys = STORAGE_KEYS;
