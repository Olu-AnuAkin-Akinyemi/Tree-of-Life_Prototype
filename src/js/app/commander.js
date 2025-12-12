/**
 * APP/COMMANDER.JS
 * Orchestration layer - coordinates all modules.
 * Handles: State management, event coordination, side effects.
 * 
 * This is the IMPURE coordinator that brings everything together.
 * Uses async/await, manages application state, orchestrates actions.
 */

import {
  getDailyNeter,
  getNeterById,
  createInitialState,
  updateNeterInState,
  togglePlaying as pureTogglePlaying,
  toggleMute as pureToggleMute
} from '../core/pure.js';

import {
  loadSettings,
  updateSetting,
  getSetting,
  applyAllSettings,
  applyReduceMotion,
  applyReduceEffects
} from '../core/settings.js';

import {
  ensureAudioContext,
  playFrequency,
  stopSound,
  transitionFrequency,
  setMuteState,
  logSession,
  saveJournalEntry,
  deleteJournalEntry,
  loadSessions,
  loadJournals,
  setVolume,
  getVolume,
  saveLastNeter,
  loadLastNeter
} from '../infra/messenger.js';

import {
  initThreeScene,
  renderDailyBanner,
  renderNeterInfo,
  renderNeterGrid,
  renderSidePanel,
  renderSidePanelList,
  renderSessionLog,
  renderJournalEntries,
  updatePlayButton,
  updateMuteButton,
  openModal,
  closeModal,
  getJournalText,
  clearJournalText,
  openSidePanel,
  closeSidePanel,
  isSidePanelOpen,
  setThreeAudioState,
  setThreeReducedEffects
} from '../ui/scribe.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================

let state = createInitialState();
let sceneController = null;

// ============================================================================
// NETER SELECTION
// ============================================================================

/**
 * Select a specific neter by ID
 */
export const selectNeter = async (neterId) => {
  console.log('Selecting neter:', neterId);
  
  const wasPlaying = state.isPlaying;
  
  // Update state
  state = updateNeterInState(state, neterId);
  
  // Persist the selection for returning users
  saveLastNeter(neterId);
  
  // Update UI
  renderNeterInfo(state.currentNeter);
  renderNeterGrid(state.currentNeter.id, selectNeter);
  renderSidePanel(state.currentNeter);
  renderSidePanelList(state.currentNeter.id, selectNeter);
  
  // Update THREE.js scene if available
  if (sceneController && sceneController.updateNeterVisuals) {
    sceneController.updateNeterVisuals(state.currentNeter);
  }
  
  // Handle audio based on state and autoplay setting
  const autoplayEnabled = getSetting('autoplay');
  
  if (wasPlaying && autoplayEnabled) {
    // Autoplay ON: Transition to new frequency smoothly
    try {
      console.log('🎵 Autoplay ON - transitioning to:', state.currentNeter.frequency);
      await transitionFrequency(state.currentNeter.frequency);
      console.log('✅ Successfully transitioned to new frequency:', state.currentNeter.frequency);
    } catch (err) {
      console.error('❌ Failed to transition frequency:', err);
    }
  } else if (wasPlaying && !autoplayEnabled) {
    // Autoplay OFF: Stop audio when navigating (user has manual control)
    console.log('🔇 Autoplay OFF - stopping audio on navigation');
    await stopSound();
    state = {
      ...state,
      isPlaying: false,
      sessionStart: null
    };
    updatePlayButton(false);
    setThreeAudioState(false);
  } else if (!wasPlaying && autoplayEnabled) {
    // Autoplay ON + not playing: Auto-start the new frequency
    console.log('🔊 Autoplay ON - starting frequency:', state.currentNeter.frequency);
    try {
      const timestamp = await playFrequency(state.currentNeter.frequency);
      state = {
        ...state,
        sessionStart: timestamp,
        isPlaying: true
      };
      updatePlayButton(true);
      setThreeAudioState(true);
    } catch (err) {
      console.error('❌ Failed to auto-start audio:', err);
    }
  }
  // else: not playing + autoplay OFF = do nothing (user has manual control)
};

// ============================================================================
// NAVIGATION
// ============================================================================

/**
 * Navigate to next neter in sequence
 */
export const handleNextNeter = () => {
  const currentId = state.currentNeter.id;
  const nextId = currentId === 10 ? 0 : currentId + 1;
  selectNeter(nextId);
};

/**
 * Navigate to previous neter in sequence
 */
export const handlePrevNeter = () => {
  const currentId = state.currentNeter.id;
  const prevId = currentId === 0 ? 10 : currentId - 1;
  selectNeter(prevId);
};

/**
 * Toggle play/pause for current neter
 */
export const handlePlayPause = async () => {
  if (state.isPlaying) {
    await handleStopSound();
  } else {
    await handleStartSound();
  }
};

/**
 * Start playing current neter frequency
 */
const handleStartSound = async () => {
  try {
    const timestamp = await playFrequency(state.currentNeter.frequency);
    
    // Update state (using pure function)
    state = pureTogglePlaying(state);
    state = {
      ...state,
      sessionStart: timestamp,
      isPlaying: true
    };
    
    // Update UI
    updatePlayButton(true);
    setThreeAudioState(true);
  } catch (err) {
    console.error('Failed to start sound:', err);
  }
};

/**
 * Stop playing and log session
 */
