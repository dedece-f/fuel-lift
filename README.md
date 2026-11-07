# Fuel & Lift

A simple, modern calorie + macro tracker with gym routines and a workout logger. English and Spanish (switch in Settings; it picks your browser language the first time).
No build step, no accounts, no dependencies: plain HTML/CSS/JS, data stored in your browser (localStorage).

## Run it

Open `index.html` directly in a browser, or serve the folder (recommended so the font loads and the URL stays stable):

    npx serve .          # or: python -m http.server 8080

Then open the printed URL. On a phone, open the same URL and use "Add to Home Screen": the app installs with its own icon (it is a PWA), opens full-screen, and keeps working offline. When a new version is deployed, a "New version available" toast offers a reload.

Note: browsers only allow camera access on `localhost` or HTTPS. To scan with your phone's camera while the app is served from your PC over plain HTTP, either expose it over HTTPS (for example with `npx localtunnel --port 3000`), or host the three files on any static HTTPS host (GitHub Pages, Netlify, etc.). Typing the barcode number works everywhere.

## What is in it

- **Today**: calorie ring vs goal, protein / carbs / fat meters, meals (breakfast, lunch, dinner, snacks). Browse previous days with the arrows. Tap an entry to change its amount, copy a meal from the last day you logged it, or save a meal as a favorite and add it again in one tap.
- **Foods**: library of ~60 common foods (per 100 g) plus your own. Enter label values per 100 g or per serving. Search ignores accents ("platano" finds "plátano"), and typing a product name offers a text search on Open Food Facts.
- **Barcode scanner**: tap the scan icon in the food search (or Scan on the Foods tab), point the camera at a product, and the nutrition facts are fetched from Open Food Facts (good coverage of Chilean products). You can also type the number under the barcode. Unknown products open an empty form so you can copy the label; the barcode is saved with the food, so next time it is found instantly.
- **Gym**: routines (Push / Pull / Legs included), workout logger with previous-session hints, rest timer, history with volume and "repeat" button.
- **Progress**: body weight trend with a 7-day average, calories vs goal for the last 14 days, per-exercise top-set chart, 7-day stats, personal bests.
- **Settings**: goals (manual or calculated from your profile with Mifflin-St Jeor), kg/lb, rest timer length, theme, language, JSON export/import.
- **Account + cloud sync** (optional): sign in with email and password and your data follows you across devices. Works offline; changes sync when you are back online. See "Cloud sync" below to turn it on.

## Hosting it for friends

It is three static files, so any static host works. Each person's data stays in their own browser (there are no accounts), so sharing the link is all it takes.

- **GitHub Pages** (free, HTTPS, updates on every push): push this folder to a GitHub repository, then in the repo go to Settings > Pages and choose "Deploy from a branch", branch `master`, folder `/ (root)`. The app appears at `https://<user>.github.io/<repo>/`.
- **Netlify Drop** (free, no account needed to try): open https://app.netlify.com/drop and drag this folder onto the page. You get an HTTPS link right away.

HTTPS matters because browsers only allow the camera (barcode scanner) on HTTPS or localhost.

## Cloud sync (accounts across devices)

Sync is powered by Firebase (free tier is plenty for a group of friends). One-time setup, about 10 minutes:

1. Go to https://console.firebase.google.com, create a project (Analytics not needed).
2. **Build > Authentication > Get started > Sign-in method**: enable **Email/Password**.
3. **Build > Firestore Database > Create database**: pick a region close to you (e.g. `southamerica-east1`), start in **production mode**.
4. In Firestore, open the **Rules** tab and replace the rules with:

       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /users/{uid}/{document=**} {
             allow read, write: if request.auth != null && request.auth.uid == uid;
           }
         }
       }

   Publish. This means each person can only read and write their own data.
5. **Project settings (gear icon) > Your apps > Add app > Web** (`</>`). Give it a name, skip hosting, then copy the `firebaseConfig` object.
6. Paste it into `firebase-config.js` in this folder, replacing `null`:

       window.FUEL_LIFT_FIREBASE = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };

7. If the app is hosted on GitHub Pages, also go to **Authentication > Settings > Authorized domains** and add `<user>.github.io`.
8. Commit and push. Settings now shows an **Account** card where everyone can create their own login.

Notes:
- The config values are meant to be public; the security rules are what protect the data.
- Password resets use Firebase's built-in email, nothing else to configure.
- Each piece of data (settings, food library, each day's log, each workout) syncs separately with its own timestamp, so two devices only overwrite what actually changed.
- The first time you sign in on a device that already has local data while the account already has cloud data, the app asks which copy to keep.

## Tests

    npm test            # all suites
    npm test -- ui      # one suite: ui, barcode or sync

`tests/run.js` serves the folder and drives the real app in a headless Chrome/Edge (set `CHROME=/path/to/browser` if it is not found). The `ui` suite covers logging, foods, workouts, routines, progress and settings; `barcode` talks to the live Open Food Facts API (needs internet); `sync` runs the cloud sync engine against an in-memory stand-in for Firebase, including the first-sign-in choices and remote changes.

## Files

- `index.html` - shell
- `styles.css` - design tokens (light/dark), layout, components
- `app.js` - state, views, charts, event handling, barcode scanner, cloud sync
- `firebase-config.js` - optional Firebase config for cloud sync (null = local only)
- `manifest.webmanifest`, `sw.js`, `icons/` - PWA install + offline support
- `tests/` - headless browser test suites (`npm test`)
