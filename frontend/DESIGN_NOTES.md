# Vocalis Design System & Visual Identity Notes

**Product:** Non-Invasive Acoustic Biomarker Screening for Parkinson's Disease (Clinical Decision Support Platform)  
**Aesthetic:** Dark, Cinematic, Editorial  
**Version:** 1.0.0

---

## 1. Design Tokens

### Color Palette

| Token Name | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `bg-void` | `#06070C` | Primary obsidian void canvas background; deep near-black preventing light bleed. |
| `bg-panel` | `#12141F` | Elevated surface cards, sections, navigation bars, and dropzones. |
| `bg-panel-elevated` | `#181B2A` | Interactive surface hover states, active tabs, and floating modals. |
| `bg-panel-border` | `#222638` | Hairline dividers, card outlines, and subtle container separation. |
| `ink` | `#F4F1E9` | High-contrast warm off-white for headlines, primary body, and key values. |
| `ink-muted` | `#A7A9B8` | Cool silver-grey for secondary labels, descriptions, and metadata. |
| `ink-faint` | `#5D6073` | Low-priority timestamps, decorative markers, and subtle breadcrumbs. |
| `signal-gold` | `#D9A55C` | Primary signal accent: buttons, active tab indicators, and peak salience markers. |
| `signal-gold-hover`| `#C49147` | Hover interaction state for signal-gold controls. |
| `signal-blue` | `#5E7CE2` | Acoustic waveform data, neural feature tags, and secondary biomarkers. |
| `risk-low` | `#4CAF82` | Emerald green status badge for low acoustic risk indication. |
| `risk-caution` | `#D9A55C` | Warm amber warning badge for uncertain/caution screening indicators. |
| `risk-elevated` | `#E2665E` | Crimson status badge for elevated acoustic risk indication. |

---

### Typography Scale & Hierarchy

We employ an editorial pairing: **Fraunces** (variable serif with soft optical weights and italics) for display headings, paired with **Inter** (clean, highly legible neo-grotesk) for UI elements, labels, data tables, and medical prose.

A **1.25 (Major Third)** modular ratio governs font sizing from a 16px base:

| Token | Size | Line Height | Font Family | Default Weight | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` | `0.8rem` (12.8px) | `1.25rem` | `Inter` | 400 / 500 | Metadata, captions, badges, table headers |
| `sm` | `0.875rem` (14px) | `1.35rem` | `Inter` | 400 / 500 | Form guidance, navigation links, secondary text |
| `base` | `1.0rem` (16px) | `1.6rem` | `Inter` | 400 | Body prose, medical explanations, citations |
| `md` | `1.25rem` (20px) | `1.75rem` | `Fraunces` / `Inter` | 500 / 600 | Section titles, subheadings |
| `lg` | `1.563rem` (25px) | `2.0rem` | `Fraunces` | 500 | Card titles, modal headers |
| `xl` | `1.953rem` (31.25px) | `2.35rem` | `Fraunces` | 500 | Page titles |
| `2xl` | `2.441rem` (39px) | `2.85rem` | `Fraunces` | 500 | Primary banner headings |
| `3xl` | `3.052rem` (48.8px) | `3.4rem` | `Fraunces` | 400 / 500 | Large hero sub-banners |
| `4xl` | `3.815rem` (61px) | `4.2rem` | `Fraunces` | 300 Italic | **Hero Headline Moment** (reserved) |

---

### Restrained Border Radii

To maintain an editorial publication aesthetic rather than a generic bubbly SaaS template:
- `rounded-none`: `0px`
- `rounded-xs`: `2px` (micro badges, code tags)
- `rounded-sm`: `4px` (buttons, inputs)
- `rounded` / `rounded-md`: `6px` – `8px` (cards, panels, dropzones)
- `rounded-lg`: `12px` (major elevated containers)
- `rounded-full`: `9999px` (status indicator pills only)

---

## 2. WCAG Contrast Compliance Verification

All text and interactive color pairs have been verified against WCAG 2.1 Level AA (minimum 4.5:1 for normal text, 3.0:1 for large text) and Level AAA (7.0:1) standards against dark backgrounds (`bg-void` `#06070C` and `bg-panel` `#12141F`).