const handleStopSound = async () => {
  const stopTime = await stopSound();
  
  // Log session if it was playing
  if (state.sessionStart && stopTime) {
    const duration = Math.floor((stopTime - state.sessionStart) / 1000);
    
    if (duration > 0) {
      const sessionData = {
        neterId: state.currentNeter.id,
        neterName: state.currentNeter.name,
        duration
      };

      const sessions = logSession(sessionData);
      const logModal = document.getElementById('log-modal');
      if (logModal && logModal.classList.contains('visible')) {
        renderSessionLog(sessions);
      }
    }
  }

  // Update state
  state = {
    ...state,
    isPlaying: false,
    sessionStart: null
  };

  // Update UI
  updatePlayButton(false);
  setThreeAudioState(false);
};

/**
 * Toggle mute state
 */
export const handleMute = async () => {
  // Update state (using pure function)
  state = pureToggleMute(state);
  
  // Apply to audio
  await setMuteState(state.isMuted);
  
  // Update UI
  updateMuteButton(state.isMuted);
};

/**
 * Jump to daily neter
 */
export const handleJumpToDaily = () => {
  const daily = getDailyNeter();
  selectNeter(daily.id);
};

// ============================================================================
// JOURNAL ACTIONS
// ============================================================================

/**
 * Save journal entry
 */
export const handleSaveJournal = () => {
  const text = getJournalText();
  
  if (!text) {
    console.warn('No journal text to save');
    return;
  }

  const journalData = {
    neterId: state.currentNeter.id,
    neterName: state.currentNeter.name,
    text,
    type: 'written'
  };

  saveJournalEntry(journalData);
  clearJournalText();
  
  // Close any open panels before closing modal for smooth transition
  const journalPanel = document.getElementById('journal-panel');
  const sidePanel = document.getElementById('side-panel');
  const backdrop = document.getElementById('side-panel-backdrop');
  
  if (journalPanel && journalPanel.classList.contains('open')) {
    journalPanel.classList.remove('open');
    document.body.classList.remove('journal-panel-open');
  }
  
  if (sidePanel && sidePanel.classList.contains('open')) {
    sidePanel.classList.remove('open');
    document.body.classList.remove('side-panel-open');
  }
  
  if (backdrop && backdrop.classList.contains('visible')) {
    backdrop.classList.remove('visible');
  }
  
  // Small delay to allow panel close animation to start before modal closes
  setTimeout(() => {
    closeModal('journal');
  }, 50);
  
  // Refresh journal entries display
  const entries = loadJournals();
  renderJournalEntries(entries);
  console.log('✍️ Journal entry saved');
};

// COMMENTED OUT: Panel recording functionality - moved to modal-only workflow
/*
// Simple module-level state for journal panel voice-to-text recording
let panelRecording = {
  isRecording: false,
  recognition: null,
  timerId: null,
  startTime: 0,
  finalTranscript: '',
  hasError: false,
  lastProcessedIndex: 0
};
*/

/**
 * Handle voice-to-text recording from journal panel (side panel record button)
 * - Uses Web Speech API for transcription only (no audio file storage)
 * - Auto-saves transcribed text as journal entry when stopped
 */
export const handleRecordAudio = () => {
  const recordBtn = document.getElementById('record-journal-btn');
  if (!recordBtn) return;

  // Stop recording if already active
  if (panelRecording.isRecording) {
    if (panelRecording.timerId) clearInterval(panelRecording.timerId);
    if (panelRecording.recognition) {
      panelRecording.recognition.stop();
    }
    panelRecording.isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.classList.add('success');
    
    // Auto-save the transcribed entry
    if (panelRecording.finalTranscript.trim()) {
      const journalData = {
        neterId: state.currentNeter.id,
        neterName: state.currentNeter.name,
        text: panelRecording.finalTranscript.trim(),
        type: 'voice'
      };

      saveJournalEntry(journalData);
      const entries = loadJournals();
      renderJournalEntries(entries);
      console.log('🎤 Voice journal entry saved');
    }
    
    setTimeout(() => {
      recordBtn.classList.remove('success');
    }, 1500);
    return;
  }

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari 14.1+');
    return;
  }

  // Check internet connectivity (Web Speech API requires it)
  if (!navigator.onLine) {
    alert('Voice-to-text requires an internet connection. Please check your connection and try again.');
    return;
  }

  // Initialize speech recognition
  const recognition = new SpeechRecognition();
  panelRecording.recognition = recognition;
  panelRecording.isRecording = true;
  panelRecording.finalTranscript = '';
  panelRecording.startTime = Date.now();
  panelRecording.hasError = false;

  // Configure recognition
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  // Start timer display
  recordBtn.classList.add('recording');
  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - panelRecording.startTime) / 1000);
    // Timer display handled by CSS if needed
  };
  panelRecording.timerId = setInterval(updateTimer, 1000);

  // Handle recognition start
  recognition.onstart = () => {
    console.log('✅ Panel recognition started successfully');
  };

  // Handle transcription results
  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        panelRecording.finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    // Note: For panel recording, we don't show live preview
    // Transcription is saved when user clicks stop
  };

  // Handle errors
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    const errorMessages = {
      'no-speech': 'No speech detected. Try speaking closer to the microphone.',
      'audio-capture': 'Microphone access denied or unavailable.',
      'not-allowed': 'Please allow microphone access in browser settings.',
      'network': 'Network error. Voice-to-text requires an active internet connection.',
      'aborted': 'Recording cancelled.'
    };
    
    const message = errorMessages[event.error] || 'Recording failed. Please try again.';
    
    // Critical errors that should stop recording immediately
    const criticalErrors = ['not-allowed', 'audio-capture', 'service-not-allowed', 'network'];
    if (criticalErrors.includes(event.error)) {
      panelRecording.hasError = true;
      alert(message);
      // Force stop
      if (panelRecording.timerId) clearInterval(panelRecording.timerId);
      recordBtn.classList.remove('recording');
      panelRecording.isRecording = false;
    } else {
      // Non-critical errors (no-speech) - just log
      console.warn('Non-critical error:', message);
    }
  };

  // Handle recognition end (browser auto-stops after silence)
  recognition.onend = () => {
    console.log('Recognition ended, state:', panelRecording.isRecording, 'hasError:', panelRecording.hasError);
    // Only restart if:
    // 1. Still in recording state (user hasn't clicked stop)
    // 2. No critical error occurred
    // 3. Still online
    if (panelRecording.isRecording && !panelRecording.hasError && navigator.onLine) {
      try {
        recognition.start();
        console.log('↻ Restarting recognition after silence');
      } catch (err) {
        console.error('Could not restart:', err);
        panelRecording.hasError = true;
        if (panelRecording.timerId) clearInterval(panelRecording.timerId);
        recordBtn.classList.remove('recording');
        panelRecording.isRecording = false;
      }
    } else if (!navigator.onLine) {
      console.warn('Offline - stopping recording');
      panelRecording.hasError = true;
      if (panelRecording.timerId) clearInterval(panelRecording.timerId);
      recordBtn.classList.remove('recording');
      panelRecording.isRecording = false;
    }
  };

  // Start recognition with better error handling
  try {
    recognition.start();
    console.log('🎤 Panel voice recording started - speak now');
  } catch (err) {
    console.error('Failed to start recognition:', err);
    alert('Failed to start voice recognition. Please check microphone permissions.');
    if (panelRecording.timerId) clearInterval(panelRecording.timerId);
    recordBtn.classList.remove('recording');
    panelRecording.isRecording = false;
  }
};

