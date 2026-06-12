# WCBet.fun

Spread betting for the FIFA World Cup 2026 — points only, friends only, bragging rights forever.

Create a room, share its 6-letter code, and the room admin becomes the bookmaker: they post a
goal-spread for any of the 104 real tournament matches. Everyone picks a side before the lockout,
results settle automatically, and the room table tells the truth.

## Quick start

```bash
npm install
npm run seed:demo   # optional: demo room with history (demo@wcbet.fun / demo1234)
npm run dev         # http://localhost:3000
```

The SQLite database (`data/wcbet.db`) is created and seeded with the real WC2026 schedule on
first boot. Delete the file to reset everything.

## House rules

- **The line.** "Mexico +1" means Mexico must win by **more than** 1 goal for Mexico backers to
  win. Win by exactly the spread → push (nobody wins). Anything less → the other side wins.
  Spreads run 0–10 in half-goal steps; halves can never push.
- **The deadline.** Betting locks 6 hours before kickoff. Picks are editable until then and
  hidden from other members until the lock.
- **No pick = a loss.** Miss the deadline and you're docked like any loser.
- **Settlement.** Each winner collects one point per loser; each loser drops 1. On a push,
  bettors break even but no-shows still lose their point (nobody collects it).
- **Late joiners** are only on the hook for deadlines after they joined.

## Roles

- **Platform admin** — the *first account created* on the instance. Gets the **Results desk**
  (`/admin/results`) to enter final scores; saving a score settles every room with a line on
  that match. Re-saving a corrected score recomputes settlements safely.
- **Room admin** — whoever created the room. Posts and adjusts lines until each match's
  deadline. Changing a line clears existing picks so members can re-pick.

## Tech

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS v4 · SQLite
(better-sqlite3) · JWT session cookies (jose) · vitest.

The domain core — spread evaluation, settlement math, group standings — lives in pure,
unit-tested modules (`src/lib/settle.ts`, `src/lib/standings.ts`): `npm test`.

Tournament data (`data/worldcup2026.json`) is the real December 2025 draw and official match
calendar; kickoff times are approximate slot assignments. Edit the JSON and delete `data/wcbet.db`
to customize.
