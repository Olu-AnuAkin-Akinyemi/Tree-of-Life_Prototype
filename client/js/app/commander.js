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
  createInitialState,
  updateNeterInState,
  togglePlaying as pureTogglePlaying,
  toggleMute as pureToggleMute
} from '../core/pure.js';

import {
  ensureAudioContext,
  playFrequency,
  stopSound,
  transitionFrequency,
  setMuteState,
  logSession,
  saveJournalEntry,
  loadSessions,
  loadJournals
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
  setThreeAudioState
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
  
  // Update UI
  renderNeterInfo(state.currentNeter);
  renderNeterGrid(state.currentNeter.id, selectNeter);
  renderSidePanel(state.currentNeter);
  renderSidePanelList(state.currentNeter.id, selectNeter);
  
  // Update THREE.js scene if available
  if (sceneController && sceneController.updateNeterVisuals) {
    sceneController.updateNeterVisuals(state.currentNeter);
  }
  
  // Gracefully transition audio if playing
  if (wasPlaying) {
    try {
      console.log('🎵 Starting frequency transition to:', state.currentNeter.frequency);
      await transitionFrequency(state.currentNeter.frequency);
      console.log('✅ Successfully transitioned to new frequency:', state.currentNeter.frequency);
    } catch (err) {
      console.error('❌ Failed to transition frequency:', err);
      console.error('Error details:', err.message, err.stack);
    } finally {
      console.log('🎼 Audio transition attempt completed for:', state.currentNeter.name);
    }
  }
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

// Simple module-level state for journal panel recording
let panelRecording = {
  isRecording: false,
  mediaRecorder: null,
  recognition: null,
  timerId: null,
  startTime: 0,
  audioChunks: [],
  finalTranscript: ''
};

/**
 * Record/stop audio journal entry (toggle) using MediaRecorder + Web Speech API
 */
export const handleRecordAudio = () => {
  const recordBtn = document.getElementById('record-journal-btn');
  if (!recordBtn) return;

  // If already recording, this click means "stop"
  if (panelRecording.isRecording) {
    if (panelRecording.timerId) clearInterval(panelRecording.timerId);
    if (panelRecording.mediaRecorder && panelRecording.mediaRecorder.state !== 'inactive') {
      panelRecording.mediaRecorder.stop();
    }
    if (panelRecording.recognition) {
      panelRecording.recognition.stop();
    }
    panelRecording.isRecording = false;
    recordBtn.classList.remove('recording');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Audio transcription not supported in this browser. Please use Chrome, Edge, or Safari.');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Audio recording is not supported in this browser.');
    return;
  }

  // Initialize state
  panelRecording.isRecording = true;
  panelRecording.audioChunks = [];
  panelRecording.finalTranscript = '';
  panelRecording.startTime = Date.now();

  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - panelRecording.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    // Timer display handled by CSS ::before
  };

  recordBtn.classList.add('recording');
  panelRecording.timerId = setInterval(updateTimer, 1000);

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      panelRecording.mediaRecorder = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          panelRecording.audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(panelRecording.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        recordBtn.classList.remove('recording');
        recordBtn.classList.add('success');
        setTimeout(() => {
          recordBtn.classList.remove('success');
        }, 2000);

        if (panelRecording.finalTranscript.trim()) {
          const journalData = {
            neterId: state.currentNeter.id,
            neterName: state.currentNeter.name,
            text: panelRecording.finalTranscript.trim(),
            type: 'audio',
            audioUrl
          };

          saveJournalEntry(journalData);
          const entries = loadJournals();
          renderJournalEntries(entries);
          console.log('🎤 Audio journal entry saved with playback');
        }

        // Stop all tracks to release mic
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();

      const recognition = new SpeechRecognition();
      panelRecording.recognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

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
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        // mediaRecorder.onstop handles save/UI reset
      };

      recognition.start();
    })
    .catch((err) => {
      console.error('Error accessing microphone:', err);
      if (panelRecording.timerId) clearInterval(panelRecording.timerId);
      recordBtn.classList.remove('recording');
      panelRecording.isRecording = false;
    });
};

