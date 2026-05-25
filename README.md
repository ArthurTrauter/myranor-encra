# Myranor Encra (ENCRA: ENcounter + CReature Assistant)

Welcome to **Myranor Encra**, a premium RPG encounter and creature assistant tool designed for Game Masters (Spielleiter) to orchestrate sessions, customize monsters, and build a persistent bestiary database.

---

## 🌟 Key Features

### 1. Dynamic Encounter Deck
- Track monsters, social NPCs, traps, and environmental hazards in the active session.
- Hide or reveal secrets (e.g., hidden DM notes or NPC motivations) with one click.
- Instantly delete elements once defeated or resolved.

### 2. NLP Bestiary Text Parser
- Copy-paste raw text descriptions straight from RPG bestiaries.
- The built-in parser automatically extracts:
  - Level/Challenge Rating (HG)
  - Hit Points (TP) formula and values
  - Defenses/Armor Class (RK)
  - Speed (BW), Übungsbonus (UB), Saves, Immunities, and Senses
  - Attributes (STÄ, GES, KON, INT, WEI, CHA)
  - Actions, traits, reactions, legendary actions, lair actions, and regional effects.
- Detects and parses slash-separated multi-variant stats automatically.

### 3. Advanced Variant Management
- Supports multi-variant templates (e.g., *Nestling / Jung / Ausgewachsen / Uralt* or *Leicht / Mittel / Schwer / Boss*).
- Switch card levels on the fly inside the active encounter deck.
- In the manual creator, manage variants dynamically: add new variant tiers, delete existing ones, or switch active editing variant with auto-save capabilities.

### 4. Custom Template Builder & Editor
- Manage custom templates via the `"Eigene Vorlagen verwalten"` panel.
- **Bearbeiten (Edit)**: Load any custom template back into the manual form to modify its stats, traits, actions, and variant definitions.
- **Vorlage kopieren (Copy Template)**: Load any official or custom template variant as a baseline copy to speed up new creature creation.
- **Formular leeren**: Reset all form fields to start fresh with a clean slate.

### 5. Offline-First Synchronization
- **Supabase Integration**: Synchronizes your encounter deck and custom templates with a secure Supabase backend when authenticated.
- **Robust Local Storage Fallback**: Seamlessly degrades to local browser storage (`myranor_encounters` and `myranor_custom_templates`) if Supabase is offline or credentials are not configured, maintaining 100% functionality.

---

## 🛠️ Technology Stack

- **Framework**: React (Vite, TypeScript)
- **Styling**: Vanilla CSS with modern grid layout, glassmorphism, responsive styles, and custom ambient glowing themes
- **Database / Backend**: Supabase (RLS enabled for private CRUD operations)
- **State Management**: React Context API
- **Data Parser**: Custom Regex-based NLP Parser engine

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd myranor-encra
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by copying `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Provide your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` credentials.

### Seeding the Template Database

To seed the Supabase database with the official bestiary templates:
```bash
node scripts/seed-db.js
```

### Run Locally

Start the Vite development server:
```bash
npm run dev
```

### Build for Production

Compile TypeScript and build the production bundle:
```bash
npm run build
```

---

## 📁 Repository Structure

```
├── scripts/
│   └── seed-db.js                # Database seeder script
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx       # Auth provider (Supabase session)
│   │   └── EncounterContext.tsx  # Encounter & Template CRUD context
│   ├── data/
│   │   ├── encounterTemplates.json  # Backup official templates
│   │   └── chrattac_koenigin.json   # Seed/Validation bestiary extracts
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client initialization
│   │   └── bestiaryParser.ts     # NLP Regex Parser engine
│   ├── types/
│   │   └── index.ts              # TypeScript interface definitions
│   ├── App.tsx                   # Main React Application
│   ├── index.css                 # CSS Theme & styling rules
│   └── main.tsx                  # Application entry point
```

---

*Pair programmed with Antigravity.*
