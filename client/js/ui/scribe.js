/**
 * UI/SCRIBE.JS
 * Pure UI rendering and DOM manipulation.
 * No business logic, no side effects beyond DOM updates.
 * Handles: THREE.js scene, DOM rendering, visual updates
 */

import { PAUTTI_NETERU, colorToHex, formatDuration, formatDate, createBadgeText } from '../core/pure.js';

// ============================================================================
// THREE.JS SCENE - Ankh Visualization
// ============================================================================

let scene, camera, renderer, ankh, particles, light, animationId;
let isAudioPlaying = false;

// Interaction state
let isDragging = false;
let isHovering = false;
let dragOffset = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
let ankhVelocity = { x: 0, y: 0 };
let raycaster, mouse;

/**
 * Set audio playing state for reactive animation
 * @param {boolean} playing - Whether audio is playing
 */
export const setThreeAudioState = (playing) => {
  isAudioPlaying = playing;
};

/**
 * Initialize THREE.js scene with Ankh
 * @param {HTMLElement} container - Mount point for renderer
 * @param {Object} neter - Initial neter to display
 * @returns {Object|null} Scene control functions or null if THREE.js unavailable
 */
export const initThreeScene = (container, neter) => {
  console.log('🎬 Initializing THREE.js scene...');
  console.log('Container:', container, 'Dimensions:', container.clientWidth, 'x', container.clientHeight);
  console.log('THREE available:', typeof THREE !== 'undefined');
  
  // Graceful fallback if THREE.js not available
  if (typeof THREE === 'undefined') {
    console.warn('THREE.js not available, skipping 3D visualization');
    container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255, 215, 0, 0.5); font-size: 3rem;">𓂀</div>';
    return null;
  }

  try {
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;
    console.log('Using dimensions:', width, 'x', height);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Initialize raycaster for interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create Ankh symbol
    ankh = createAnkh(neter.color);
    scene.add(ankh);
    
    // Setup interaction events
    setupAnkhInteraction(container, width, height);

    // Create particle field
    particles = createParticles(neter.color);
    scene.add(particles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    light = new THREE.PointLight(neter.color, 1.8, 100);
    light.position.set(0, 0, 5);
    scene.add(light);

    // Start animation loop
    animate();

    // Handle window resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return {
      updateNeterVisuals,
      dispose: () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        if (renderer) renderer.dispose();
      }
    };
  } catch (err) {
    console.error('Failed to initialize THREE.js scene:', err);
    container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255, 215, 0, 0.5); font-size: 3rem;">𓂀</div>';
    return null;
  }
};

/**
 * Create Ankh geometry
 * @param {number} color - Hex color value
 * @returns {THREE.Group} Ankh group
 */
const createAnkh = (color) => {
  const group = new THREE.Group();
  
  const material = new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });

  // Circle (top loop)
  const circleGeo = new THREE.TorusGeometry(0.5, 0.1, 16, 32);
  const circle = new THREE.Mesh(circleGeo, material);
  circle.position.y = 1.2;
  group.add(circle);

  // Vertical bar
  const vBarGeo = new THREE.BoxGeometry(0.2, 2, 0.2);
  const vBar = new THREE.Mesh(vBarGeo, material);
  vBar.position.y = -0.25;
  group.add(vBar);

  // Horizontal bar (arms extending from vertical bar, outside the loop)
  const hBarGeo = new THREE.BoxGeometry(1.5, 0.2, 0.2);
  const hBar = new THREE.Mesh(hBarGeo, material);
  hBar.position.y = 0.55;
  group.add(hBar);

  return group;
};

/**
 * Create particle field
 * @param {number} color - Hex color value
 * @returns {THREE.Points} Particle system
 */
const createParticles = (color) => {
  const particleCount = 400;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const threeColor = new THREE.Color(color);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    
    colors[i * 3] = threeColor.r;
    colors[i * 3 + 1] = threeColor.g;
    colors[i * 3 + 2] = threeColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(geometry, material);
};

