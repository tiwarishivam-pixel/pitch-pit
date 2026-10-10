# Pitch Pit
Live AI investor show and pitch evaluator. Three Claude-powered investors question your startup out loud, make or refuse offers, then an analyst writes a scored report. Node + Express + socket.io, no build step.

    cp .env.example .env     # add ANTHROPIC_API_KEY (and GEMINI_API_KEY for Gemini Live voice)
    npm install && npm start
    cloudflared tunnel --url http://localhost:3000   # put the link in PUBLIC_URL, restart

- **Stage** (big screen, Chrome): `/stage`. Fill in the pitch sheet, hold SPACE to talk or type. QR code and room code are on the right; phones open `/vote?room=CODE`.
- **Host keys** on the stage: N new round, K skip the current wait, V reset votes.
- **Amounts** are in rupees lakh (100 lakh = 1 Cr). Leaderboard is saved to `leaderboard.json`.

## How it works
- **Investors**: one Claude call per turn (`MODEL`), streamed. They get your pitch sheet, the full transcript and their own private notes, so questions quote what you actually said. Honest mode keeps the humour light; Show mode adds drama.
- **Report**: after the decision a second call (`REPORT_MODEL`) scores six dimensions, names the riskiest assumption, estimates a fair valuation range and proposes three experiments.
- **Voice out**: Gemini Live (`GEMINI_LIVE_MODEL`, default `gemini-3.1-flash-live-preview`) speaks each line in a per-investor voice. The investor's current mood steers the delivery. Falls back to Edge neural voices, then the browser voice.
- **Voice in**: the mic streams to Gemini Live transcription (`GEMINI_STT_MODEL`). Without a Gemini key it uses the browser's speech recognition.
- **Orbs**: `public/voice-orb.js` draws a live orb per investor (thinking, speaking) and for your mic (listening).
- Set `VOICE_ENGINE=edge` to skip Gemini. The server log says which voice engine and LLM are active at start.
