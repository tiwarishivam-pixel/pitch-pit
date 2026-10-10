---
target: Pitch Pit stage and vote pages
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
target_identity: "file:C:\\Users\\Manish Tiwari\\Downloads\\pitch-pit\\pitch-pit\\public\\stage.html"
target_fingerprint: "sha256:6bc9a34448e2d1b6754ce98e39e540549ef214447558196bd3f8fb1c6e1301ae"
target_path: "C:\\Users\\Manish Tiwari\\Downloads\\pitch-pit\\pitch-pit\\public\\stage.html"
timestamp: 2026-10-10T11-51-42Z
slug: public-stage-html
---
Method: dual-agent (A: design review - B: detector + source checks)

Design health 21/40 (Acceptable). 1 status 2, 2 real-world 3, 3 control 2, 4 consistency 2, 5 error prevention 1, 6 recognition 2, 7 efficiency 2, 8 minimalism 3, 9 recovery 2, 10 help 2.

Specificity: ~60% authored (lakh/Cr, Hinglish, stamps, mood faces), ~40% template (violet-navy gradient, gold accent, rounded tile grid + sidebar).

Priority issues
1. [P0] Keyboard and mic layer: autofocused textarea swallows Space; Space preventDefault kills button activation; N/K/V fire on Ctrl+V/K/N; mic permission requested mid-pitch; "Listening" before stream opens; hold-90s only mic path.
2. [P1] Offers: 22px amount, 13px condition, no implied valuation, one-click irreversible accept, inert offers look live.
3. [P1] Projection legibility and audience on-ramp: 13-15px status text, 62px timer, 148px QR covered during WAITING.
4. [P1] Report finale: 1500px / 11 boxes; "Your ask" bar plots valuation; DEAL beside 42/100; no take-home.
5. [P1] Phone: reactions vanish at decisions, no reconnect UI, silent tap cap, nickname unused.

Detector: 10 warnings; false positives: 3 low-contrast (print media leak), broken-image, pulsing-dot, 1 double count. Real: 4 gold glows, Instrument Sans, .mic.rec 3.24:1, .call b 4.28:1, sub-14px text, print contrast, missing aria-modal/focus mgmt, meters without roles, transcript live-region, infinite animations under reduced-motion.
