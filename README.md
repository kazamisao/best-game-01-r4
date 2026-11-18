# NEON ROUNDUP

[![Competition](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/kazamisao/best-game-01-r4/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/kazamisao/best-game-01-r4/reward.svg)](https://make.fun/bounty/best-game-01)

An original arcade game for [make.fun's best-game-01](https://make.fun/bounty/best-game-01):
rogue drones have overrun the grid, and you wrangle them with a lasso made of light.

**Draw a closed loop with the mouse around drones of one colour to capture them.**
Same-colour loops pay 100 points a drone and build a combo multiplier (up to x8).
Gold drones are wild and worth 300. Mixed colours pay a flat 40 a drone and break
the combo. And if a spiky **glitch** drone is inside your loop, the lasso snaps:
no points, combo gone, and a short stun while it recharges. You have 90 seconds
and seven escalating waves. Bigger loops catch more — and risk more.

## Play it

Open `game/index.html` in a desktop browser (or serve the folder with any
static file server). It runs fully offline; there is nothing to install.

- **Mouse drag** — draw the lasso; bring the tail back to the start to close it
- **Space / click** — start • **R** — restart • **P** — pause • **M** — sound on/off

## How it is built

Vanilla JavaScript on a single canvas — no engine, no build step, no assets:
every visual is drawn in code and every sound is synthesised with WebAudio.

| File | Job |
| --- | --- |
| `game/src/geometry.js` | Lasso geometry: point-in-polygon, area, closure |
| `game/src/drones.js` | The drone field: seeded RNG, wave table, drift and bounce |
| `game/src/lasso.js` | The energy lasso: drawing, closure and area rules |
| `game/src/scoring.js` | Score, combos and capture resolution |
| `game/src/audio.js` | WebAudio synth sound effects |
| `game/src/render.js` | All canvas drawing: drones, HUD, title and results |
| `game/src/shots.js` | Deterministic screenshot scenes (`?shot=<scene>&seed=<n>`) |
| `game/src/main.js` | Input, the screen state machine and the game loop |

The pure game logic is covered by a node test suite (32 tests):

```sh
node --test tests/*.test.js
```

`main.ts` (Node 22) hands the entry in: it copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-game.ts`, exactly as the competition's gate expects.

## License

MIT — see `LICENSE`.
