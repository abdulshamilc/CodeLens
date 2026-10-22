# CodeLens 🔍

> **See inside your code.**

CodeLens is a modern, 100% offline-first developer suite and interactive self-learning platform. It opens up the JavaScript runtime to reveal what really happens behind the scenes—letting you step through execution, call stacks, scope chains, hoisting, and the event loop in real time. It also includes an infinite vector whiteboard for taking notes, sketching architecture diagrams, and brainstorming ideas.

---

## 🛠️ Included Tools

### 1. CodeLens DBV (Developer Background View)
An interactive runtime visualization engine that steps line-by-line through JavaScript code:
- **Interactive Code Editor**: CodeMirror 6 with syntax highlighting, line wrapping, breakpoints, and quick-load code examples.
- **Call Stack Inspection**: Visual frames showing active functions, parameters, and return sites.
- **Scope Chain & Closures**: Global, block, function, and closure scopes with highlighted live variables.
- **Microtask & Macrotask Queues**: Real-time visualization of Promises, `setTimeout`, `queueMicrotask`, and event loop dispatch.
- **Narration Bar**: Human-readable step explanations explaining *why* the runtime state transitioned.
- **Freely Resizable Split Panels**: Horizontal and vertical split layouts with customizable panel sizing.
- **Integrated Console**: Live evaluated stdout output docked cleanly below the code editor.

### 2. CodeLens Board (Whiteboard)
A smooth, infinite vector drawing canvas designed for rapid architectural diagramming and technical notes:
- **Rich Vector Tools**: Pen, pencil, marker, highlighter, shapes (rectangle, ellipse, arrow, line), and text.
- **Color & Stroke Palette**: Curated theme colors, customizable stroke widths, and dashed strokes.
- **Multi-Board Management**: Persistent storage across boards with thumbnail previews.
- **High-Res Export**: Export canvases directly to 2x Retina PNG, SVG vector, or JSON backup.
- **Zero-Data-Loss IndexedDB Persistence**: All boards and viewport states auto-save locally.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description | Tool |
|---|---|---|
| `?` | Toggle shortcut cheat sheet modal | Global |
| `D` | Toggle dark / light theme | Global |
| `Ctrl + 1` | Navigate to CodeLens DBV | Global |
| `Ctrl + 2` | Navigate to CodeLens Board | Global |
| `Ctrl + Enter` | Run / Analyze code | DBV |
| `→` | Step forward one line | DBV |
| `←` | Step backward one line | DBV |
| `Space` | Play / Pause execution | DBV |
| `R` | Reset interpreter to beginning | DBV |
| `P` / `B` / `M` / `H` | Pencil / Pen / Marker / Highlighter | Board |
| `R` / `O` / `A` / `L` | Rectangle / Ellipse / Arrow / Line | Board |
| `T` / `V` / `E` | Text / Select & Move / Eraser | Board |
| `Ctrl + Z` / `Ctrl + Shift + Z` | Undo / Redo | Board |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/abdulshmilc/CodeLens.git

# Enter the project directory
cd CodeLens

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Building & Testing
```bash
# Run unit tests (interpreter engine + data migration)
npm test

# Type check and build production PWA bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📱 PWA & Offline Support

CodeLens is configured as a standalone Progressive Web App (PWA):
1. **Offline Availability**: All assets, scripts, and fonts are cached by Workbox under cache ID `codelens`.
2. **Install to Desktop / Mobile**: Click the browser's install button in the address bar to install CodeLens as a standalone app.
3. **Testing Offline Mode**:
   - Open Chrome DevTools (`F12`) → Network tab.
   - Set the throttling dropdown to **Offline**.
   - Reload the page (`Ctrl + R`) — the entire application boots and functions with zero internet connection.

---

## 🔄 Migration from DevToolbox

CodeLens automatically detects and safely migrates all previous user data from **DevToolbox**:
- **Automatic Execution**: The migration module (`src/shared/storage/migrateFromDevToolbox.ts`) runs once at startup before any store initializes.
- **Zero Data Loss**:
  - `devtoolbox-theme` → `codelens-theme`
  - `dbv-layout-v3` / `dbv-layout-v2` → `codelens-dbv-layout`
  - `devtoolbox_whiteboard_state` → `codelens_whiteboard_state` (IndexedDB)
  - `dbv-last-session` → `codelens-dbv-last-session` (IndexedDB)
- **30-Day Safety Net**: Old keys are preserved intact during migration. If migration encounters any issue, fallback loaders continue serving the original data safely.
- **Backup Interoperability**: Whiteboard backups exported under earlier DevToolbox versions can be imported without errors.

---

## 📁 Project Structure

```
CodeLens/
├── public/                 # PWA icons, manifest assets, redirects
│   ├── favicon.svg
│   ├── masked-icon.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── app/                # App shell, navigation, theme, router, shortcuts
│   │   ├── CodeLensLogo.tsx
│   │   ├── HomePage.tsx
│   │   ├── TopBar.tsx
│   │   └── router.tsx
│   ├── shared/             # Storage keys registry & migration module
│   │   └── storage/
│   │       ├── keys.ts
│   │       ├── migrateFromDevToolbox.ts
│   │       └── migrateFromDevToolbox.test.ts
│   ├── tools/
│   │   ├── dbv/            # CodeLens DBV: AST interpreter & step visualizer
│   │   │   ├── engine/     # Acorn AST parser & runtime step generator
│   │   │   ├── components/ # Zone layouts, CallStack, EventLoop, Scopes
│   │   │   └── store/      # Zustand store for execution & layout
│   │   └── whiteboard/     # CodeLens Board: Infinite vector whiteboard
│   │       ├── components/ # Toolbar, Canvas, Export modal
│   │       ├── store/      # Zustand store with IDB persistence
│   │       └── utils/      # Rendering engine & vector exports
│   └── main.tsx            # Entry point with PWA registration & migration hook
├── vite.config.ts          # Vite build config with PWA & Workbox setup
├── vitest.config.ts        # Vitest test suite runner config
└── package.json            # Project dependencies and metadata
```

---

## 👤 Author

Created with ❤️ by **Abdul Shamil**  
LinkedIn: [abdul-shamil-85b7681a8](https://www.linkedin.com/in/abdul-shamil-85b7681a8)
