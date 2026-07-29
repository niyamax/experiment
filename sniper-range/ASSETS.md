# Optional art

The game ships with no image files and looks complete without them — every slot
below has procedural vector art behind it. Supplying a PNG is an upgrade, not a
requirement, and you can supply one, some, or all of them.

## How to use these

1. Generate the image.
2. Save it in `public/art/` under the exact filename in the table.
3. Reload. The renderer picks it up automatically; no code change.

**Every file must be a PNG with a real alpha channel and no background.** The
renderer scales art to the object's true world size, so the artwork must be
cropped tight to the silhouette — a 15% transparent margin makes a bottle read
as 15% too small at every range. The one exception is `skyline.png`, which is a
full-bleed strip.

Delete a file to fall back to the drawn version.

| File | Pixels | Stands in for |
|---|---|---|
| `skyline.png` | 4096 × 512 | the three mesa layers |
| `rail.png` | 2048 × 640 | the foreground shooting rail |
| `bench.png` | 768 × 512 | every target bench |
| `bottle.png` | 256 × 768 | green bottle, 100 pts |
| `bottle-gold.png` | 256 × 768 | gold bottle, 300 pts |
| `can.png` | 256 × 448 | tin can, 60 pts |
| `clay.png` | 512 × 512 | clay pigeon, 250 pts |
| `tnt.png` | 384 × 576 | dynamite bundle, 150 pts |
| `barrel.png` | 512 × 768 | blue hazard barrel, −250 pts |

## Style guide for whoever or whatever draws these

Everything shares one look, or the frame falls apart:

- Stylised realism, like a modern mobile shooter — readable shapes with real
  material response, not photobashing and not flat cartoon.
- **Midday desert sun from the upper left**, roughly 40° above the horizon.
  Warm highlights on the upper-left of every form, cool bounced light on the
  lower-right, short hard shadows.
- Palette: bleached sand `#c9a674`, sun-warmed timber `#a0703c`, dry sage
  `#5c6a42`, hazy sky `#7eb2de`.
- Objects are seen straight on from a shooter's eye line, at 26–132 m through
  glass. Keep detail chunky; fine engraving disappears past 60 m.
- No cast shadow baked into the art. The renderer draws contact shadows itself,
  and a baked one would float.

## Prompts

Paste these into whatever image model you use. Each one already carries the
shared style, so they can be run independently and still match.

**skyline.png** — 4096 × 512, no alpha needed

> A seamless horizontal panorama of a Mojave desert horizon, 180 degrees wide,
> painted in stylised realism for a mobile game backdrop. Layered flat-topped
> red-rock mesas and buttes receding into pale blue-grey atmospheric haze, three
> depth layers, the nearest warm ochre and the farthest almost dissolved into
> sky. Midday sun high and to the left. The bottom edge of the image is exactly
> the horizon line — bare desert floor, no foreground objects, no sky above the
> mesas, no clouds. Clean, uncluttered, wide letterbox composition.

**rail.png** — 2048 × 640, transparent above the rail

> A weathered horizontal wooden shooting rail seen from directly behind and just
> above, as the foreground brace of a first-person rifle game. Two rough sun-
> bleached pine planks, grey-brown with visible grain, splits and old nail
> heads, running the full width of the image. Strong midday sun from the upper
> left, warm top edges, cool shadow underneath. Transparent background above and
> below the timber. Straight-on view, no perspective vanishing, no rifle, no
> hands.

**bench.png** — 768 × 512, transparent

> A rustic desert shooting bench built from rough sun-bleached timber: one
> horizontal plank top on two splayed legs, front elevation, seen straight on
> from eye level. Grey-brown weathered wood with visible grain and old bolt
> heads. Midday sun from the upper left. Isolated on a fully transparent
> background, cropped tight to the timber, standing on the bottom edge of the
> frame. No ground, no cast shadow, no bottles.

**bottle.png** — 256 × 768, transparent

> A single vintage green glass bottle, straight-on side view, isolated on a
> transparent background. Long neck, rounded shoulder, metal cap, a torn cream
> paper label around the middle. Slightly dusty, sun-lit from the upper left,
> with a bright vertical specular highlight down the left of the body and warm
> light glowing through the glass on the right. Stylised realism for a mobile
> game. Cropped tight to the bottle, standing on the bottom edge. No ground,
> no cast shadow, no reflections.

**bottle-gold.png** — 256 × 768, transparent

> The same vintage bottle, but in polished amber-gold glass with gilded trim
> and a gold foil cap, catching the midday sun with strong warm specular
> highlights and a faint golden glow through the glass. Straight-on side view,
> isolated on a transparent background, cropped tight, standing on the bottom
> edge. No ground, no cast shadow.

**can.png** — 256 × 448, transparent

> A dented red tin can, straight-on side view, isolated on a transparent
> background. Bare metal rims top and bottom, faded red paint scratched down to
> steel, a couple of old bullet dents. Sunlit from the upper left with a bright
> metallic highlight down the left side. Stylised realism for a mobile game.
> Cropped tight, standing on the bottom edge. No ground, no cast shadow.

**clay.png** — 512 × 512, transparent

> A bright orange clay pigeon target disc seen from a low three-quarter angle in
> flight, isolated on a transparent background. Domed top, rimmed edge, matte
> fluorescent orange with a black underside. Sunlit from the upper left.
> Stylised realism for a mobile game. Cropped tight to the disc, centred in the
> frame. No motion blur, no smoke, no cast shadow.

**tnt.png** — 384 × 576, transparent

> A bundle of three red dynamite sticks bound with dark twine, standing
> upright, straight-on view, isolated on a transparent background. Waxy red
> paper wrappers with faded stencilled lettering, a short green fuse rising from
> the top of the middle stick. Sunlit from the upper left. Stylised realism for
> a mobile game. Cropped tight, standing on the bottom edge. No flame, no
> sparks, no ground, no cast shadow.

**barrel.png** — 512 × 768, transparent

> A blue steel oil drum standing upright, straight-on front view, isolated on a
> transparent background. Three raised ribs around the body, chipped and
> scratched industrial blue paint with rust bleeding at the seams, and a large
> white painted X across the middle as a do-not-shoot marker. Sunlit from the
> upper left with a broad metallic highlight down the left side. Stylised
> realism for a mobile game. Cropped tight, standing on the bottom edge. No
> ground, no cast shadow.