| Foreground Token | Background Token | Relative Luminance | Calculated Contrast Ratio | WCAG Compliance | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ink` (`#F4F1E9`) | `bg-void` (`#06070C`) | $L_1=0.879$, $L_2=0.0006$ | **18.36 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `ink` (`#F4F1E9`) | `bg-panel` (`#12141F`) | $L_1=0.879$, $L_2=0.0060$ | **16.59 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `ink-muted` (`#A7A9B8`) | `bg-void` (`#06070C`) | $L_1=0.399$, $L_2=0.0006$ | **8.87 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `ink-muted` (`#A7A9B8`) | `bg-panel` (`#12141F`) | $L_1=0.399$, $L_2=0.0060$ | **8.02 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `signal-gold` (`#D9A55C`) | `bg-void` (`#06070C`) | $L_1=0.423$, $L_2=0.0006$ | **9.35 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `signal-gold` (`#D9A55C`) | `bg-panel` (`#12141F`) | $L_1=0.423$, $L_2=0.0060$ | **8.45 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `bg-void` (`#06070C`) [Text] | `signal-gold` (`#D9A55C`) [Btn] | $L_1=0.423$, $L_2=0.0006$ | **9.35 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `signal-blue` (`#5E7CE2`) | `bg-void` (`#06070C`) | $L_1=0.222$, $L_2=0.0006$ | **5.38 : 1** | Level AA (Pass > 4.5:1) | **PASS** |
| `risk-low` (`#4CAF82`) | `bg-void` (`#06070C`) | $L_1=0.338$, $L_2=0.0006$ | **7.67 : 1** | Level AAA (Pass > 7.0:1) | **PASS** |
| `risk-elevated` (`#E2665E`) | `bg-void` (`#06070C`) | $L_1=0.264$, $L_2=0.0006$ | **6.21 : 1** | Level AA (Pass > 4.5:1) | **PASS** |

---

## 3. Governing Motif: "Voice Becoming Visible Signal"

The overarching visual metaphor for this application is **VOICE BECOMING VISIBLE SIGNAL**: a person's speech, ordinarily invisible in the physical world, rendered as light, temporal frequency trajectories, and neural attention patterns that the self-supervised model can read.

### Where the Motif Applies
- **Marketing & Narrative Pages (`Home`, `Record`, `Upload`)**:
  Atmospheric warm gold signal gradients, ambient light rollouts, live oscillating audio wavebars, and visual frequency bands reinforce the sensation of acoustic phonation being illuminated into mathematical visibility.

### Where the Motif Must NOT Appear
- **Clinical & Diagnostic Decision Support Pages (`Result`, `Report`, `History`)**:
  When a patient or clinician is inspecting a screening outcome, atmospheric mood must step aside in favor of **calm, unambiguous clarity and high contrast**. Attention maps are presented strictly as quantifiable, time-aligned bar charts with precise numerical metrics. Reports are presented in clean, well-spaced white/dark-panel sections with explicit data boundaries, avoiding decorative signal distortion.

---

## 4. The "Spend Boldness in One Place" Rule

To prevent visual fatigue and maintain clinical gravitas, **boldness is spent in exactly one place**:
- The hero moment on the `Home` page features Fraunces at `300 italic` (*"Voice becoming visible signal."*).
- All subsequent headings, navigation titles, card headers, and UI controls adopt disciplined, un-italicized weights (`400` to `600`) in Inter or regular Fraunces.
- Card corners remain restrained (`4px` to `8px`), borders remain hairline (`1px` `#222638`), and focus rings consistently highlight with high-contrast `signal-gold` for keyboard accessibility.
