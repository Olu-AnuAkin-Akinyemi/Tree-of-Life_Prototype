---
name: web-performance-auditor
description: Comprehensive web performance optimization covering Lighthouse scoring, Core Web Vitals, bundle analysis, lazy loading, CDN configuration, image optimization, and caching strategies. Focuses on measurable performance improvements for production web applications.
---

# Web Performance Auditor

**Version**: 1.0  
**Focus**: Measurable performance optimization  
**Purpose**: Ship fast, delightful web experiences

---

## Philosophy: Speed is a Feature

Fast sites:
- **Convert better**: 100ms delay = 1% revenue loss (Amazon)
- **Rank higher**: Google uses speed as ranking factor
- **Feel better**: Speed creates trust
- **Work everywhere**: Essential on slow connections

**Performance budget**:
- **< 3s**: Time to Interactive
- **< 1s**: First Contentful Paint
- **< 100ms**: Input response time

---

## Part 1: Core Web Vitals

### The Three Metrics That Matter

Google's Core Web Vitals are part of page experience signals:

#### 1. **LCP (Largest Contentful Paint)**
**What**: Time until largest content element is visible  
**Target**: < 2.5 seconds  
**Measures**: Loading performance

```
Good: < 2.5s
Needs Improvement: 2.5s - 4s
Poor: > 4s
```

**Common causes**:
- Large images
- Render-blocking JavaScript/CSS
- Slow server response

#### 2. **FID (First Input Delay)** / **INP (Interaction to Next Paint)**
**What**: Time between user interaction and browser response  
**Target**: < 100ms (FID), < 200ms (INP)  
**Measures**: Interactivity

```
Good: < 100ms (FID) / < 200ms (INP)
Needs Improvement: 100-300ms / 200-500ms
Poor: > 300ms / > 500ms
```

**Common causes**:
- Heavy JavaScript execution
- Long tasks blocking main thread

#### 3. **CLS (Cumulative Layout Shift)**
**What**: Visual stability - content shouldn't jump around  
**Target**: < 0.1  
**Measures**: Visual stability

```
Good: < 0.1
Needs Improvement: 0.1 - 0.25
Poor: > 0.25
```

**Common causes**:
- Images without dimensions
- Ads/embeds inserted without space
- Web fonts causing layout shift

---

## Part 2: Measuring Performance

### Lighthouse

Chrome's built-in auditing tool:

```bash
# CLI
npm install -g lighthouse
lighthouse https://example.com --view

# Or use Chrome DevTools
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Click "Analyze page load"
```

**Lighthouse categories**:
- Performance (0-100)
- Accessibility
- Best Practices
- SEO
- PWA

**Target scores**:
- **90+**: Excellent
- **50-89**: Needs improvement
- **< 50**: Poor

### WebPageTest

More detailed testing with throttling:

```
URL: https://www.webpagetest.org/
Options:
- Test location: Multiple
- Connection: 3G, 4G, Cable
- Run tests: 3+ for median results
```

### Chrome DevTools Performance Panel

```javascript
// 1. Open DevTools → Performance tab
// 2. Click Record
// 3. Interact with page
// 4. Click Stop
// 5. Analyze flame chart

// Look for:
// - Long tasks (> 50ms)
// - Layout thrashing
// - Forced reflows
// - JavaScript execution time
```

---

## Part 3: Optimizing LCP (Loading)

### 1. Optimize Images

```html
<!-- ❌ Bad: Huge unoptimized image -->
<img src="hero.jpg" />

<!-- ✅ Good: Responsive, optimized, lazy -->
<img 
  src="hero-small.jpg"
  srcset="
    hero-small.jpg 400w,
    hero-medium.jpg 800w,
    hero-large.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, 
         (max-width: 1000px) 800px,
         1200px"
  alt="Hero image"
  loading="lazy"
  width="1200"
  height="600"
/>

<!-- ✅ Even better: Modern formats -->
<picture>
  <source type="image/avif" srcset="hero.avif" />
  <source type="image/webp" srcset="hero.webp" />
  <img src="hero.jpg" alt="Hero image" />
</picture>
```

**Image optimization checklist**:
- [ ] Compress (TinyPNG, Squoosh)
- [ ] Use modern formats (WebP, AVIF)
- [ ] Set width/height attributes
- [ ] Use responsive images (srcset)
- [ ] Lazy load below-the-fold images

### 2. Preload Critical Resources

```html
<head>
  <!-- Preload LCP image -->
  <link rel="preload" as="image" href="hero.jpg" />
  
  <!-- Preload critical fonts -->
  <link 
    rel="preload" 
    as="font"
    type="font/woff2"
    href="/fonts/main.woff2"
    crossorigin
  />
  
  <!-- Preconnect to external domains -->
  <link rel="preconnect" href="https://api.example.com" />
  <link rel="dns-prefetch" href="https://cdn.example.com" />
</head>
```

