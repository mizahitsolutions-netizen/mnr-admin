# mnr-dashboard (frontend-only)

This is the frontend-only version of the mnr-dashboard using Firebase Firestore and Cloudinary unsigned uploads.

## Setup
1. Create a Firebase project and copy your Firebase config into `src/firebase.js` (replace placeholders).
2. Create an unsigned upload preset in Cloudinary and set `src/settings.json` values for cloud name and preset.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run locally:
   ```bash
   npm run dev
   ```

The app will auto-seed Firestore (if enabled in settings.json) once when it first runs.
