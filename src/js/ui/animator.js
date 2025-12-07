/**
 * UI/ANIMATOR.JS
 * Handles all GSAP animations and transitions.
 * Pure UI animation logic, separated from DOM rendering.
 */

import { gsap } from 'gsap';

// Animation configuration
const CONFIG = {
  duration: {
    short: 0.3,
    medium: 0.6,
    long: 1.2
  },
  ease: {
    standard: 'power2.out',
    smooth: 'power3.inOut',
    elastic: 'elastic.out(1, 0.5)'
  }
};

/**
 * Initialize global animations (backgrounds, ambient effects)
 */
export const initAnimations = () => {
  // Animate starfield background
  gsap.to('.starfield', {
    rotation: 360,
    duration: 200,
    repeat: -1,
    ease: 'none'
  });

  // Initial fade in of container
  gsap.from('.container', {
    opacity: 0,
    y: 20,
    duration: CONFIG.duration.long,
    ease: CONFIG.ease.smooth
  });
};

/**
 * Animate card entry
 * @param {HTMLElement} element 
 * @param {number} index 
 */
export const animateCardEntry = (element, index = 0) => {
  gsap.fromTo(element, 
    { 
      opacity: 0, 
      y: 50,
      scale: 0.9
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: CONFIG.duration.medium,
      delay: index * 0.1,
      ease: CONFIG.ease.standard,
      clearProps: 'all'
    }
  );
};

/**
 * Animate modal opening
 * @param {HTMLElement} modal 
 * @param {HTMLElement} content 
 */
export const animateModalOpen = (modal, content) => {
  const tl = gsap.timeline();
  
  tl.to(modal, {
    display: 'flex',
    opacity: 1,
    duration: CONFIG.duration.short
  })
  .fromTo(content,
    { y: 20, opacity: 0, scale: 0.95 },
    { y: 0, opacity: 1, scale: 1, duration: CONFIG.duration.medium, ease: CONFIG.ease.elastic },
    '-=0.1'
  );
};

/**
 * Animate modal closing
 * @param {HTMLElement} modal 
 * @param {HTMLElement} content 
 * @param {Function} onComplete 
 */
export const animateModalClose = (modal, content, onComplete) => {
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(modal, { display: 'none' });
      if (onComplete) onComplete();
    }
  });

  tl.to(content, {
    y: 20,
    opacity: 0,
    scale: 0.95,
    duration: CONFIG.duration.short,
    ease: 'power2.in'
  })
  .to(modal, {
    opacity: 0,
    duration: CONFIG.duration.short
  }, '-=0.1');
};

/**
 * Animate button hover effect
 * @param {HTMLElement} button 
 */
export const animateButtonHover = (button) => {
  button.addEventListener('mouseenter', () => {
    gsap.to(button, {
      scale: 1.05,
      boxShadow: '0 0 20px var(--accent-glow)',
      duration: 0.3
    });
  });
  
  button.addEventListener('mouseleave', () => {
    gsap.to(button, {
      scale: 1,
      boxShadow: 'none',
      duration: 0.3
    });
  });
};