### 3. Eliminate Render-Blocking Resources

```html
<!-- ❌ Bad: Blocking CSS -->
<link rel="stylesheet" href="styles.css" />

<!-- ✅ Good: Inline critical CSS, defer non-critical -->
<style>
  /* Critical above-the-fold CSS inline */
  body { margin: 0; font-family: sans-serif; }
  .hero { height: 100vh; }
</style>

<!-- Defer non-critical CSS -->
<link 
  rel="preload" 
  as="style"
  href="non-critical.css"
  onload="this.rel='stylesheet'"
/>

<!-- ❌ Bad: Blocking JavaScript -->
<script src="app.js"></script>

<!-- ✅ Good: Defer or async -->
<script src="app.js" defer></script>
<!-- defer: Loads in parallel, executes after HTML parsing -->

<script src="analytics.js" async></script>
<!-- async: Loads in parallel, executes immediately when ready -->
```

### 4. Server Response Time

```javascript
// CloudFlare Workers example
export default {
  async fetch(request, env) {
    // 1. Cache static assets
    const cache = caches.default
    let response = await cache.match(request)
    
    if (!response) {
      response = await fetch(request)
      
      // Cache for 1 hour
      const cacheControl = 'public, max-age=3600'
      const newHeaders = new Headers(response.headers)
      newHeaders.set('Cache-Control', cacheControl)
      
      response = new Response(response.body, {
        status: response.status,
        headers: newHeaders
      })
      
      await cache.put(request, response.clone())
    }
    
    return response
  }
}
```

---

## Part 4: Optimizing FID/INP (Interactivity)

### 1. Break Up Long Tasks

```javascript
// ❌ Bad: Long blocking task (300ms)
function processLargeData(items) {
  for (let i = 0; i < 100000; i++) {
    // Heavy computation
    processItem(items[i])
  }
}

// ✅ Good: Break into chunks with setTimeout
async function processLargeData(items) {
  const CHUNK_SIZE = 1000
  
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)
    
    // Process chunk
    chunk.forEach(processItem)
    
    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

// ✅ Even better: Use scheduler.yield (when available)
async function processLargeData(items) {
  for (let item of items) {
    processItem(item)
    
    // Yield to browser periodically
    if (navigator.scheduling?.isInputPending()) {
      await scheduler.yield()
    }
  }
}
```

### 2. Code Splitting

```javascript
// ❌ Bad: Load everything upfront
import { heavyChart } from './charts.js'
import { analytics } from './analytics.js'
import { utils } from './utils.js'

// ✅ Good: Dynamic imports
// Only load when needed
button.addEventListener('click', async () => {
  const { heavyChart } = await import('./charts.js')
  heavyChart.render()
})

// Route-based splitting (Astro example)
// pages/dashboard.astro
---
// Heavy admin code only loads on dashboard route
import DashboardChart from '../components/DashboardChart.astro'
---

<DashboardChart />
```

### 3. Defer Non-Critical JavaScript

```html
<!-- Defer analytics -->
<script src="analytics.js" defer></script>

<!-- Inline small, critical scripts -->
<script>
  // Critical: Show UI immediately
  document.getElementById('loader').classList.add('loaded')
</script>
```

---

## Part 5: Optimizing CLS (Visual Stability)

### 1. Set Image/Video Dimensions

```html
<!-- ❌ Bad: No dimensions -->
<img src="photo.jpg" alt="Photo" />
<!-- Browser doesn't know size, reserves no space, layout shifts -->

<!-- ✅ Good: Explicit dimensions -->
<img 
  src="photo.jpg" 
  alt="Photo"
  width="800"
  height="600"
/>
<!-- Browser reserves space, no layout shift -->

<!-- ✅ Also good: Aspect ratio -->
<style>
  .image-container {
    aspect-ratio: 16 / 9;
  }
</style>
```

### 2. Reserve Space for Ads/Embeds

```html
<!-- ❌ Bad: Ad container with no height -->
<div class="ad-container">
  <!-- Ad loads and shifts content -->
</div>

<!-- ✅ Good: Fixed minimum height -->
<div class="ad-container" style="min-height: 250px;">
  <!-- Space reserved, no shift -->
</div>
```

### 3. Font Loading Strategy

```css
/* ❌ Bad: Invisible text during load (FOIT) */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
}

/* ✅ Good: Fallback during load (FOUT) */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
  font-display: swap; /* Show fallback immediately */
}

/* ✅ Even better: Preload critical fonts */
/* In <head>: */
<link 
  rel="preload" 
  as="font"
  type="font/woff2"
  href="font.woff2"
  crossorigin
/>
```

---

## Part 6: Bundle Optimization

