# Pitch Pit

Pitch your startup idea out loud to three AI investors and get an honest evaluation. Anyone can open a room (like a Google Meet link), pitch, and share the room with an audience. Every pitch is evaluated separately and gets its own shareable report.

Node + Express + socket.io, plain HTML/CSS/JS, no build step.

## Run it locally

    cp .env.example .env     # add ANTHROPIC_API_KEY and GEMINI_API_KEY
    npm install
    npm start                # http://localhost:3000

Open `/`, press **Start a pitch room**, fill in the pitch card, and talk. Open the **Room panel** to get the QR code and invite link. Phones join at `/vote?room=CODE`; a second laptop can watch at `/stage?room=CODE`.

Without an Anthropic key the investors fall back to canned lines. Without a Gemini key the voices fall back to Edge neural voices, then the browser voice.

## How it works

- **Rooms:** `POST /api/rooms` creates an independent game with its own state, audience, votes and report. The creator's browser holds a host token; everyone else joins as audience (phone) or watcher. Idle rooms are dropped automatically and the number of live rooms is capped (`MAX_ROOMS`) because every room spends model credits.
- **Investors:** one Claude call per turn (`MODEL`), streamed. Each gets the pitch card, the full transcript and its own private notes, so questions quote what you actually said. Honest mode keeps the humour light; Show mode adds drama.
- **Report:** after the decisions a second call (`REPORT_MODEL`) scores six dimensions, names the riskiest assumption, estimates a fair valuation range and proposes three experiments. Each finished pitch is saved and viewable at `/report?id=...`.
- **Voice out:** Gemini Live (`GEMINI_LIVE_MODEL`) speaks each line in a per-investor voice, steered by the investor's mood.
- **Voice in:** the mic streams to Gemini Live transcription (`GEMINI_STT_MODEL`), or the browser's speech recognition without a key. Typing always works.
- Amounts are in rupees lakh (100 lakh = 1 crore).

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | investors and report | none (canned lines) |
| `GEMINI_API_KEY` | voices and mic transcription | none (Edge voices) |
| `MODEL` / `REPORT_MODEL` | Claude models | `claude-haiku-5-5` / `claude-sonnet-5-5` |
| `GEMINI_LIVE_MODEL` / `GEMINI_STT_MODEL` | Gemini models | `gemini-3.1-flash-live-preview` / `gemini-3.5-transcribe-live` |
| `VOICE_ENGINE` | set to `edge` to skip Gemini | gemini |
| `PUBLIC_URL` | base URL used in QR codes and links | `RENDER_EXTERNAL_URL`, else localhost |
| `MAX_ROOMS` | concurrent rooms | 40 |
| `DATA_DIR` | where `leaderboard.json` and `reports/` are stored | project folder |
| `PORT` | HTTP port | 3000 |

## Deploy

The app needs a long-running Node process (WebSockets and in-memory rooms), so it runs on a server host such as Render, Railway or Fly.io, not on Vercel's serverless functions.

**Render:** push this repo to GitHub, then in Render choose **New > Blueprint**, pick the repo (it reads `render.yaml`), and set `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` in the dashboard. Render provides the HTTPS URL, which the microphone needs. On the free plan the disk is ephemeral and the service sleeps when idle, so saved reports and the leaderboard reset on restart. Attach a disk and set `DATA_DIR` to its mount path to keep them.

API keys belong in the host's environment settings, never in the repo (`.env` is git-ignored).
