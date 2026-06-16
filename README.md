# 🌊 FileFlow — Advanced Desktop File Manager

FileFlow is a premium, high-performance desktop application for **organizing**, **renaming**, and **converting** files. Built with a focus on clean design (shadcn/ui style), best-in-class architecture, and native speed.

---

## ✨ Key Features

### 📁 1. Smart File Organizer

- **Auto-Sorting**: Move or Copy files into categorized folders (Videos, Music, Images, Docs, etc.) based on their extensions.
- **Custom Rules**: Toggle categories or define your own organization patterns.
- **Safe Preview**: See exactly which files will move where before committing.
- **Progressive UI**: Real-time progress bars for large-scale operations.

### ✏️ 2. Professional Bulk Renamer

- **5 Power Patterns**:
  - **Sequential**: `movie_01.mp4`, `movie_02.mp4`...
  - **Prefix/Suffix**: Add text to the start or end of filenames.
  - **Find & Replace**: Batch replace strings within filenames.
  - **Date-Based**: Prepend creation/modification dates.
- **Conflict Detection**: Automatic warnings if two files would result in the same name.
- **Smart Undo**: One-click recovery if you make a mistake.

### 🔄 3. High-Speed File Converter

- **Powered by FFmpeg**: Supports all common formats (MP4, MKV, MP3, FLAC, etc.).
- **Quality Presets**: Choose between High, Medium, and Low quality for Video/Audio.
- **Batch Processing**: Queue up dozens of files and convert them simultaneously.
- **FFmpeg Integration**: Automatic detection of FFmpeg on your system.

---

## 🛠️ Technical Architecture

This application follows the **Electron Best Practices (2024)**:

- **Frontend**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS v4 + shadcn/ui inspired components.
- **State Management**: Zustand (Atomic, decoupled state for each feature).
- **Security**: Context-isolated Inter-Process Communication (IPC). No `nodeIntegration`.
- **Backend Flow**:
  - `Main Process`: Handles filesystem I/O, dialogs, and spawns FFmpeg child processes.
  - `Preload Bridge`: Securely exposes native APIs to the renderer.
  - `Renderer Process`: Smooth, 60fps UI using Framer Motion animations.

---

## 🚀 How to Run & Test

### 1. Prerequisites

- **Node.js**: v18 or later.
- **FFmpeg**: Required for the **Converter** feature.
  - **macOS**: `brew install ffmpeg`
  - **Windows**: `winget install ffmpeg`

### 2. Setup

```bash
# Install dependencies
npm install

# Run in development mode (with HMR)
npm run dev
```

### 3. Testing the features

1. **Organizer**:
   - Create a folder with mixed files (`.mp4`, `.mp3`, `.txt`).
   - Open FileFlow → Organizer.
   - Select the folder → Click **Preview**.
   - Observe the categorized breakdown, then click **Organize**.
2. **Renamer**:
   - Select a folder with files.
   - Select specific files in the list.
   - Change the pattern to "Sequential" or "Find & Replace".
   - Watch the live preview update. Click **Rename**.
   - Use **Undo Last** to restore original names.
3. **Converter**:
   - Add a few Vid/Audio files.
   - Select an output folder.
   - Choose a target format (e.g., `.mp4` → `.mkv`).
   - Click **Convert** and watch the progress bars.

### 4. Build for Production

```bash
# For macOS
npm run build:mac

# For Windows
npm run build:win
```

---

Built with ❤️ by Sithum Raigamage.
