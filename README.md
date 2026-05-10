# PhotosCleaner

A Tinder-style swipe app for cleaning up your iPhone camera roll. Swipe **left** to mark for deletion, **right** to keep. At the end of a session, all marked items are deleted in a single iOS-native confirmation.

Built with React Native + Expo SDK 54. No Mac required to build (uses EAS Build cloud).

## What this does

- Loads photos and videos from your camera roll, newest first.
- Stacked-card swipe deck with rotation, snap-back, and KEEP / DELETE badges.
- Undo last swipe.
- Single batch delete at end of session — iOS shows its own "Delete N items?" dialog (mandatory, can't be skipped).

## One-time setup on your Windows PC

1. **Install EAS CLI** (already have Node 24+):
   ```powershell
   npm install -g eas-cli
   ```
2. **Log in** with the same Apple ID you'll use to sign the app:
   ```powershell
   eas login
   ```
3. **Configure project** (only the first time — picks an Expo project ID):
   ```powershell
   eas init
   ```

## Build the iOS binary (free Apple ID)

```powershell
eas build --profile development --platform ios
```

EAS will:
- Ask for your Apple ID credentials (free Apple ID is fine).
- Generate a provisioning profile and certificate automatically.
- Build the `.ipa` in their cloud (10–20 min).
- Give you a download URL when done.

> The `development` profile produces a dev-client binary so you can hot-reload JS changes without rebuilding. For a fully self-contained build (no Metro dev server), use `--profile preview` instead.

## Install on your iPhone (Sideloadly, on Windows)

1. Install **Apple iTunes** from [apple.com](https://www.apple.com/itunes/) — Sideloadly needs Apple's USB drivers. **Do not** use the Microsoft Store version.
2. Install **Sideloadly** from [sideloadly.io](https://sideloadly.io).
3. Connect iPhone via USB and trust the computer.
4. In Sideloadly:
   - Drag the `.ipa` you downloaded from EAS into the window.
   - Enter your Apple ID.
   - Click **Start**. Sideloadly will sign and install it.
5. On the iPhone: **Settings → General → VPN & Device Management** → trust the developer cert under your Apple ID.
6. Launch PhotosCleaner from the home screen, grant photo access on first run.

> Free Apple ID certificates expire after **7 days**. Re-run Sideloadly with the same `.ipa` to re-sign — no rebuild needed unless you changed native dependencies.

## Iterate without rebuilding

Once the dev client is installed, you can change JS/TS and reload over Wi-Fi:

```powershell
npx expo start --dev-client
```

On the same Wi-Fi, the dev-client app on your iPhone will pick up the bundle. Edit any file under `src/`, save, and the app reloads. You only need to re-run `eas build` when adding a native dependency or changing `app.json`.

## Project layout

```
App.tsx                          Root: permission gate + GestureHandlerRootView
index.ts                         Entry point (registers root, imports gesture-handler)
app.json                         Expo config (iOS bundle ID, permission strings, plugins)
eas.json                         EAS Build profiles
src/
  screens/
    PermissionScreen.tsx         Permission request / Open Settings fallback
    DeckScreen.tsx               Composes header + deck + confirm sheet
  components/
    MediaCard.tsx                One photo or video card (with video thumb)
    SwipeDeck.tsx                Gesture-driven card stack (Reanimated 4)
    HeaderBar.tsx                Counter + undo + finish buttons
    ConfirmDeleteSheet.tsx       Modal with thumbnails + batch delete
  hooks/
    useAssets.ts                 Paginated MediaLibrary fetch (page size 50)
    useDecisions.ts              Reducer for swipe history + undo
  lib/
    media.ts                     MediaLibrary + VideoThumbnails wrappers
```

## Things to know

- **iOS forces the delete dialog.** No way to suppress. The app collects all left-swipes and triggers it once at the end.
- **iCloud-only photos** may pause briefly the first time they're shown — `MediaLibrary.getAssetInfoAsync` triggers the download.
- **Live Photos / Bursts** are single assets to MediaLibrary; deleting removes the entire stack.
- **Reanimated 4** + `react-native-worklets` is auto-handled by `babel-preset-expo` — no custom `babel.config.js` needed.
- **Free Apple ID limit**: max 3 sideloaded apps signed at once.

## Upgrading to a paid Apple Developer account later

When you're ready to stop the 7-day re-sign cycle:
1. Pay the $99/yr at developer.apple.com.
2. Re-run `eas build --profile preview --platform ios` — EAS will pick up the paid team automatically.
3. Install via TestFlight or direct ad-hoc URL. App stays installed for a year.

No code changes required.