// Simple module-level state for modal voice-to-text recording
let modalRecording = {
  isRecording: false,
  recognition: null,
  timerId: null,
  startTime: 0,
  finalTranscript: '',
  hasError: false,
  lastProcessedIndex: 0,
  initialTextLength: 0
};

/*
// COMMENTED OUT: Panel recording function - moved to modal-only workflow
export const handleRecordAudio = () => {
  // Function body commented out - see git history if needed
};
*/

/**
 * Handle voice-to-text recording from modal (Reflection Journal)
 * - Uses Web Speech API for transcription only (no audio file storage)
 * - Transcribed text inserts into textarea for review/editing before save
 */
const handleModalRecordAudio = () => {
  const recordBtn = document.getElementById('modal-record-journal-btn');
  if (!recordBtn) return;

  // Stop recording if already active
  if (modalRecording.isRecording) {
    if (modalRecording.timerId) clearInterval(modalRecording.timerId);
    if (modalRecording.recognition) {
      modalRecording.recognition.stop();
    }
    modalRecording.isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.classList.add('success');
    setTimeout(() => {
      recordBtn.classList.remove('success');
    }, 1500);
    console.log('🎤 Voice recording stopped');
    return;
  }

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari 14.1+');
    return;
  }

  // Check internet connectivity (Web Speech API requires it)
  if (!navigator.onLine) {
    alert('Voice-to-text requires an internet connection. Please check your connection and try again.');
    return;
  }

  // Initialize speech recognition
  const recognition = new SpeechRecognition();
  const textarea = document.getElementById('journal-text');
  modalRecording.recognition = recognition;
  modalRecording.isRecording = true;
  modalRecording.finalTranscript = '';
  modalRecording.startTime = Date.now();
  modalRecording.hasError = false;
  modalRecording.lastProcessedIndex = 0;
  modalRecording.initialTextLength = textarea ? textarea.value.length : 0;

  // Configure recognition
  recognition.continuous = true; // Keep listening until stopped
  recognition.interimResults = true; // Show live transcription
  recognition.lang = 'en-US';

  // Start timer display
  recordBtn.classList.add('recording');
  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - modalRecording.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    // Timer display handled by CSS if needed
  };
  modalRecording.timerId = setInterval(updateTimer, 1000);

  // Handle recognition start
  recognition.onstart = () => {
    console.log('✅ Modal recognition started successfully');
  };

  // Handle transcription results
  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    // Only process NEW results to avoid duplicates when recognition restarts
    for (let i = modalRecording.lastProcessedIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        modalRecording.finalTranscript += transcript + ' ';
        modalRecording.lastProcessedIndex = i + 1;
      } else {
        interimTranscript += transcript;
      }
    }

    // Update textarea with transcribed text (final + interim)
    const textarea = document.getElementById('journal-text');
    if (textarea) {
      // Replace only the transcribed portion, preserving initial text
      const initialText = textarea.value.substring(0, modalRecording.initialTextLength);
      const transcribedText = modalRecording.finalTranscript + interimTranscript;
      textarea.value = initialText + transcribedText;
      
      // Move cursor to end
      const newCursorPos = textarea.value.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  // Handle errors
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    const errorMessages = {
      'no-speech': 'No speech detected. Try speaking closer to the microphone.',
      'audio-capture': 'Microphone access denied or unavailable.',
      'not-allowed': 'Please allow microphone access in browser settings.',
      'network': 'Network error. Voice-to-text requires an active internet connection.',
      'aborted': 'Recording cancelled.'
    };
    
    const message = errorMessages[event.error] || 'Recording failed. Please try again.';
    
    // Critical errors that should stop recording immediately
    const criticalErrors = ['not-allowed', 'audio-capture', 'service-not-allowed', 'network'];
    if (criticalErrors.includes(event.error)) {
      modalRecording.hasError = true;
      alert(message);
      // Force stop
      if (modalRecording.timerId) clearInterval(modalRecording.timerId);
      recordBtn.classList.remove('recording');
      modalRecording.isRecording = false;
    } else {
      // Non-critical errors (no-speech) - just log
      console.warn('Non-critical error:', message);
    }
  };

  // Handle recognition end (browser auto-stops after silence)
  recognition.onend = () => {
    console.log('Recognition ended, state:', modalRecording.isRecording, 'hasError:', modalRecording.hasError);
    // Only restart if:
    // 1. Still in recording state (user hasn't clicked stop)
    // 2. No critical error occurred
    // 3. Still online
    if (modalRecording.isRecording && !modalRecording.hasError && navigator.onLine) {
      try {
        // Reset index for new recognition session
        modalRecording.lastProcessedIndex = 0;
        recognition.start();
        console.log('↻ Restarting recognition after silence');
      } catch (err) {
        console.error('Could not restart:', err);
        modalRecording.hasError = true;
        if (modalRecording.timerId) clearInterval(modalRecording.timerId);
        recordBtn.classList.remove('recording');
        modalRecording.isRecording = false;
      }
    } else if (!navigator.onLine) {
      console.warn('Offline - stopping recording');
      modalRecording.hasError = true;
      if (modalRecording.timerId) clearInterval(modalRecording.timerId);
      recordBtn.classList.remove('recording');
      modalRecording.isRecording = false;
    }
  };

  // Start recognition with better error handling
  try {
    recognition.start();
    console.log('🎤 Voice recording started - speak now');
  } catch (err) {
    console.error('Failed to start recognition:', err);
    alert('Failed to start voice recognition. Please check microphone permissions.');
    if (modalRecording.timerId) clearInterval(modalRecording.timerId);
    recordBtn.classList.remove('recording');
    modalRecording.isRecording = false;
  }
};

