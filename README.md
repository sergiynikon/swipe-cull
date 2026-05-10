# PhotosCleaner

A personal iPhone app for cleaning up an overgrown camera roll using a Tinder-style swipe deck. Swipe left to mark for deletion, right to keep. Decisions persist across sessions, and a single batch delete at the end finishes the job.

Built with React Native + Expo. Designed to run inside Expo Go — no Apple Developer account required.

## Screenshots

<p align="center">
  <img src="screenshots/delete.jpg" width="320" alt="Swipe left to delete" />
  <img src="screenshots/keep.jpg" width="320" alt="Swipe right to keep" />
</p>

## Quick start

**Prerequisites:** Node.js 20+, an iPhone on the same Wi-Fi, the free **Expo Go** app from the App Store.

```powershell
npm install
npx expo start
```

Open Expo Go on the iPhone, scan the QR code, grant **Full Photo Library** access on first run.

If you see `[runtime not ready]` or module-resolution errors after a dependency change, restart with `npx expo start --clear`.

## Features

- **Swipe deck** — stacked-card UI, left to delete / right to keep, with undo.
- **Photos and videos** — inline video playback with tap-to-pause and replay.
- **Pinch-to-zoom** — Instagram-style focal zoom; drag with two fingers to pan.
- **Persistent progress** — decisions saved across sessions; the deck auto-skips items you've already reviewed.
- **Batch delete** — one iOS confirmation at the end, with the option to deselect items before deletion.

## Tech stack

- **Expo SDK 54** managed workflow
- **TypeScript** end-to-end
- **expo-media-library** — camera-roll access and batch delete
- **expo-image**, **expo-video**, **expo-video-thumbnails** — media rendering
- **expo-file-system** — sandbox copy fallback for restricted video paths
- **react-native-reanimated 4** + **react-native-gesture-handler** — gestures and animations
- **@react-native-async-storage/async-storage** — decision persistence
