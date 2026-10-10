# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a founder testing an early-stage startup idea (Indian context: rupees, lakh and crore). They open a room on their own laptop, pitch out loud, and want honest, specific feedback on whether the idea holds up. Secondary: audience members who join the same room from a phone (QR or link) or a second laptop to react and vote, and event hosts who project a room to a crowd. Confirmed answer: the founder testing their idea comes first; the live show is the wrapper around the evaluation.

## Product Purpose

Pitch Pit lets anyone create a pitch room (like a Google Meet link), pitch to three AI investors with distinct personalities by voice, get questioned round by round, receive offers or refusals, and leave with a scored evaluation report. Success is the founder walking away knowing the single riskiest assumption in their idea and the next tests to run. Every pitch is evaluated separately, in its own room.

## Positioning

The evaluation is a live conversation with three investor agents who answer what the founder actually said, followed by a separate analyst report grounded in the transcript. Rooms are independent and disposable, so one person's pitch never touches another's. The Indian setting (rupees, lakh/crore, Hinglish) is a real part of the mechanism, not decoration.

## Operating Context

Voice-first: the founder talks (push or toggle to talk) and the investors answer aloud in distinct voices; typing is always available as an alternative. Used in Chrome on a laptop; sometimes projected to a room; audience on phones scanning a QR code. Rooms are created from a lobby, joined by 6-letter code or link, and cleaned up after idle time. Each finished pitch is saved as its own shareable report.

## Capabilities and Constraints

- Room flow: first reactions to the ask, a timed pitch (60 to 180 seconds), three grilling rounds (each investor asks one question per round), decisions (each investor is OUT or makes an offer), one counter-offer, accept, scorecard and report.
- Investors: Vikram "The Calculator" Rao (unit economics), Zara "Hype Queen" Mehta (customer and brand), Uncle-ji (trust and cash, speaks Hinglish). Replies under about 40 words, in character; criticism targets the idea, never the person.
- Two modes per pitch: Honest feedback and Show mode.
- Amounts are in rupees lakh (100 lakh = 1 crore); the pitch sheet shows the implied valuation.
- Anyone can create a room; there are no accounts. The server caps concurrent rooms and drops idle ones because every room spends model credits.
- Models: Claude for investor turns and the report; Gemini Live for investor voices and live transcription of the founder's mic. Voice falls back to Edge neural voices, then the browser voice.
- Reports are stored per pitch on the server (latest 300) and viewable at a shareable link. The leaderboard is global and persisted.
- Undecided: accounts, human judges, an admin overview of all rooms (the user chose one AI report per room only for now).

## Brand Commitments

The name is Pitch Pit. The three investor characters and their names are fixed. "Roast the idea, never the person" is binding.

## Evidence on Hand

No real customers, testimonials or benchmarks exist. The leaderboard and hall of fame start empty and must never be seeded with invented pitches; empty states should invite the first pitch.

## Product Principles

1. The founder's evaluation comes first; the show is the wrapper, never the point.
2. Specific over theatrical: every investor line and every score should trace back to something the founder actually said.
3. Joining is one link or one code; rooms are independent and disposable.
4. Be honest about missing evidence: when the founder gave no number, say so instead of guessing.
5. Never fabricate demo data; an empty state is an invitation to act.

## Accessibility & Inclusion

Voice is the primary input, so a typed alternative must always work and every action must be keyboard operable. The stage may be viewed from across a room on a projector, so audience-critical text must be large. Respect reduced motion.
