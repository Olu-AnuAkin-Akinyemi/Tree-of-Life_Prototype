/**
 * INFRA/MESSENGER.JS
 * All side effects, I/O operations, and external communications.
 * Handles: Audio (Web Audio API), localStorage, async operations.
 * 
 * This module is IMPURE - it talks to the outside world.
 * Contains async/await where needed and proper error handling.
 */

import { storageKeys, isValidFrequency } from '../core/pure.js';

// ============================================================================
// AUDIO ENGINE - Web Audio API
// ============================================================================

let audioContext = null;
let gainNode = null;
let oscillator = null;
let isPlaying = false;

/**
 * Initialize or resume audio context
 * @returns {Promise<void>}
 */
export const ensureAudioContext = async () => {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
    
    gainNode = audioContext.createGain();
    gainNode.gain.value = 0; // Start at 0 for fade in
    gainNode.connect(audioContext.destination);
  }
  
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (err) {
      // Browser blocked autoplay - will resume on first user interaction
      console.info('Audio context suspended, will resume on user interaction');
    }
  }
};

/**
 * Play frequency tone with fade in
 * @param {number} frequency - Frequency in Hz
 * @returns {Promise<number>} Timestamp when playback started
 */
export const playFrequency = async (frequency) => {
  if (!isValidFrequency(frequency)) {
    throw new Error(`Invalid frequency: ${frequency}`);
  }
  
  await ensureAudioContext();
  
  // Stop existing oscillator if playing
  if (oscillator) {
    await stopSound();
  }
  
  oscillator = audioContext.createOscillator();
  oscillator.type = 'sine'; // Pure sine wave for healing tones
  oscillator.frequency.value = frequency;
  oscillator.connect(gainNode);
  oscillator.start();
  
  // Fade in over 0.5 seconds
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.5);
  
  isPlaying = true;
  return Date.now();
};

/**
 * Smoothly transition to a new frequency without stopping
 * @param {number} newFrequency - The target frequency in Hz
 * @returns {Promise<void>}
 */
export const transitionFrequency = async (newFrequency) => {
  if (!isValidFrequency(newFrequency)) {
    throw new Error(`Invalid frequency: ${newFrequency}`);
  }
  
  if (!oscillator || !isPlaying) {
    // If not playing, just start normally
    return playFrequency(newFrequency);
  }
  
  await ensureAudioContext();
  
  const now = audioContext.currentTime;
  const crossfadeTime = 0.35; // 350ms fast but smooth crossfade
  
  console.log('🔄 Crossfading from', oscillator.frequency.value, 'Hz to', newFrequency, 'Hz');
  
  // Store reference to old oscillator
  const oldOscillator = oscillator;
  
  // Create new oscillator immediately
  oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = newFrequency;
  oscillator.connect(gainNode);
  oscillator.start(now);
  
  // Crossfade: fade out old gain, then fade in new
  const currentGain = gainNode.gain.value;
  gainNode.gain.setValueAtTime(currentGain, now);
  gainNode.gain.linearRampToValueAtTime(0, now + crossfadeTime / 2);
  gainNode.gain.linearRampToValueAtTime(0.15, now + crossfadeTime);
  
  // Stop old oscillator at the midpoint of crossfade
  try {
    oldOscillator.stop(now + crossfadeTime / 2);
  } catch (err) {
    console.warn('Error stopping old oscillator:', err);
  }
  
  // Clean up old oscillator after it stops
  setTimeout(() => {
    try {
      oldOscillator.disconnect();
      console.log('✅ Old oscillator disconnected');
    } catch (err) {
      console.warn('Error disconnecting old oscillator:', err);
    }
  }, (crossfadeTime / 2) * 1000 + 100);
  
  // Keep playing state true
  isPlaying = true;
  
  console.log('🎵 New oscillator playing at', newFrequency, 'Hz');
};

/**
 * Stop currently playing sound with smooth fade out
 * @returns {Promise<number|null>} Timestamp when stopped, or null if nothing playing
 */
export const stopSound = async () => {
  if (!oscillator || !isPlaying) return null;
  
  try {
    const now = audioContext.currentTime;
    const fadeTime = 0.8; // 800ms fade out
    
    // Fade out
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);
    
    // Stop oscillator after fade
    await new Promise(resolve => setTimeout(resolve, fadeTime * 1000));
    
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    isPlaying = false;
  } catch (err) {
    console.warn('Error stopping oscillator:', err);
    oscillator = null;
    isPlaying = false;
  }
  
  return Date.now();
};

/**
 * Get current audio playing state
 * @returns {boolean}
 */
export const getIsPlaying = () => isPlaying;

/**
 * Get current audio context time for synchronization
 * @returns {number|null}
 */
export const getAudioTime = () => audioContext ? audioContext.currentTime : null;

/**
 * Toggle mute state
 * @param {boolean} muted - True to mute, false to unmute
 * @returns {Promise<void>}
 */
export const setMuteState = async (muted) => {
  await ensureAudioContext();
  gainNode.gain.value = muted ? 0 : 0.15;
};

// ============================================================================
// LOCALSTORAGE OPERATIONS
// ============================================================================

/**
 * Safe localStorage read with error handling
 * @param {string} key - Storage key
 * @returns {Array} Parsed array or empty array on error
 */
const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn(`Storage read failed for key "${key}":`, err);
    return [];
  }
};

/**
 * Safe localStorage write with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON.stringify'd)
 * @returns {boolean} True if successful
 */
const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Storage write failed for key "${key}":`, err);
    return false;
  }
};

/**
 * Log a practice session
 * @param {Object} sessionData - Session data
 * @returns {Array} Updated sessions list
 */
export const logSession = (sessionData) => {
  const sessions = safeRead(storageKeys.sessions);
  const entry = {
    id: Date.now(),
    ...sessionData,
    date: new Date().toISOString()
  };
  
  const updated = [entry, ...sessions].slice(0, 50); // Keep last 50
  safeWrite(storageKeys.sessions, updated);
  
  return updated;
};

/**
 * Save journal entry
 * @param {Object} journalData - Journal entry data
 * @returns {Array} Updated journals list
 */
export const saveJournalEntry = (journalData) => {
  const journals = safeRead(storageKeys.journals);
  const entry = {
    id: Date.now(),
    ...journalData,
    date: new Date().toISOString()
  };
  
  const updated = [entry, ...journals];
  safeWrite(storageKeys.journals, updated);
  
  return updated;
};

/**
 * Load all practice sessions
 * @returns {Array} Array of session objects
 */
export const loadSessions = () => safeRead(storageKeys.sessions);

/**
 * Load all journal entries
 * @returns {Array} Array of journal objects
 */
export const loadJournals = () => safeRead(storageKeys.journals);