// ============================================================================
// MODAL ACTIONS
// ============================================================================

/**
 * Open journal modal
 */
export const handleOpenJournal = () => {
  // Close any open panels and return eye buttons to center
  const sidePanel = document.getElementById('side-panel');
  const journalPanel = document.getElementById('journal-panel');
  const backdrop = document.getElementById('side-panel-backdrop');
  
  if (sidePanel && sidePanel.classList.contains('open')) {
    sidePanel.classList.remove('open');
    document.body.classList.remove('side-panel-open');
  }
  
  if (journalPanel && journalPanel.classList.contains('open')) {
    journalPanel.classList.remove('open');
    document.body.classList.remove('journal-panel-open');
  }
  
  if (backdrop && backdrop.classList.contains('visible')) {
    backdrop.classList.remove('visible');
  }
  
  // Close any open entry detail modal (prevent UI clutter)
  const entryDetailModal = document.getElementById('entry-detail-modal');
  if (entryDetailModal) {
    entryDetailModal.remove();
  }
  
  openModal('journal');
};

/**
 * Open log modal
 */
export const handleOpenLog = () => {
  // Close any open panels and return eye buttons to center
  const sidePanel = document.getElementById('side-panel');
  const journalPanel = document.getElementById('journal-panel');
  const backdrop = document.getElementById('side-panel-backdrop');
  
  if (sidePanel && sidePanel.classList.contains('open')) {
    sidePanel.classList.remove('open');
    document.body.classList.remove('side-panel-open');
  }
  
  if (journalPanel && journalPanel.classList.contains('open')) {
    journalPanel.classList.remove('open');
    document.body.classList.remove('journal-panel-open');
  }
  
  if (backdrop && backdrop.classList.contains('visible')) {
    backdrop.classList.remove('visible');
  }
  
  const sessions = loadSessions();
  renderSessionLog(sessions);
  openModal('log');
};

/**
 * Close journal modal
 */
export const handleCloseJournal = () => {
  // Auto-stop recording if active
  if (modalRecording.isRecording) {
    if (modalRecording.timerId) clearInterval(modalRecording.timerId);
    if (modalRecording.recognition) {
      modalRecording.recognition.stop();
    }
    modalRecording.isRecording = false;
    
    const recordBtn = document.getElementById('modal-record-journal-btn');
    if (recordBtn) {
      recordBtn.classList.remove('recording');
    }
    console.log('🎤 Recording auto-stopped on modal close');
  }
  
  closeModal('journal');
};

/**
 * Close log modal
 */
export const handleCloseLog = () => {
  closeModal('log');
};

/**
 * Close all modals (backdrop click)
 */
export const handleCloseAllModals = () => {
  // Auto-stop recording if active
  if (modalRecording.isRecording) {
    if (modalRecording.timerId) clearInterval(modalRecording.timerId);
    if (modalRecording.recognition) {
      modalRecording.recognition.stop();
    }
    modalRecording.isRecording = false;
    
    const recordBtn = document.getElementById('modal-record-journal-btn');
    if (recordBtn) {
      recordBtn.classList.remove('recording');
    }
    console.log('🎤 Recording auto-stopped on modal close');
  }
  
  closeModal('journal');
  closeModal('log');
  closeModal('settings');
  closeSidePanel();
};

/**
 * Open journal modal with auto-start recording
 * Used by "New Entry" button in journal panel
 */
export const handleOpenJournalWithAutoRecord = () => {
  // Close any open panels and return eye buttons to center
  const sidePanel = document.getElementById('side-panel');
  const journalPanel = document.getElementById('journal-panel');
  const backdrop = document.getElementById('side-panel-backdrop');
  
  if (sidePanel && sidePanel.classList.contains('open')) {
    sidePanel.classList.remove('open');
    document.body.classList.remove('side-panel-open');
  }
  
  if (journalPanel && journalPanel.classList.contains('open')) {
    journalPanel.classList.remove('open');
    document.body.classList.remove('journal-panel-open');
  }
  
  if (backdrop && backdrop.classList.contains('visible')) {
    backdrop.classList.remove('visible');
  }
  
  // Close any open entry detail modal (prevent UI clutter)
  const entryDetailModal = document.getElementById('entry-detail-modal');
  if (entryDetailModal) {
    entryDetailModal.remove();
  }
  
  // Open modal
  openModal('journal');
  
  // Wait for modal animation to complete (300ms), then auto-start recording
  setTimeout(() => {
    const recordBtn = document.getElementById('modal-record-journal-btn');
    if (recordBtn && !modalRecording.isRecording) {
      console.log('🎤 Auto-starting voice recording...');
      recordBtn.click();
    }
  }, 300);
};

