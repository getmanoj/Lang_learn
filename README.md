# Simple Web App

This is a minimal Node + Express app that serves a static frontend (HTML/CSS/JS) and exposes a tiny API endpoint at `/api/time`.

Quick start

1. Install dependencies

```bash
cd "/Users/chandman/AI APPS/simple web app"
npm install
```

2. Run tests

```bash
npm test
```

3. Start the server

```bash
npm start
```

Open http://localhost:3000 in your browser and click "Get Server Time".

Files

- `server.js` - Express server
- `public/` - Static frontend
- `package.json` - project manifest

Next steps

- Add more API endpoints
- Add a frontend framework (React/Vue) if needed
- Add CI config to run tests on push

Dutch Learning App

This project contains a browser-only Dutch learning app under `public/`.

Features added:
- JSON editor (single source of truth for sentences)
- Import/Export of your sentence JSON
- Sentences tab: fill-in-the-blanks sessions with word bank and translation toggle
- Flashcards: auto-generated from sentence JSON, mark known / needs review
- Memorise tab: Rapid Reveal, Type-to-Learn, and Timed Sprint modes
- Progress tracking stored in browser localStorage

Data storage
- Sentences and progress are stored in your browser (localStorage). Use Import/Export for backups.

Open the app
1. Start server: `npm start`
2. Open http://localhost:3000

You can edit the JSON in the left panel or import a JSON file matching the required structure (array of sentence objects). The file format example is in the editor by default.

If you'd like, I can add an option to persist progress to a small backend or add more detailed charts.
