# Pautti Neteru - Kemetic Tree of Life

A spiritual sound healing application based on the ancient Kemetic (Egyptian) Tree of Life system, featuring sacred geometry visualization and frequency-based meditation tones.

## 🌟 Features

- **Sacred Geometry Visualization**: Interactive 3D Ankh symbol with particle effects using THREE.js
- **Audio-Reactive Animation**: Visual elements respond to sound playback with enhanced movement and lighting
- **Smooth Audio Transitions**: Fade in/out effects for gentle meditation experience
- **10 Divine Principles (Neteru)**: Each sphere represents a different deity with unique frequency
- **Side Panel Navigation**: Slide-out panel accessed via Eye of Ra button
- **Session Tracking**: Logs your practice sessions with duration
- **Reflection Journal**: Record insights and experiences
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

The project follows **Clean Code**, **DDD** (Domain-Driven Design), and **SRP** (Single Responsibility Principle):

```
client/
├── index.html              # Main HTML structure
├── css/
│   └── styles.css         # All styling and animations
├── js/
│   ├── main.js            # Application entry point
│   ├── app/
│   │   └── commander.js   # Orchestration layer (IMPURE)
│   ├── core/
│   │   └── pure.js        # Pure functions, business logic
│   ├── infra/
│   │   └── messenger.js   # I/O operations, Web Audio API
│   └── ui/
│       └── scribe.js      # DOM rendering, THREE.js visualization
└── img/                   # Reference images
```

### Layer Responsibilities

#### 1. **Core Layer** (`core/pure.js`)
- Pure functions only (no side effects)
- Business logic and data transformations
- Neter (deity) data and calculations
- State management functions
- Utility functions (date, formatting, validation)

#### 2. **Infrastructure Layer** (`infra/messenger.js`)
- Web Audio API integration
- LocalStorage operations
- Async/await operations
- Error handling for I/O
- **Audio Features**:
  - Smooth fade in (0.5s) on play
  - Smooth fade out (0.8s) on stop
  - Sine wave oscillator for pure healing tones
  - Volume control and muting

#### 3. **UI Layer** (`ui/scribe.js`)
- DOM manipulation and rendering
- THREE.js scene management
- Audio-reactive visualization
- **THREE.js Features**:
  - Fallback to static icon if THREE.js unavailable
  - Graceful error handling
  - Enhanced animation when audio playing
  - Responsive particle system
  - Dynamic lighting effects

#### 4. **Application Layer** (`app/commander.js`)
- Coordinates all layers
- Event handling
- Application state management
- Side effect orchestration

## 🎨 UI Components

### Eye of Ra Button
- Positioned at **bottom center** of viewport
- 64×64px circular button with golden glow
- Pulsing animation
- Opens side panel navigation

### Main Stage
- Central 3D visualization area (600×600px)
- Ankh symbol with wireframe rendering
- 400-particle field system
- Responsive to audio playback

### Side Panel
- Slides in from **left side**
- Contains:
  - Current Neter details
  - Frequency and chakra information
  - Quick actions (Play, Journal, Log)
  - Divine Company grid (all 10 Neteru)
  - Navigator list

### Controls
- **Play/Pause**: Start/stop frequency tone (68×68px)
- **Mute**: Toggle audio on/off
- **Journal**: Open reflection modal
- **Log**: View practice history

## 🎵 Audio System

### Frequency Tones (Hz)
- Sphere 0 (Amun-Nun): 432 Hz - Crown + Beyond
- Sphere 1 (Ausar): 396 Hz - Root
- Sphere 2 (Auset): 417 Hz - Sacral
- Sphere 3 (Heru): 528 Hz - Solar Plexus
- Sphere 4 (Maat): 639 Hz - Heart
- Sphere 5 (Tehuti): 741 Hz - Throat
- Sphere 6 (Sekhmet): 852 Hz - Third Eye
- Sphere 7 (Het-Heru): 963 Hz - Crown
- Sphere 8 (Anpu): 174 Hz - Root
- Sphere 9 (Geb): 285 Hz - Root + Sacral

### Audio Behavior
1. **Play**: Fades in over 0.5 seconds
2. **Stop**: Fades out over 0.8 seconds (smooth meditation exit)
3. **Switch Neter**: Stops current, starts new after selection
4. **Mute**: Instant volume to 0, preserves oscillator

### Visual Feedback
- Ankh rotation speed increases 2× when playing
- Particle movement accelerates
- Light pulsing intensifies
- Ankh scales with pulse effect
- Radial particle motion activates

## 🔧 Development

### Run Locally
```bash
cd client
python3 -m http.server 8080
```

Open `http://localhost:8080`

### Browser Requirements
- Modern browser with ES6 module support
- Web Audio API support
- Optional: WebGL for THREE.js (degrades gracefully)

### Fallback Strategy
If THREE.js fails to load:
1. Logs warning to console
2. Shows static Eye of Ra (𓂀) symbol
3. All other features remain functional
4. Audio system unaffected

## 🎯 Usage

1. **Start Meditation**: Click the Eye of Ra button (bottom center)
2. **Select Neter**: Choose from side panel grid or navigator
3. **Play Tone**: Click play button or quick action in panel
4. **Watch Visualization**: Ankh and particles react to audio
5. **Record Insights**: Use journal button to document experience
6. **Track Progress**: View session log with durations

### Keyboard Shortcuts
- `Escape`: Close side panel or modals

## 🌈 Visual Design

### Color Palette
- Background: Deep cosmic gradient (#0a0015 → #1a0530)
- Accent: Golden (#ffd700)
- Text: Warm off-white (#f0e6d2)
- Borders: Translucent gold (rgba(255, 215, 0, 0.2))

### Typography
- Headers: Georgia serif (ancient mystical feel)
- Body: System fonts
- Uppercase tracking for sacred text styling

### Animations
- Starfield pulse (8s cycle)
- Title shimmer (6s gradient flow)
- Eye of Ra pulse (3s breathing effect)
- Border glow (4s rotation)
- Particle float and spin
- Audio-reactive intensity scaling

## 📊 Data Persistence

### LocalStorage Keys
- `pautti-sessions`: Practice session logs (last 50)
- `pautti-journals`: Reflection entries

### Session Data Structure
```javascript
{
  id: timestamp,
  neterId: number,
  neterName: string,
  duration: seconds,
  date: ISO string
}
```

## 🔒 Code Quality

✅ **No backup files** - Cleaned codebase
✅ **SRP** - Each module has single responsibility
✅ **DDD** - Clear domain layer separation
✅ **Pure functions** - Core logic side-effect free
✅ **Graceful degradation** - Fallbacks for missing dependencies
✅ **Error handling** - Try/catch on all I/O operations
✅ **Type documentation** - JSDoc comments throughout
✅ **Responsive design** - Mobile and desktop support

## 🐛 Debugging

Console logs provide clear initialization flow:
```
🌟 Initializing Pautti Neteru...
✅ Audio context ready
📅 Daily neter: [Name]
🎨 UI rendered
✅ THREE.js scene initialized
🔧 Wiring up events...
✓ Play button
✓ Eye of Ra button
🔌 Events wired
✨ Application ready
```

Click events log:
```
👁️ Eye of Ra clicked
```

## 📝 License

Spiritual open-source project for healing and meditation.

---

**Built with sacred geometry, pure tones, and ancient wisdom** ✨🙏✨
