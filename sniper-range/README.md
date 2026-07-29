# DEAD EYE — Desert Range

A long-range bottle-shooting game. You are prone behind a weathered rail on a
Mojave firing lane, looking through a scope at glass, cans, clays and dynamite
staged on benches from 26 m to 132 m out. Rounds drop and drift; the scope is
zeroed at 60 m and everything past that is on you.

Everything on screen is drawn at runtime — the desert, the scope, the rifle and
the hands are all canvas vector work. No image, audio or font files ship with
the game.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle in dist/
npm run preview
```

## Controls

| | Desktop | Touch |
|---|---|---|
| Aim | move mouse (pointer-locked) | drag anywhere |
| Fire | left click / `Space` | tap |
| Reload | `R` | reload pad, bottom left |
| Magnification | wheel / right click / `Z` | scope pad, bottom centre |
| Hold breath | `Shift` | — |
| Pause | `Esc` / `P` / the × | the × |

Clicking the canvas grabs the pointer. Releasing it (`Esc`) pauses the run.

## How it plays

A run is 45 seconds. Every hit buys 0.6 s, clearing a wave's quota buys 12 s,
and the clock is the only thing that ends you.

**Targets**

| | Points | Notes |
|---|---|---|
| Bottle | 100 | hitting the neck instead of the body pays ×1.6 |
| Can | 60 | small, often sliding |
| Gold bottle | 300 | glints, worth chasing |
| Clay | 250 | launched across the range from wave 2 |
| Dynamite | 150 | detonates and clears everything inside 4.2 m |
| Blue barrel | **−250** | marked with an X. Do not shoot it. |

Score scales with distance (`1 + range/80`) and with your streak (up to ×2.68 at
thirteen straight). A miss into the dirt breaks the streak.

**Shooting**

Muzzle velocity is a deliberately slow 320 m/s, so ballistics are a real part of
the game rather than decoration:

- **Drop.** Zeroed at 60 m. At 108 m you need about 2.3 mil of holdover, at
  132 m about 3.3 — count down the mil dots on the vertical post. The number
  floating under the reticle is the range to whatever you are pointing at.
- **Wind.** Rerolled each wave, shown in the range card. The red tick on the
  horizontal post is where the round will actually land, so put *the tick* on
  the bottle, not the crosshair.
- **Breath.** The reticle wanders. `Shift` steadies it to a tremor for about
  4.5 seconds, then you have to let it recover.
- **Bolt.** 0.62 s between shots, five rounds, 2.1 s to reload.

Impacts arrive late and muffled with distance — a 130 m bottle breaks about
0.4 s after the shot, and you hear it as a thin, filtered crack.

## How it is built

```
src/
  core/      math, seeded noise, procedural WebAudio, input, optional assets
  game/      camera + projection, ballistics, targets, world, particles, rules
  render/    scene painter, scope optics, rifle and hands
  ui/        DOM heads-up display and the spotter radar
```

The camera sits fixed at the origin at eye height and only rotates, so the
projection is a plain yaw/pitch rotation plus a perspective divide
(`Camera.project`). The frame is painted twice: once at 46° for the whole
screen, then again at the current magnification clipped to a circle for the
scope glass. Both passes share a principal point, so the reticle centre and the
muzzle line agree exactly.

A few things are worth knowing if you go editing:

- Anything sized in screen space will look wrong inside the scope, because the
  inset is the same world at a much longer focal length. Haze bands, the sky
  gradient and the horizon seam are all sized from `view.f` for this reason —
  see the comments in `render/scene.ts`.
- The ground is one gradient with stops sampled from real ground depth, not a
  stack of bands. At 23× the band edges showed as arcs across the glass.
- `Game.update` is the only place the simulation advances; rendering reads state
  and never mutates it.
- `window.deadEye` is the live `Game` instance, handy for tuning from the
  console.

## Art

The game needs no art files, but every drawn element has a slot for a painted
replacement — drop a PNG into `public/art/` with the right name and it is
picked up on the next load. See [ASSETS.md](./ASSETS.md) for the file list,
sizes and generation prompts.