/**
 * Setup interactive grab/drag functionality for Ankh
 */
const setupAnkhInteraction = (container, width, height) => {
  const canvas = renderer.domElement;
  
  // Update mouse position and check for Ankh intersection
  const updateMousePosition = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(ankh.children, true);
    return intersects.length > 0;
  };
  
  // Mouse move - check hover state
  const onMouseMove = (e) => {
    const intersecting = updateMousePosition(e.clientX, e.clientY);
    
    if (!isDragging) {
      isHovering = intersecting;
      canvas.style.cursor = isHovering ? 'grab' : 'default';
    } else {
      // Apply drag movement
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      
      ankhVelocity.x = movementX * 0.02;
      ankhVelocity.y = -movementY * 0.02;
      
      targetRotation.y += movementX * 0.01;
      targetRotation.x += movementY * 0.01;
    }
  };
  
  // Mouse down - start dragging
  const onMouseDown = (e) => {
    const intersecting = updateMousePosition(e.clientX, e.clientY);
    
    if (intersecting) {
      isDragging = true;
      canvas.style.cursor = 'grabbing';
      dragOffset = { x: mouse.x, y: mouse.y };
      e.preventDefault();
    }
  };
  
  // Mouse up - stop dragging
  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = isHovering ? 'grab' : 'default';
    }
  };
  
  // Touch events for mobile
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const intersecting = updateMousePosition(touch.clientX, touch.clientY);
      
      if (intersecting) {
        isDragging = true;
        dragOffset = { x: touch.clientX, y: touch.clientY };
        e.preventDefault();
      }
    }
  };
  
  const onTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const movementX = touch.clientX - dragOffset.x;
      const movementY = touch.clientY - dragOffset.y;
      
      ankhVelocity.x = movementX * 0.01;
      ankhVelocity.y = -movementY * 0.01;
      
      targetRotation.y += movementX * 0.005;
      targetRotation.x += movementY * 0.005;
      
      dragOffset = { x: touch.clientX, y: touch.clientY };
      e.preventDefault();
    }
  };
  
  const onTouchEnd = () => {
    isDragging = false;
  };
  
  // Add event listeners
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);
  
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchcancel', onTouchEnd);
};

/**
 * Animation loop - reactive to audio state
 */