// ============================================================================
// EVENT WIRING
// ============================================================================

/**
 * Wire up all DOM event listeners
 */
export const wireUpEvents = () => {
  console.log('🔧 Wiring up events...');
  console.log('Available buttons:', {
    'play-btn': !!document.getElementById('play-btn'),
    'menu-btn': !!document.getElementById('menu-btn'),
    'journal-btn': !!document.getElementById('journal-btn'),
    'mute-btn': !!document.getElementById('mute-btn')
  });
  
  // Play/pause button
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', handlePlayPause);
    console.log('✓ Play button');
  }

  // Volume slider
  const volumeSlider = document.getElementById('volume-slider');
  if (volumeSlider) {
    // Set initial volume from storage
    const savedVolume = getVolume();
    volumeSlider.value = savedVolume;
    
    // Update volume on slider change
    volumeSlider.addEventListener('input', (e) => {
      setVolume(parseInt(e.target.value, 10));
    });
    console.log('✓ Volume slider');
  }

  // Mute button
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', handleMute);
    console.log('✓ Mute button');
  }

  // Journal modal button (below Ankh)
  const openJournalModalBtn = document.getElementById('open-journal-modal-btn');
  if (openJournalModalBtn) {
    openJournalModalBtn.addEventListener('click', handleOpenJournal);
    console.log('✓ Journal modal button');
  }

  // Log button (below Ankh)
  const logBtn = document.getElementById('log-btn');
  if (logBtn) {
    logBtn.addEventListener('click', handleOpenLog);
    console.log('✓ Log button');
  }

  const closeJournalBtn = document.getElementById('close-journal');
  if (closeJournalBtn) {
    closeJournalBtn.addEventListener('click', handleCloseJournal);
  }

  const closeLogBtn = document.getElementById('close-log');
  if (closeLogBtn) {
    closeLogBtn.addEventListener('click', handleCloseLog);
  }

  // Settings button handlers
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings');
  const modalBackdropSettings = document.getElementById('backdrop');

  // Settings form elements
  const autoplayCheckbox = document.getElementById('settings-autoplay');
  const reduceEffectsCheckbox = document.getElementById('settings-reduce-effects');
  const reduceMotionCheckbox = document.getElementById('settings-reduce-motion');

  /**
   * Load saved settings into modal form elements
   */
  const loadSettingsIntoModal = () => {
    const settings = loadSettings();
    
    if (autoplayCheckbox) autoplayCheckbox.checked = settings.autoplay;
    if (reduceEffectsCheckbox) reduceEffectsCheckbox.checked = settings.reduceEffects;
    if (reduceMotionCheckbox) reduceMotionCheckbox.checked = settings.reduceMotion;
    
    console.log('⚙️ Settings loaded into modal:', settings);
  };

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      // Load saved settings into form when modal opens
      loadSettingsIntoModal();
      settingsModal.classList.add('visible');
      if (modalBackdropSettings) modalBackdropSettings.classList.add('visible');
      console.log('⚙️ Settings modal opened');
    });
    console.log('✓ Settings button');
  }

  // Exclusive accordion behavior - only one section open at a time
  const settingsSections = settingsModal?.querySelectorAll('.settings-section');
  if (settingsSections) {
    settingsSections.forEach(section => {
      section.addEventListener('toggle', (e) => {
        if (e.target.open) {
          // Close all other sections
          settingsSections.forEach(other => {
            if (other !== e.target && other.open) {
              other.open = false;
            }
          });
        }
      });
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('visible');
      if (modalBackdropSettings) modalBackdropSettings.classList.remove('visible');
      console.log('⚙️ Settings modal closed');
    });
  }

  // Autoplay toggle - save on change
  if (autoplayCheckbox) {
    autoplayCheckbox.addEventListener('change', (e) => {
      updateSetting('autoplay', e.target.checked);
    });
  }

  // Reduce visual effects toggle - save and apply immediately
  if (reduceEffectsCheckbox) {
    reduceEffectsCheckbox.addEventListener('change', (e) => {
      updateSetting('reduceEffects', e.target.checked);
      applyReduceEffects(e.target.checked);
      setThreeReducedEffects(e.target.checked);
    });
  }

  // Reduce motion toggle - save and apply immediately
  if (reduceMotionCheckbox) {
    reduceMotionCheckbox.addEventListener('change', (e) => {
      updateSetting('reduceMotion', e.target.checked);
      applyReduceMotion(e.target.checked);
    });
  }

  // Export journal button - opens printable HTML for PDF export
  const exportBtn = document.getElementById('settings-export-journal');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const entries = JSON.parse(localStorage.getItem('kemetic_journals') || '[]');
      
      if (entries.length === 0) {
        alert('No journal entries to export.');
        return;
      }
      
      // Format entries for display
      const formatDate = (dateStr) => {
        try {
          return new Date(dateStr).toLocaleString();
        } catch {
          return dateStr;
        }
      };
      
      const entriesHtml = entries.map(entry => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-type">${entry.type === 'audio' ? '🎤 Voice' : '✍️ Written'}</span>
            <span class="entry-neter">${entry.neterName || 'General'}</span>
            <span class="entry-date">${formatDate(entry.date)}</span>
          </div>
          <div class="entry-text">${entry.text}</div>
        </div>
      `).reverse().join('');
      
      // Create styled HTML document
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Neteru Journal Export - ${new Date().toLocaleDateString()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #1a1a2e;
      line-height: 1.6;
    }
    h1 {
      text-align: center;
      color: #b8860b;
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }
    .entry {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
      color: #666;
      border-bottom: 1px solid #eee;
      padding-bottom: 0.5rem;
    }
    .entry-neter {
      color: #b8860b;
      font-weight: bold;
    }
    .entry-text {
      white-space: pre-wrap;
      font-size: 1rem;
    }
    .no-print { margin-top: 2rem; text-align: center; }
    .no-print button {
      background: #b8860b;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      font-size: 1rem;
      border-radius: 8px;
      cursor: pointer;
      margin: 0 0.5rem;
    }
    .no-print button:hover { background: #9a7209; }
    @media print {
      .no-print { display: none; }
      body { padding: 1rem; }
    }
    @page {
      size: auto;
      margin: 10mm;
    }
  </style>
</head>
<body>
  <h1>Neteru Journal</h1>
  <p class="subtitle">Exported on ${new Date().toLocaleString()} • ${entries.length} entries</p>
  ${entriesHtml}
  <div class="no-print">
    <p style="font-size: 0.85rem; color: #888; margin-bottom: 1rem;">
      💡 Tip: In the print dialog, uncheck "Headers and footers" to remove URL/date from PDF
    </p>
    <button onclick="window.print()">📄 Save as PDF</button>
    <button onclick="window.close()">✕ Close</button>
  </div>
</body>
</html>`;
      
      // Create Blob URL for cleaner print (not about:blank)
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        console.log('📥 Journal export opened for PDF export');
        // Clean up blob URL after window closes
        printWindow.onafterprint = () => URL.revokeObjectURL(blobUrl);
      } else {
        URL.revokeObjectURL(blobUrl);
        alert('Please allow popups to export your journal.');
      }
    });
  }

  // Clear journal entries button - two-click confirmation
  const clearJournalBtn = document.getElementById('settings-clear-journal');
  let clearJournalConfirmPending = false;
  
  if (clearJournalBtn) {
    clearJournalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!clearJournalConfirmPending) {
        clearJournalConfirmPending = true;
        clearJournalBtn.innerHTML = '⚠️ Click to confirm';
        clearJournalBtn.style.background = 'rgba(255, 50, 50, 0.3)';
        clearJournalBtn.style.borderColor = 'rgba(255, 50, 50, 0.6)';
        
        setTimeout(() => {
          if (clearJournalConfirmPending) {
            clearJournalConfirmPending = false;
            clearJournalBtn.innerHTML = '🗑️ Clear Journal Entries';
            clearJournalBtn.style.background = '';
            clearJournalBtn.style.borderColor = '';
          }
        }, 3000);
      } else {
        console.log('🗑️ Clearing journal entries');
        localStorage.removeItem('kemetic_journals');
        clearJournalConfirmPending = false;
        clearJournalBtn.innerHTML = '✓ Journal cleared';
        clearJournalBtn.style.background = 'rgba(0, 200, 100, 0.2)';
        clearJournalBtn.style.borderColor = 'rgba(0, 200, 100, 0.4)';
        renderJournalEntries([]);
        setTimeout(() => {
          clearJournalBtn.innerHTML = '🗑️ Clear Journal Entries';
          clearJournalBtn.style.background = '';
          clearJournalBtn.style.borderColor = '';
        }, 1500);
      }
    });
  }

  // Clear practice log button - two-click confirmation
  const clearPracticeBtn = document.getElementById('settings-clear-practice');
  let clearPracticeConfirmPending = false;
  
  if (clearPracticeBtn) {
    clearPracticeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!clearPracticeConfirmPending) {
        clearPracticeConfirmPending = true;
        clearPracticeBtn.innerHTML = '⚠️ Click to confirm';
        clearPracticeBtn.style.background = 'rgba(255, 50, 50, 0.3)';
        clearPracticeBtn.style.borderColor = 'rgba(255, 50, 50, 0.6)';
        
        setTimeout(() => {
          if (clearPracticeConfirmPending) {
            clearPracticeConfirmPending = false;
            clearPracticeBtn.innerHTML = '🗑️ Clear Practice Log';
            clearPracticeBtn.style.background = '';
            clearPracticeBtn.style.borderColor = '';
          }
        }, 3000);
      } else {
        console.log('🗑️ Clearing practice log');
        localStorage.removeItem('kemetic_practices');
        clearPracticeConfirmPending = false;
        clearPracticeBtn.innerHTML = '✓ Practice log cleared';
        clearPracticeBtn.style.background = 'rgba(0, 200, 100, 0.2)';
        clearPracticeBtn.style.borderColor = 'rgba(0, 200, 100, 0.4)';
        renderSessionLog([]);
        setTimeout(() => {
          clearPracticeBtn.innerHTML = '🗑️ Clear Practice Log';
          clearPracticeBtn.style.background = '';
          clearPracticeBtn.style.borderColor = '';
        }, 1500);
      }
    });
  }

  // Clear all data button - uses two-click confirmation (same pattern as journal delete)
  const clearDataBtn = document.getElementById('settings-clear-data');
  let clearDataConfirmPending = false;
  
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!clearDataConfirmPending) {
        // First click - show confirmation state
        clearDataConfirmPending = true;
        clearDataBtn.innerHTML = '⚠️ Click again to confirm deletion';
        clearDataBtn.style.background = 'rgba(255, 50, 50, 0.3)';
        clearDataBtn.style.borderColor = 'rgba(255, 50, 50, 0.6)';
        
        // Reset after 3 seconds if not confirmed
        setTimeout(() => {
          if (clearDataConfirmPending) {
            clearDataConfirmPending = false;
            clearDataBtn.innerHTML = '🗑️ Clear All Data';
            clearDataBtn.style.background = '';
            clearDataBtn.style.borderColor = '';
          }
        }, 3000);
      } else {
        // Second click - actually clear data
        console.log('🗑️ Confirmed - clearing all data');
        localStorage.removeItem('kemetic_journals');
        localStorage.removeItem('kemetic_practices');
        localStorage.removeItem('kemetic_last_neter');
        localStorage.removeItem('neteru-settings-v1');
        localStorage.removeItem('tol_hasVisited');
        localStorage.removeItem('tol_theme');
        localStorage.removeItem('tol_volume');
        window.location.reload();
      }
    });
  }

  // Save journal button
  const saveJournalBtn = document.getElementById('save-journal');
  if (saveJournalBtn) {
    saveJournalBtn.addEventListener('click', handleSaveJournal);
  }

  // Backdrop click
  const modalBackdrop = document.getElementById('backdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', handleCloseAllModals);
  }

  // Eye of Ra (right side) - Controls Journal Panel (right side)
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      console.log('👁️ Eye of Ra clicked');
      const journalPanel = document.getElementById('journal-panel');
      const backdrop = document.getElementById('side-panel-backdrop');
      
      if (journalPanel && backdrop) {
        const isOpen = journalPanel.classList.contains('open');
        
        if (isOpen) {
          // Close journal panel
          journalPanel.classList.remove('open');
          backdrop.classList.remove('visible');
          document.body.classList.remove('journal-panel-open');
          console.log('Closed journal panel');
        } else {
          // Close side panel if open
          const sidePanel = document.getElementById('side-panel');
          if (sidePanel && sidePanel.classList.contains('open')) {
            sidePanel.classList.remove('open');
            document.body.classList.remove('side-panel-open');
          }
          
          // Open journal panel
          journalPanel.classList.add('open');
          backdrop.classList.add('visible');
          document.body.classList.add('journal-panel-open');
          console.log('Opened journal panel');
        }
      }
    });
    console.log('✓ Eye of Ra button');
  } else {
    console.error('❌ Eye of Ra button not found!');
  }

  const panelCloseBtn = document.getElementById('side-panel-close');
  if (panelCloseBtn) {
    panelCloseBtn.addEventListener('click', () => {
      closeSidePanel();
      document.body.classList.remove('side-panel-open');
    });
  }

  const panelBackdrop = document.getElementById('side-panel-backdrop');
  if (panelBackdrop) {
    panelBackdrop.addEventListener('click', () => {
      closeSidePanel();
      document.body.classList.remove('side-panel-open');
      document.body.classList.remove('journal-panel-open');
    });
  }

  const panelPlayBtn = document.getElementById('panel-play-btn');
  if (panelPlayBtn) {
    panelPlayBtn.addEventListener('click', handlePlayPause);
  }

  const panelJournalBtn = document.getElementById('panel-journal-btn');
  if (panelJournalBtn) {
    panelJournalBtn.addEventListener('click', () => {
      const sidePanel = document.getElementById('side-panel');
      const backdrop = document.getElementById('side-panel-backdrop');
      
      if (sidePanel) {
        sidePanel.classList.remove('open');
      }
      if (backdrop) {
        backdrop.classList.remove('visible');
      }
      // Remove body class so eye button returns to center
      document.body.classList.remove('side-panel-open');
      
      handleOpenJournal();
    });
  }

  // Eye of Tehuti (left side) - Controls Side Panel (left side with neters)
  const journalBtn = document.getElementById('journal-btn');
  if (journalBtn) {
    journalBtn.addEventListener('click', () => {
      console.log('👁️ Eye of Tehuti clicked');
      const sidePanel = document.getElementById('side-panel');
      const backdrop = document.getElementById('side-panel-backdrop');
      
      if (sidePanel && backdrop) {
        const isOpen = sidePanel.classList.contains('open');
        
        if (isOpen) {
          // Close side panel
          sidePanel.classList.remove('open');
          backdrop.classList.remove('visible');
          document.body.classList.remove('side-panel-open');
          console.log('Closed side panel');
        } else {
          // Close journal panel if open
          const journalPanel = document.getElementById('journal-panel');
          if (journalPanel && journalPanel.classList.contains('open')) {
            journalPanel.classList.remove('open');
            document.body.classList.remove('journal-panel-open');
          }
          
          // Open side panel
          sidePanel.classList.add('open');
          backdrop.classList.add('visible');
          document.body.classList.add('side-panel-open');
          console.log('Opened side panel');
        }
      }
    });
    console.log('✓ Eye of Tehuti button');
  } else {
    console.error('❌ Eye of Tehuti button not found!');
  }

  // Close journal panel when backdrop clicked
  const panelBackdrop2 = document.getElementById('side-panel-backdrop');
  if (panelBackdrop2) {
    panelBackdrop2.addEventListener('click', () => {
      closeSidePanel();
      document.body.classList.remove('side-panel-open');
      document.body.classList.remove('journal-panel-open');
      const journalPanel = document.getElementById('journal-panel');
      if (journalPanel && journalPanel.classList.contains('open')) {
        journalPanel.classList.remove('open');
        panelBackdrop2.classList.remove('visible');
      }
    });
  }

  const panelLogBtn = document.getElementById('panel-log-btn');
  if (panelLogBtn) {
    panelLogBtn.addEventListener('click', () => {
      const sidePanel = document.getElementById('side-panel');
      const backdrop = document.getElementById('side-panel-backdrop');
      
      if (sidePanel) {
        sidePanel.classList.remove('open');
      }
      if (backdrop) {
        backdrop.classList.remove('visible');
      }
      // Remove body class so eye button returns to center
      document.body.classList.remove('side-panel-open');
      
      handleOpenLog();
    });
  }

  // Add journal entry button in journal panel - opens modal with auto-record
  const addJournalBtn = document.getElementById('add-journal-entry-btn');
  if (addJournalBtn) {
    addJournalBtn.addEventListener('click', handleOpenJournalWithAutoRecord);
    console.log('✓ Add journal entry button (auto-record)');
  }

  // COMMENTED OUT: Panel record button - moved to modal-only workflow
  /*
  const recordBtn = document.getElementById('record-journal-btn');
  if (recordBtn) {
    recordBtn.addEventListener('click', handleRecordAudio);
    console.log('✓ Record audio button');
  }
  */

  // Record audio button in modal
  const modalRecordBtn = document.getElementById('modal-record-journal-btn');
  if (modalRecordBtn) {
    modalRecordBtn.addEventListener('click', handleModalRecordAudio);
    console.log('✓ Modal record audio button');
  }

  // Journal panel close button
  const journalPanelClose = document.getElementById('journal-panel-close');
  if (journalPanelClose) {
    journalPanelClose.addEventListener('click', () => {
      const journalPanel = document.getElementById('journal-panel');
      const sidePanelBackdrop = document.getElementById('side-panel-backdrop');
      if (journalPanel) journalPanel.classList.remove('open');
      if (sidePanelBackdrop) sidePanelBackdrop.classList.remove('visible');
    });
    console.log('✓ Journal panel close button');
  }

  // Navigation arrows
  const nextBtn = document.getElementById('next-neter-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleNextNeter);
    console.log('✓ Next neter button');
  }

  const prevBtn = document.getElementById('prev-neter-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', handlePrevNeter);
    console.log('✓ Previous neter button');
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (isSidePanelOpen()) {
        closeSidePanel();
      }
      closeModal('journal');
      closeModal('log');
      closeModal('settings');
      // Also close entry detail modal if open
      const entryModal = document.getElementById('entry-detail-modal');
      if (entryModal) entryModal.remove();
    }
  });

  // Listen for journal entry deletion events from entry modal
  window.addEventListener('deleteJournalEntry', (e) => {
    const { entryId } = e.detail;
    const updated = deleteJournalEntry(entryId);
    renderJournalEntries(updated);
    console.log('🗑️ Journal entry deleted and list refreshed');
  });
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the entire application
 */