// Simple module-level state for modal recording
let modalRecording = {
  isRecording: false,
  mediaRecorder: null,
  recognition: null,
  timerId: null,
  startTime: 0,
  audioChunks: [],
  finalTranscript: ''
};

/**
 * Handle record/stop audio from modal (Reflection Journal card)
 * - Uses MediaRecorder for robust audio capture
 * - Uses SpeechRecognition for live transcription into the textarea
 */
const handleModalRecordAudio = () => {
  const recordBtn = document.getElementById('modal-record-journal-btn');
  if (!recordBtn) return;

  // Stop path: if already recording, stop both engines
  if (modalRecording.isRecording) {
    if (modalRecording.timerId) clearInterval(modalRecording.timerId);
    if (modalRecording.mediaRecorder && modalRecording.mediaRecorder.state !== 'inactive') {
      modalRecording.mediaRecorder.stop();
    }
    if (modalRecording.recognition) {
      modalRecording.recognition.stop();
    }
    modalRecording.isRecording = false;
    recordBtn.classList.remove('recording');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition not supported in this browser');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Audio recording is not supported in this browser');
    return;
  }

  // Init state
  modalRecording.isRecording = true;
  modalRecording.audioChunks = [];
  modalRecording.finalTranscript = '';
  modalRecording.startTime = Date.now();

  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - modalRecording.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    // Timer display handled by CSS ::before
  };

  recordBtn.classList.add('recording');
  modalRecording.timerId = setInterval(updateTimer, 1000);

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      modalRecording.mediaRecorder = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          modalRecording.audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(modalRecording.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // For now, we only update the textarea text; audioUrl could be stored later if desired
        recordBtn.classList.remove('recording');
        recordBtn.classList.add('success');
        setTimeout(() => {
          recordBtn.classList.remove('success');
        }, 2000);

        // Stop all tracks to release mic
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();

      const recognition = new SpeechRecognition();
      modalRecording.recognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            modalRecording.finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const textarea = document.getElementById('journal-text');
        if (textarea) {
          textarea.value = modalRecording.finalTranscript + interimTranscript;
        }
      };

      recognition.onerror = (event) => {
        // Brave/Chrome may emit 'network' errors; log but don't auto-stop UI
        console.error('Modal speech recognition error:', event.error);
      };

      recognition.onend = () => {
        // We intentionally don't change UI here; mediaRecorder.onstop drives UI
      };

      recognition.start();
    })
    .catch((err) => {
      console.error('Error accessing microphone (modal):', err);
      if (modalRecording.timerId) clearInterval(modalRecording.timerId);
      recordBtn.classList.remove('recording');
      modalRecording.isRecording = false;
    });
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
  closeModal('journal');
  closeModal('log');
  closeSidePanel();
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

  // Add journal entry button in journal panel
  const addJournalBtn = document.getElementById('add-journal-entry-btn');
  if (addJournalBtn) {
    addJournalBtn.addEventListener('click', () => {
      const journalPanel = document.getElementById('journal-panel');
      if (journalPanel) {
        journalPanel.classList.remove('open');
      }
      const backdrop = document.getElementById('side-panel-backdrop');
      if (backdrop) {
        backdrop.classList.remove('visible');
      }
      // Remove panel-open class so eye button returns to center
      document.body.classList.remove('journal-panel-open');
      
      handleOpenJournal();
    });
    console.log('✓ Add journal entry button');
  }

  // Record audio journal button
  const recordBtn = document.getElementById('record-journal-btn');
  if (recordBtn) {
    recordBtn.addEventListener('click', handleRecordAudio);
    console.log('✓ Record audio button');
  }

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
    }
  });
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the entire application
 */
export const init = () => {
  console.log('🌟 Initializing Pautti Neteru...');

  // Initialize audio context without blocking
  ensureAudioContext().catch(() => {
    console.info('⚠️ Audio will be available after user interaction');
  });
  
  console.log('🔄 Continuing initialization...');

  try {
    // Get daily neter
    const daily = getDailyNeter();
    state.currentNeter = daily;
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
