/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark, cinematic palette aliases
        'void': '#06070C',              // Deep obsidian void background
        'panel': '#12141F',             // Elevated surface cards & panels
        'panel-elevated': '#181B2A',    // Floating popovers & active items
        'panel-border': '#222638',      // Hairline borders and dividers

        'bg-void': '#06070C',
        'bg-panel': '#12141F',
        'bg-panel-elevated': '#181B2A',
        'bg-panel-border': '#222638',
        
        // Typography inks
        'ink': '#F4F1E9',              // High-contrast primary editorial text
        'ink-muted': '#A7A9B8',        // Secondary guidance & metadata
        'ink-faint': '#5D6073',        // Decorative timestamps & subtle accents
        
        // Signal accents
        'signal-gold': '#D9A55C',      // Warm gold primary signal & active indicator
        'signal-gold-hover': '#C49147',// Deeper gold for hover interactions
        'signal-blue': '#5E7CE2',      // Electric blue secondary acoustic biomarker
        
        // Clinical risk states
        'risk-low': '#4CAF82',         // Emerald green low-risk indicator
        'risk-caution': '#D9A55C',     // Warm amber caution & uncertainty
        'risk-elevated': '#E2665E',    // Crimson elevated-risk indicator
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        // 1.25 (Major Third) modular scale from 16px base
        'xs': ['0.8rem', { lineHeight: '1.25rem' }],     // 12.8px
        'sm': ['0.875rem', { lineHeight: '1.35rem' }],   // 14px
        'base': ['1rem', { lineHeight: '1.6rem' }],      // 16px base
        'md': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        'lg': ['1.563rem', { lineHeight: '2rem' }],      // 25px
        'xl': ['1.953rem', { lineHeight: '2.35rem' }],   // 31.25px
        '2xl': ['2.441rem', { lineHeight: '2.85rem' }],  // 39px
        '3xl': ['3.052rem', { lineHeight: '3.4rem' }],   // 48.8px
        '4xl': ['3.815rem', { lineHeight: '4.2rem' }],   // 61px
      },
      borderRadius: {
        // Restrained editorial radii (avoiding SaaS bubble chrome)
        'none': '0',
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'panel': '0 4px 16px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        'glow-gold': '0 0 20px -3px rgba(217, 165, 92, 0.35)',
        'glow-blue': '0 0 20px -3px rgba(94, 124, 226, 0.35)',
      },
    },
  },
  plugins: [],
};