### Analyze Your Bundle

```bash
# Vite/Astro
npm install -D rollup-plugin-visualizer

# Add to vite.config.js:
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true
    })
  ]
}

# Build and open bundle report
npm run build
```

### Tree Shaking

Ensure unused code is removed:

```javascript
// ❌ Bad: Import entire library
import _ from 'lodash'
const sorted = _.sortBy(array)

// ✅ Good: Import only what you need
import sortBy from 'lodash/sortBy'
const sorted = sortBy(array)

// ✅ Even better: Use native JS when possible
const sorted = array.sort((a, b) => a - b)
```

### Bundle Size Targets

```
Total JavaScript: < 200kb (gzipped)
Per-route chunk: < 50kb
Third-party scripts: < 100kb
```

---

## Part 7: Caching Strategies

### Cache-Control Headers

```javascript
// CloudFlare Workers example
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    
    // Static assets: Cache forever (with hash in filename)
    if (url.pathname.match(/\.(js|css|png|jpg|webp)$/)) {
      const response = await fetch(request)
      
      return new Response(response.body, {
        ...response,
        headers: {
          ...response.headers,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      })
    }
    
    // HTML: Short cache with revalidation
    if (url.pathname.endsWith('.html')) {
      return new Response(response.body, {
        headers: {
          'Cache-Control': 'public, max-age=300, must-revalidate'
        }
      })
    }
    
    return fetch(request)
  }
}
```

### Service Worker Caching

```javascript
// service-worker.js
const CACHE_NAME = 'v1'
const URLS_TO_CACHE = [
  '/',
  '/styles.css',
  '/app.js',
  '/logo.png'
]

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
  )
})

// Fetch: Cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  )
})
```

---

## Part 8: Lazy Loading

### Images

```html
<!-- Native lazy loading -->
<img src="image.jpg" loading="lazy" alt="Description" />

<!-- Only loads when near viewport -->
```

### Components (Astro example)

```astro
---
// Heavy component
import HeavyChart from './HeavyChart.astro'
---

<!-- Load only in browser, not during SSR -->
<HeavyChart client:visible />

<!-- Options:
  client:load    - Load immediately
  client:idle    - Load when browser idle
  client:visible - Load when scrolled into view
  client:media="(min-width: 768px)" - Load based on media query
-->
```

### JavaScript

```javascript
// Intersection Observer for manual lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Load resource
      loadComponent(entry.target)
      observer.unobserve(entry.target)
    }
  })
})

document.querySelectorAll('.lazy-load').forEach(el => {
  observer.observe(el)
})
```

---

## Part 9: CDN Configuration

### CloudFlare Settings

```javascript
// CloudFlare Workers - Edge caching
export default {
  async fetch(request, env) {
    const cache = caches.default
    
    // Try cache first
    let response = await cache.match(request)
    
    if (!response) {
      // Fetch from origin
      response = await fetch(request)
      
      // Cache at edge
      const cacheControl = response.headers.get('Cache-Control')
      if (cacheControl?.includes('public')) {
        await cache.put(request, response.clone())
      }
    }
    
    return response
  }
}
```

### Image CDN

```html
<!-- CloudFlare Images example -->
<img 
  src="https://imagedelivery.net/ACCOUNT/IMAGE_ID/public"
  alt="Optimized image"
/>

<!-- Automatic format detection (WebP/AVIF) -->
<!-- Automatic compression -->
<!-- Edge caching globally -->
```

---

## Part 10: Network Optimization

### Resource Hints

```html
<head>
  <!-- DNS prefetch: Resolve DNS early -->
  <link rel="dns-prefetch" href="https://api.example.com" />
  
  <!-- Preconnect: DNS + TCP + TLS -->
  <link rel="preconnect" href="https://api.example.com" />
  
  <!-- Prefetch: Load for next navigation -->
  <link rel="prefetch" href="/next-page.html" />
  
  <!-- Preload: Critical for current page -->
  <link rel="preload" as="script" href="critical.js" />
</head>
```

### HTTP/2 & HTTP/3

```
Benefits:
- Multiplexing (parallel requests)
- Header compression
- Server push
- Faster TLS handshake (HTTP/3)

CloudFlare enables HTTP/2 and HTTP/3 automatically
```

---

## Part 11: Monitoring Performance

### Real User Monitoring (RUM)

```javascript
// web-vitals library
import { onLCP, onFID, onCLS } from 'web-vitals'

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch('/analytics', {
    method: 'POST',
    body: JSON.stringify(metric)
  })
}

onLCP(sendToAnalytics)
onFID(sendToAnalytics)
onCLS(sendToAnalytics)
```

### Performance Observer

```javascript
// Monitor long tasks
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long task detected:', entry)
      // Send to monitoring service
    }
  }
})

observer.observe({ entryTypes: ['longtask'] })
```