export const init = () => {
  console.log('🌟 Initializing Neteru...');

  // Apply saved settings immediately (reduce motion, reduce effects)
  applyAllSettings();

  // Initialize audio context without blocking
  ensureAudioContext().catch(() => {
    console.info('⚠️ Audio will be available after user interaction');
  });
  
  console.log('🔄 Continuing initialization...');

  try {
    // Determine starting neter:
    // - Returning user: load their last visited neter
    // - New user: start at sphere 0 (Amun-Nun)
    const lastNeterId = loadLastNeter();
    let startingNeter;
    
    if (lastNeterId !== null) {
      // Returning user - resume where they left off
      startingNeter = getNeterById(lastNeterId);
      console.log('👋 Welcome back! Resuming at:', startingNeter.name);
    } else {
      // New user - start at sphere 0
      startingNeter = getNeterById(0);
      console.log('✨ New user! Starting at sphere 0:', startingNeter.name);
      // Save initial selection
      saveLastNeter(0);
    }
    
    state.currentNeter = startingNeter;
    
    // Also get daily neter for banner display
    const daily = getDailyNeter();
    console.log('📅 Daily neter:', daily.name);

    // Render initial UI
    console.log('Rendering daily banner...');
    renderDailyBanner(daily);
    console.log('Rendering neter info...');
    renderNeterInfo(state.currentNeter);
    console.log('Rendering neter grid...');
    renderNeterGrid(state.currentNeter.id, selectNeter);
    console.log('Rendering side panel...');
    renderSidePanel(state.currentNeter);
    console.log('Rendering side panel list...');
    renderSidePanelList(state.currentNeter.id, selectNeter);
    console.log('Updating buttons...');
    updatePlayButton(false);
    updateMuteButton(false);
    console.log('🎨 UI rendered');

    // Initialize THREE.js scene
    const container = document.getElementById('three-mount');
    if (container) {
      console.log('📦 THREE.js available?', typeof THREE !== 'undefined');
      sceneController = initThreeScene(container, state.currentNeter);
      if (!sceneController) {
        console.info('Running without THREE.js visualization');
      } else {
        console.log('✅ THREE.js scene initialized');
        // Apply saved reduce effects setting to Three.js
        const savedSettings = loadSettings();
        if (savedSettings.reduceEffects) {
          setThreeReducedEffects(true);
        }
      }
    } else {
      console.error('❌ THREE.js container not found - #three-mount missing!');
    }

    // Wire up event listeners
    wireUpEvents();
    console.log('🔌 Events wired');

    // Load and render journal entries
    const journalEntries = loadJournals();
    renderJournalEntries(journalEntries);
    console.log('📔 Journal entries loaded:', journalEntries.length);

    console.log('✨ Application ready');
  } catch (err) {
    console.error('💥 Initialization error:', err);
    console.error('Stack:', err.stack);
    throw err;
  }
};
