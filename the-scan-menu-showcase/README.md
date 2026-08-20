# The Scan Menu — Premium Showcase Website

> **Brand**: Pixora Studios  
> **Product**: The Scan Menu — Digital QR + NFC Menu Platform  
> **Sister Brand**: [TheScanMenu.com](https://thescanmenu.com) (SaaS Platform)

---

## 🌟 Overview

**The Scan Menu** showcase website is an Apple/Nothing-inspired product launch experience engineered for modern restaurant, cafe, bar, hotel, cloud kitchen, and food court owners.

Instead of generic SaaS cards or spreadsheet-like dashboards, this showcase frames digital restaurant ordering as a **guest-facing product moment** — highlighting instant NFC tap ordering, camera QR scanning, 60fps animations, zero app installation, and instant kitchen ticket dispatch.

---

## ⚡ Tech Stack & Architecture

- **Core**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Vanilla CSS Custom Properties
- **Motion Engine**: GSAP + ScrollTrigger + Lenis Smooth Scrolling
- **Icons**: Lucide React
- **Audio Feedback**: Web Audio API (zero-dependency soft tap synth haptics)
- **Routing**: React Router v7

---

## 🎨 Key Features & Signature Interactions

1. **Tap Reveal (NFC Page & Hero)**: Phone mockup with magnetic pull; tapping triggers radial mask expansion revealing live interactive menu UI + sound feedback.
2. **Scan Reveal (QR Page)**: Sweeping laser beam scan-line animation on QR stand triggering category cards to unfurl.
3. **Pinned Horizontal Story Strip**: 8-beat guest journey (Customer Arrives → Sees Stand → Scans/Taps → Menu Opens → Order → Kitchen Ticket → Seamless Pay → 5-Star Review) pinned vertically and scrubbing horizontally on scroll.
4. **Interactive Venue Switcher (Industries)**: Selectable venue types (Restaurant, Cafe, Hotel, Bar, Cloud Kitchen, Food Court) instantly morphing live table menu styling.
5. **Magnetic Buttons & Custom Ring Cursor**: Arc/Linear-style ring cursor with dynamic contextual hover labels.
6. **3D Depth Tilt Cards**: CSS perspective transforms responding smoothly to cursor position.
7. **ROI Revenue Calculator**: Live interactive sliders calculating added monthly venue revenue.

---

## 🛠️ Scripts & Standard Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 📁 Repository Structure

```
the-scan-menu-showcase/
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.js
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── src/
    ├── assets/
    │   └── images/
    ├── components/
    │   ├── common/
    │   │   └── ImageAsset.tsx
    │   ├── interactive/
    │   │   ├── HorizontalStoryStrip.tsx
    │   │   ├── ScanRevealQr.tsx
    │   │   ├── TapRevealNfc.tsx
    │   │   └── VenueSwitcher.tsx
    │   ├── layout/
    │   │   ├── Cursor.tsx
    │   │   ├── Footer.tsx
    │   │   └── Navbar.tsx
    │   └── ui/
    │       ├── Card3D.tsx
    │       ├── Magnetic.tsx
    │       └── SoundToggle.tsx
    ├── pages/
    │   ├── ContactPage.tsx
    │   ├── FeaturesPage.tsx
    │   ├── Home.tsx
    │   ├── HowItWorksPage.tsx
    │   ├── IndustriesPage.tsx
    │   ├── NfcPage.tsx
    │   ├── PricingPage.tsx
    │   └── QrPage.tsx
    ├── styles/
    │   └── index.css
    ├── utils/
    │   ├── lenis.ts
    │   └── sound.ts
    ├── App.tsx
    └── main.tsx
```

---

&copy; Pixora Studios. All rights reserved.
