import '@testing-library/jest-dom/vitest';

// Polyfill window.HTMLMediaElement.prototype methods if missing in jsdom
if (typeof window !== 'undefined' && window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = async () => {};
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};
}

// Polyfill window.scrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}

// Polyfill URL.createObjectURL and URL.revokeObjectURL
if (typeof URL !== 'undefined') {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:mock-audio-url';
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
}
