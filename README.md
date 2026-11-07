# Fuel & Lift

A simple, modern calorie + macro tracker with gym routines and a workout logger. English and Spanish (switch in Settings; it picks your browser language the first time).
No build step, no accounts, no dependencies: plain HTML/CSS/JS, data stored in your browser (localStorage).

## Run it

Open `index.html` directly in a browser, or serve the folder (recommended so the font loads and the URL stays stable):

    npx serve .          # or: python -m http.server 8080

Then open the printed URL. On a phone, open the same URL and use "Add to Home Screen" for an app-like experience.

Note: browsers only allow camera access on `localhost` or HTTPS. To scan with your phone's camera while the app is served from your PC over plain HTTP, either expose it over HTTPS (for example with `npx localtunnel --port 3000`), or host the three files on any static HTTPS host (GitHub Pages, Netlify, etc.). Typing the barcode number works everywhere.

## What is in it

- **Today**: calorie ring vs goal, protein / carbs / fat meters, meals (breakfast, lunch, dinner, snacks). Browse previous days with the arrows.
- **Foods**: library of ~60 common foods (per 100 g) plus your own. Enter label values per 100 g or per serving.
- **Barcode scanner**: tap the scan icon in the food search (or Scan on the Foods tab), point the camera at a product, and the nutrition facts are fetched from Open Food Facts (good coverage of Chilean products). You can also type the number under the barcode. Unknown products open an empty form so you can copy the label; the barcode is saved with the food, so next time it is found instantly.
- **Gym**: routines (Push / Pull / Legs included), workout logger with previous-session hints, rest timer, history with volume and "repeat" button.
- **Progress**: body weight trend, calories vs goal for the last 14 days, 7-day stats, personal bests.
- **Settings**: goals (manual or calculated from your profile with Mifflin-St Jeor), kg/lb, rest timer length, theme, JSON export/import.

## Hosting it for friends

It is three static files, so any static host works. Each person's data stays in their own browser (there are no accounts), so sharing the link is all it takes.

- **GitHub Pages** (free, HTTPS, updates on every push): push this folder to a GitHub repository, then in the repo go to Settings > Pages and choose "Deploy from a branch", branch `master`, folder `/ (root)`. The app appears at `https://<user>.github.io/<repo>/`.
- **Netlify Drop** (free, no account needed to try): open https://app.netlify.com/drop and drag this folder onto the page. You get an HTTPS link right away.

HTTPS matters because browsers only allow the camera (barcode scanner) on HTTPS or localhost.

## Files

- `index.html` - shell
- `styles.css` - design tokens (light/dark), layout, components
- `app.js` - state, views, charts, event handling