const animate = () => {
  animationId = requestAnimationFrame(animate);
  
  const time = Date.now() * 0.001;
  const audioIntensity = isAudioPlaying ? 1.5 : 0.5;
  
  if (ankh) {
    if (isDragging) {
      // Apply drag physics with wobble
      ankh.rotation.y += ankhVelocity.x;
      ankh.rotation.x += ankhVelocity.y;
      
      // Wobble effect while dragging
      const wobbleAmount = 0.05;
      ankh.rotation.z = Math.sin(time * 8) * wobbleAmount * Math.abs(ankhVelocity.x + ankhVelocity.y);
      
      // Damping
      ankhVelocity.x *= 0.05;
      ankhVelocity.y *= 0.05;
      
      // Slight scale bounce when grabbed
      const grabScale = 1.08 + Math.sin(time * 5) * 0.02;
      ankh.scale.set(grabScale, grabScale, grabScale);
    } else {
      // Normal animation when not dragging
      const rotationSpeed = isAudioPlaying ? 0.008 : 0.004;
      ankh.rotation.y += rotationSpeed;
      
      // More dramatic oscillation when audio playing
      const oscAmount = isAudioPlaying ? 0.15 : 0.1;
      ankh.rotation.x = Math.sin(time) * oscAmount;
      
      // Reset z rotation smoothly
      ankh.rotation.z *= 0.9;
      
      // Pulse scale when audio playing
      if (isAudioPlaying) {
        const scale = 1 + Math.sin(time * 2) * 0.05;
        ankh.scale.set(scale, scale, scale);
      } else {
        ankh.scale.set(1, 1, 1);
      }
    }
  }

  if (particles) {
    // Faster rotation when audio playing
    const particleRotSpeed = isAudioPlaying ? 0.002 : 0.0008;
    particles.rotation.y += particleRotSpeed;
    
    const positions = particles.geometry.attributes.position.array;
    const moveSpeed = isAudioPlaying ? 0.015 : 0.008;
    
    for (let i = 0; i < positions.length / 3; i++) {
      const yIndex = i * 3 + 1;
      positions[yIndex] += Math.sin(time + i) * moveSpeed;
      
      // Add radial movement when audio playing
      if (isAudioPlaying) {
        const xIndex = i * 3;
        const zIndex = i * 3 + 2;
        const angle = time + i;
        positions[xIndex] += Math.cos(angle) * 0.005;
        positions[zIndex] += Math.sin(angle) * 0.005;
      }
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  if (light) {
    // More intense pulsing when audio playing
    const baseLum = isAudioPlaying ? 2.2 : 1.8;
    const pulseAmount = isAudioPlaying ? 0.6 : 0.3;
    light.intensity = baseLum + Math.sin(time * 3) * pulseAmount;
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

/**
 * Update visuals for new neter
 * @param {Object} neter - Neter object with color
 */
export const updateNeterVisuals = (neter) => {
  const color = new THREE.Color(neter.color);
  
  // Update ankh material
  if (ankh) {
    ankh.children.forEach(child => {
      if (child.material) {
        child.material.color.set(color);
        child.material.emissive.set(color);
      }
    });
  }

  // Update particle colors
  if (particles) {
    const colors = particles.geometry.attributes.color.array;
    for (let i = 0; i < colors.length / 3; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    particles.geometry.attributes.color.needsUpdate = true;
  }

  // Update light
  if (light) {
    light.color.set(color);
  }
};

// ============================================================================
// DOM RENDERING FUNCTIONS
// ============================================================================

/**
 * Render daily neter banner
 * @param {Object} neter - Daily neter object
 */
export const renderDailyBanner = (neter) => {
  const element = document.getElementById('daily-neter');
  if (element) {
    element.textContent = `${neter.name} - ${neter.title}`;
  }
};

/**
 * Render main neter info display
 * @param {Object} neter - Neter object to display
 */
export const renderNeterInfo = (neter) => {
  const elements = {
    sphereNum: document.getElementById('sphere-num'),
    name: document.getElementById('neter-name'),
    title: document.getElementById('neter-title'),
    badge: document.getElementById('neter-badge'),
    teaching: document.getElementById('neter-teaching')
  };

  if (elements.sphereNum) elements.sphereNum.textContent = neter.id;
  if (elements.name) {
    elements.name.textContent = neter.name;
    elements.name.style.color = colorToHex(neter.color);
  }
  if (elements.title) elements.title.textContent = neter.title;
  if (elements.badge) elements.badge.textContent = createBadgeText(neter);
  if (elements.teaching) elements.teaching.textContent = neter.teaching;
};

/**
 * Render neter grid cards
 * @param {number} activeId - Currently active neter ID
 * @param {Function} onSelect - Callback when neter is selected
 */
export const renderNeterGrid = (activeId, onSelect) => {
  const grid = document.getElementById('neter-grid');
  if (!grid) return;

  grid.innerHTML = '';

  Object.keys(PAUTTI_NETERU).forEach(key => {
    const id = Number(key);
    const neter = PAUTTI_NETERU[id];
    
    const card = document.createElement('div');
    card.className = `neter-card${id === activeId ? ' active' : ''}`;
    
    card.innerHTML = `
      <div class="neter-symbol">${neter.symbol}</div>
      <div class="sphere-label">Sphere ${id}</div>
      <div style="font-size: 1rem; font-weight: 500; margin-bottom: 0.25rem; color: ${colorToHex(neter.color)}">${neter.name}</div>
      <div style="font-size: 0.8rem; opacity: 0.7;">${neter.title}</div>
    `;
    
    card.addEventListener('click', () => onSelect(id));
    grid.appendChild(card);
  });
};

/**
 * Render side panel details for current neter
 * @param {Object} neter - Active neter object
 */
export const renderSidePanel = (neter) => {
  if (!neter) return;

  const name = document.getElementById('panel-neter-name');
  const title = document.getElementById('panel-neter-title');
  const frequency = document.getElementById('panel-neter-frequency');
  const chakra = document.getElementById('panel-neter-chakra');
  const teaching = document.getElementById('panel-neter-teaching');

  if (name) name.textContent = neter.name;
  if (title) title.textContent = neter.title;
  if (frequency) frequency.textContent = `${neter.frequency} Hz`;
  if (chakra) chakra.textContent = neter.chakra;
  if (teaching) teaching.textContent = neter.teaching;
};

/**
 * Render navigator list inside side panel
 * @param {number} activeId - Active neter ID
 * @param {Function} onSelect - Callback when list item clicked
 */
export const renderSidePanelList = (activeId, onSelect) => {
  const list = document.getElementById('side-panel-list');
  if (!list) return;

  list.innerHTML = '';

  Object.values(PAUTTI_NETERU).forEach((neter) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${neter.name}</span><span>${neter.frequency} Hz</span>`;

    if (neter.id === activeId) {
      button.classList.add('is-active');
      button.setAttribute('aria-current', 'true');
    } else {
      button.setAttribute('aria-current', 'false');
    }

    button.addEventListener('click', () => {
      onSelect(neter.id);
      if (window.matchMedia('(max-width: 768px)').matches) {
        closeSidePanel();
      }
    });

    item.appendChild(button);
    list.appendChild(item);
  });
};

/**
 * Update play button state
 * @param {boolean} isPlaying - True if currently playing
 */
export const updatePlayButton = (isPlaying) => {
  const btn = document.getElementById('play-btn');
  if (!btn) return;

  btn.textContent = isPlaying ? '⏸' : '▶';
  btn.className = isPlaying ? 'play-btn playing' : 'play-btn stopped';

  updatePanelPlayButton(isPlaying);
};

/**
 * Update mute button state
 * @param {boolean} isMuted - True if currently muted
 */
export const updateMuteButton = (isMuted) => {
  const btn = document.getElementById('mute-btn');
  if (btn) {
    btn.textContent = isMuted ? '🔇' : '🔊';
  }
};

/**
 * Render session log list
 * @param {Array} sessions - Array of session objects
 */
export const renderSessionLog = (sessions) => {
  const container = document.getElementById('log-list');
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 2rem;">No practice sessions yet.</p>';
    return;
  }

  container.innerHTML = sessions.map(session => `
    <div class="session-item">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <div style="font-weight: 500; color: #ffd700;">${session.neterName}</div>
        <div style="font-size: 0.85rem; opacity: 0.7;">${formatDuration(session.duration)}</div>
      </div>
      <div style="font-size: 0.8rem; opacity: 0.6;">${formatDate(session.date)}</div>
    </div>
  `).join('');
};

/**
 * Render journal entries in the journal panel
 * @param {Array} entries - Array of journal entry objects {date, text, neterName, type}
 */
export const renderJournalEntries = (entries) => {
  const container = document.getElementById('journal-entries');
  if (!container) return;

  if (!entries || entries.length === 0) {
    container.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 2rem;">No journal entries yet. Click "New Entry" to begin.</p>';
    return;
  }

  container.innerHTML = entries.map((entry, index) => {
    const icon = entry.type === 'audio' ? '🎤' : '✍️';
    const preview = entry.text.length > 100 ? entry.text.substring(0, 100) + '...' : entry.text;
    return `
      <div class="journal-entry" data-entry-id="${entry.id}" style="cursor: pointer;">
        <div class="journal-entry__date">${icon} ${formatDate(entry.date)} • ${entry.neterName || 'General'}</div>
        <div class="journal-entry__text">${preview}</div>
      </div>
    `;
  }).reverse().join('');
  
  // Add click handlers
  container.querySelectorAll('.journal-entry').forEach(el => {
    el.addEventListener('click', () => {
      const entryId = el.getAttribute('data-entry-id');
      const entry = entries.find(e => e.id == entryId);
      if (entry) {
        showJournalEntryModal(entry);
      }
    });
  });
};

/**
 * Show full journal entry in modal
 * @param {Object} entry - Journal entry object
 */
export const showJournalEntryModal = (entry) => {
  const icon = entry.type === 'audio' ? '🎤' : '✍️';
  const modal = document.createElement('div');
  modal.className = 'modal visible';
  modal.style.display = 'block';
  modal.style.zIndex = '1300';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header">
        <h3>${icon} ${entry.neterName || 'Journal Entry'}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div style="padding: 1rem; font-size: 0.9rem; opacity: 0.7; border-bottom: 1px solid rgba(255,215,0,0.1);">
        ${formatDate(entry.date)}
      </div>
      ${entry.audioUrl ? `
        <div style="padding: 1rem 1.5rem 0.5rem; border-bottom: 1px solid rgba(255,215,0,0.08);">
          <p style="margin-bottom: 0.5rem; font-size: 0.9rem; opacity: 0.8;">Audio Playback</p>
          <audio controls src="${entry.audioUrl}" style="width: 100%;"></audio>
        </div>
      ` : ''}
      <div style="padding: 1.5rem; line-height: 1.8; white-space: pre-wrap;">
        ${entry.text}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
};

/**
 * Update side panel play button label/state
 * @param {boolean} isPlaying - Current playing state
```
 */
export const updatePanelPlayButton = (isPlaying) => {
  const btn = document.getElementById('panel-play-btn');
  if (!btn) return;

  btn.textContent = isPlaying ? 'Pause Tone' : 'Play Tone';
  btn.dataset.state = isPlaying ? 'playing' : 'stopped';
};

/**
 * Open side panel and show backdrop
 */
export const openSidePanel = () => {
  const panel = document.getElementById('side-panel');
  const backdrop = document.getElementById('side-panel-backdrop');
  if (!panel) return;

  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  if (backdrop) {
    backdrop.classList.add('visible');
  }
};

/**
 * Close side panel and hide backdrop
 */
export const closeSidePanel = () => {
  const panel = document.getElementById('side-panel');
  const backdrop = document.getElementById('side-panel-backdrop');
  if (!panel) return;

  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (backdrop) {
    backdrop.classList.remove('visible');
  }
};

/**
 * Determine if side panel is currently open
 * @returns {boolean}
 */
export const isSidePanelOpen = () => {
  const panel = document.getElementById('side-panel');
  return panel ? panel.classList.contains('open') : false;
};

/**
 * Open modal dialog
 * @param {string} modalId - ID of modal element
 */
export const openModal = (modalId) => {
  const modal = document.getElementById(`${modalId}-modal`);
  const backdrop = document.getElementById('backdrop');
  
  if (modal) modal.classList.add('visible');
  if (backdrop) backdrop.classList.add('visible');
};

/**
 * Close modal dialog
 * @param {string} modalId - ID of modal element
 */
export const closeModal = (modalId) => {
  const modal = document.getElementById(`${modalId}-modal`);
  const backdrop = document.getElementById('backdrop');
  
  if (modal) modal.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('visible');
};

/**
 * Get journal text input value
 * @returns {string} Journal text
 */
export const getJournalText = () => {
  const textarea = document.getElementById('journal-text');
  return textarea ? textarea.value.trim() : '';
};

/**
 * Clear journal text input
 */
export const clearJournalText = () => {
  const textarea = document.getElementById('journal-text');
  if (textarea) textarea.value = '';
};
