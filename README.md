# STAMP

A digital block-printing studio: carve your own stamp, ink it, and press it
(*ka-chunk*) onto an open, infinite canvas — then turn a single carved motif into
a flawless seamless repeat. Each press carries a touch of handmade wobble (slight
rotation, position jitter, ink-coverage variance), so no two impressions are
identical. See [STAMP.md](./STAMP.md) for the full vision and art direction.

Built with Vite + TypeScript and a Canvas 2D rendering engine. No framework, no
runtime dependencies.

## Run

```bash
npm install      # install dev tooling (Vite, TypeScript)
npm run dev      # start the dev server
npm run build    # type-check and produce a production build in dist/
```

## Modes

- **Carve** — gouge your block with V/U/liner/scoop tools. Carved areas stay
  blank; raised areas print. Undo, fill, or clear at any time.
- **Press** — click the canvas to stamp the current block; drag to repeat-stamp
  along a path. A soft ghost of the stamp follows the cursor so you can see what
  and where you'll press. Pick the ink color, stamp size, and re-ink when faint.
- **Library** — load any of the curated hand-cut motifs onto your block, then
  press or keep carving.
- **Pattern** — lay your motif down as a seamless repeat (grid, half-drop, brick,
  mirror, or radial), then fill the view or export a single tile.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` / `2` / `3` / `4` | Switch to Carve / Press / Library / Pattern |
| `Cmd/Ctrl` + `Z` | Undo — the carve in Carve mode, otherwise the last press |
| `Backspace` / `Delete` | Pop the last impression |
| `R` | Re-ink the block |
| `Space` + drag | Pan the canvas |
| Scroll | Zoom (pinch / `Ctrl` + scroll also zoom) |

Shortcuts are ignored while typing in an input field.