### Custom Metrics

```javascript
// Measure custom timings
performance.mark('api-start')
await fetchData()
performance.mark('api-end')

performance.measure('api-duration', 'api-start', 'api-end')

const measure = performance.getEntriesByName('api-duration')[0]
console.log('API took:', measure.duration, 'ms')
```

---

## Part 12: Mobile Performance

### Mobile-Specific Optimizations

```css
/* Reduce animations on low-end devices */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}

/* Optimize for touch */
button {
  /* Larger touch targets */
  min-height: 44px;
  min-width: 44px;
  
  /* Remove tap highlight */
  -webkit-tap-highlight-color: transparent;
}
```

### Network-Aware Loading

```javascript
// Adapt to connection quality
const connection = navigator.connection

if (connection) {
  if (connection.effectiveType === '4g') {
    // Load high-quality images
    loadHighQualityImages()
  } else {
    // Load lower-quality images
    loadLowQualityImages()
  }
  
  // Listen for changes
  connection.addEventListener('change', handleNetworkChange)
}
```

---

## Part 13: Performance Checklist

### Before Launch

**Images**:
- [ ] Compressed (< 200kb each)
- [ ] Modern formats (WebP/AVIF)
- [ ] Responsive (srcset)
- [ ] Lazy loaded (below fold)
- [ ] Width/height set

**JavaScript**:
- [ ] Code split by route
- [ ] Tree shaken
- [ ] Minified
- [ ] < 200kb total (gzipped)
- [ ] Deferred non-critical

**CSS**:
- [ ] Critical CSS inline
- [ ] Non-critical deferred
- [ ] Unused CSS removed
- [ ] Minified

**Fonts**:
- [ ] Preloaded
- [ ] font-display: swap
- [ ] Subset to needed characters

**Caching**:
- [ ] Static assets cached forever
- [ ] HTML has short cache + revalidation
- [ ] CDN configured

**Core Web Vitals**:
- [ ] LCP < 2.5s
- [ ] FID < 100ms (INP < 200ms)
- [ ] CLS < 0.1

**Testing**:
- [ ] Lighthouse score 90+
- [ ] Tested on 3G
- [ ] Tested on mobile device
- [ ] RUM monitoring active

---

## Part 14: Common Performance Pitfalls

### ❌ Avoid

1. **Loading huge libraries for small features**
   ```javascript
   // ❌ 70kb for one function
   import _ from 'lodash'
   
   // ✅ Use native JS or import specific function
   import debounce from 'lodash/debounce'
   ```

2. **No image optimization**
   ```html
   <!-- ❌ 5MB image -->
   <img src="photo.jpg" />
   
   <!-- ✅ Compressed, responsive -->
   <img src="photo-optimized.webp" loading="lazy" />
   ```

3. **Synchronous scripts in <head>**
   ```html
   <!-- ❌ Blocks rendering -->
   <script src="app.js"></script>
   
   <!-- ✅ Deferred -->
   <script src="app.js" defer></script>
   ```

4. **No caching strategy**
   ```javascript
   // ❌ Fetches every time
   fetch('/api/data')
   
   // ✅ Cache when appropriate
   const cached = await cache.match('/api/data')
   if (cached) return cached
   ```

---

## Performance Budget Example

```json
{
  "budget": {
    "javascript": {
      "initial": "200kb",
      "perRoute": "50kb"
    },
    "images": {
      "max": "200kb",
      "format": "webp"
    },
    "fonts": {
      "total": "100kb"
    },
    "metrics": {
      "LCP": "2.5s",
      "FID": "100ms",
      "CLS": "0.1",
      "lighthouseScore": 90
    }
  }
}
```

---

## Tools Reference

**Measurement**:
- Lighthouse (Chrome DevTools)
- WebPageTest.org
- Chrome User Experience Report
- web-vitals library

**Optimization**:
- Squoosh.app (image compression)
- Bundle analyzer (rollup-plugin-visualizer)
- Coverage panel (Chrome DevTools)

**Monitoring**:
- CloudFlare Analytics
- Google Analytics 4 (Web Vitals)
- Custom RUM implementation

---

## Resources

- **web.dev**: https://web.dev/learn-performance/
- **MDN Performance**: https://developer.mozilla.org/en-US/docs/Web/Performance
- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/performance/
- **Web Vitals**: https://web.dev/vitals/

---

## Summary

**Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1

**Optimize images**: Compress, modern formats, lazy load, set dimensions

**Optimize JavaScript**: Code split, tree shake, defer non-critical

**Cache aggressively**: Static assets forever, HTML short-lived

**Measure continuously**: Lighthouse + RUM to catch regressions

**Performance is UX**: Fast sites convert better and delight users
