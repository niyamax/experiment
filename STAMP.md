# STAMP

**A digital block-printing studio where you carve your own stamp, ink it, and press it — onto a pattern, or directly into any document you bring.**

> Working title: **STAMP**. Alternate names to consider: *Relief*, *Press*, *Carve*, *Block*, *Inkblock*, *Lino*.

Submission concept for the **Figma × Contra "Config Makeathon"** (June 2026 · build with Figma Weave AI + the Figma design agent beta · $100K prizes).

---

## 1. The one-liner

You carve a rubber block by gouging away curls of material, roll on ink, and **press** it — *ka-chunk* — onto the page. Each press is slightly imperfect (light spots, smudges, a touch of rotation), and that handmade wobble is the whole charm. Then the AI does the one thing humans hate doing by hand: it turns your single carved motif into a **flawless seamless repeat** — and lets you stamp that motif into **any document you upload**.

It's a toy that's secretly a tool.

---

## 2. Why this wins

The Config Makeathon judges reward **craft, creativity, innovation, and clever use of the AI tools** — and they're allergic to "another app with buttons." STAMP scores on every axis:

| Judging axis | How STAMP delivers |
|---|---|
| **Craft** | A tactile, skeuomorphic carving-and-pressing interface that looks nothing like software. Ink physics, registration wobble, peeled-rubber curls. |
| **Creativity** | A centuries-old physical craft (lino/block printing) reborn as a delightful digital gesture. |
| **Innovation** | The AI doesn't generate the *art* for you — it solves the **boring** part (seamless tiling, recoloring, placement). The human keeps the authorship; the agent removes the friction. |
| **Clever AI prompts** | "Carve me a fern," "make this tile as a half-drop repeat," "place this stamp along every heading in my doc" — the agent reasons about *geometry and layout*, not just pixels. |
| **Shareability** | You walk away with a **real, usable artifact** — gift wrap, a fabric swatch, a poster, or a stamped-up version of your own résumé/zine/invite. |

**The design moat (un-promptable):** the value is in the *imperfection you authored by hand* — where the ink went light, the half-millimeter rotation, the rhythm of where you chose to press. A non-designer typing "block-print pattern" into an image model gets a flat, too-perfect texture. STAMP's output carries the fingerprint of a person who carved and pressed it. That handmade evidence is the thing a prompt can't fake.

---

## 3. The core experience

Four tactile stages. No menus where a gesture will do.

### Stage 1 — Carve
- The screen is a blank rubber/lino block, warm and matte, sitting on a workbench.
- You pick up a **gouge** (V-tool, U-tool, fine liner, broad scoop) and **drag** across the block.
- The cursor *peels away curls of rubber* that fall and pile at the edges (a small, satisfying mess).
- **Carved = blank (won't print). Raised = prints.** You're sculpting negative space.
- Pressure/speed affects line width; the gouge leaves a slightly ragged, handmade edge — never a vector-perfect line.
- Undo = "patch" a wrong cut with a fill tool (mimics re-gluing a sliver back, with a visible seam).

### Stage 2 — Ink
- Squeeze a blob of ink onto a glass slab; pick up the **brayer (roller)**.
- **Drag the brayer back and forth** to load it (it visibly glistens and gets tacky), then roll it across the raised areas of your block.
- Over-roll and ink **pools** in the carved grooves (gorgeous grungy bleed on the next press). Under-roll and you get a **ghostly, faded** impression.
- Pick the ink color (or a multi-color split-fountain gradient on the roller for advanced users).

### Stage 3 — Press
- Lift the inked block and **press it down** onto the paper: a weighty *ka-chunk*, a tiny puff, the impression lands.
- **Registration wobble is intentional** — each press has slight rotation, position jitter, and ink-coverage variance, so no two are identical.
- Re-ink when it goes faint. Press again and again to build:
  - a **grid** (tidy repeat),
  - a **scatter** (organic toss),
  - or **freehand** placement wherever you click.

### Stage 4 — Make it real (the AI moment)
This is where the **design agent** earns its keep:
- **Seamless repeat:** "Tile this." The agent computes a true edge-matched repeat — straight grid, **half-drop**, **brick**, **mirror/kaleidoscope**, or **radial** — so the pattern is production-ready with zero visible seams.
- **Recolor / colorways:** "Give me three colorways: sage, terracotta, indigo." Generates palette variants while preserving the carved structure and ink texture.
- **Productize:** "Wrap this onto gift paper / a tote / a notebook mockup," or export as a tiling PNG/SVG, fabric swatch, or wallpaper.

---

## 4. The big twist — **Stamp into any document**

STAMP isn't only a pattern playground. **Upload a document and stamp directly into it.**

### What you can upload
- A PDF, an image, a slide, a poster, a résumé, a zine spread, an invitation, a menu, a Figma frame, a webpage screenshot — anything with a layout.

### What you can do with stamps inside it
- **Manual placement:** drag your carved (or library) stamp anywhere on the page — a hand-printed flourish in a margin, a motif behind a heading, a border of repeated stamps along the edge.
- **Smart placement (agent-driven):** ask in plain language and the agent reasons about the document's structure:
  - *"Stamp a small leaf next to every section heading."*
  - *"Run a repeating border of this stamp around the whole page."*
  - *"Fill the empty bottom-third with a scattered pattern of these three stamps."*
  - *"Watermark each page with a faded version of my logo-stamp."*
- **Respect the content:** the agent keeps stamps clear of body text (or sets them as a low-opacity underlay), aligns to the document's existing margins/grid, and matches ink color to the document's palette if asked.
- **Per-page or whole-doc:** apply to one page, a range, or every page with consistent-but-not-identical placement (each stamp keeps its handmade wobble).

### Why this matters
It converts a charming toy into a **tool people actually return to**: decorate a wedding invite, brand a zine, add personality to a deck, give a plain handout a hand-printed soul — all without opening Photoshop or hunting for clip art. The "imperfect handmade stamp on a real document" look is hard to get any other way.

---

## 5. The pre-made stamp library

Not everyone wants to carve from scratch. Ship a curated **starter library** so anyone gets to a beautiful result in seconds — and can still tweak/re-carve any of them.

### Library principles
- Every library stamp is **editable**: load it onto the block and keep carving, or recolor/resize it.
- All carry the same **hand-cut aesthetic** (ragged edges, ink texture) so library + custom stamps mix seamlessly.
- Organized into themed **collections**.

### Suggested starter collections

| Collection | Example stamps |
|---|---|
| **Botanical** | fern, monstera leaf, wheat sprig, wildflower, palm frond, mushroom, pinecone |
| **Celestial** | sun, crescent moon, star burst, comet, cloud, lightning bolt |
| **Geometric** | half-circle, triangle, diamond, wavy line, dot cluster, arch, chevron |
| **Folk / ornamental** | paisley, scallop border, rosette, woodcut bird, fish, hand |
| **Seasonal** | snowflake, holly, pumpkin, heart, fireworks, autumn leaf |
| **Everyday objects** | coffee cup, envelope, key, lightbulb, anchor, scissors, house |
| **Letterforms** | a full hand-cut alphabet + numerals + punctuation (so you can "letterpress" words) |
| **Borders & corners** | repeating edge strips, ornamental corners, dividers, frames |

### Agent-generated stamps (the magic shortcut)
Beyond the fixed library, the **design agent can carve a brand-new stamp from a word**:
- *"Carve me a hummingbird."* → the agent generates a block already gouged in the hand-cut style, dropped onto your bench, ready to ink and press (or refine).
- This blends Weave's generation with the carving aesthetic, so generated stamps never look like flat AI clip-art — they look *cut*.

---

## 6. Interface & art direction

**Principle: it should feel like a workbench, not a web app.**

- **The bench:** warm wood, a glass ink slab, a tray of gouges, a rack of brayers, a stack of paper, a shelf of finished prints. Everything is a physical object you pick up.
- **Tools as objects:** you don't select "V-gouge" from a dropdown — you reach for the V-gouge. The current tool literally sits in your cursor.
- **Sound design is core:** the *scrape* of carving, the *tacky roll* of the brayer, the *ka-chunk* of a press, the *peel* of lifting the block. Mute-able, but the default-on audio is half the delight.
- **Imperfection everywhere:** no perfectly straight lines, no flat fills. Ink texture, paper grain, registration jitter. The polish is in looking *un*-polished on purpose.
- **Restraint:** a near-empty bench, one block, a few tools. The craft is the content; resist adding chrome.

### Primary screens / modes
1. **Bench (Carve + Ink + Press)** — the core studio.
2. **Pattern mode** — press onto a blank sheet, then "Tile it" for a seamless repeat + colorways + product mockups.
3. **Document mode** — upload a doc, place stamps manually or by instruction, export.
4. **Library / Drawer** — browse collections, pull a pre-made stamp onto the bench, or ask the agent to carve a new one.
5. **Shelf** — your saved stamps, prints, and a shared community gallery ("printed with STAMP").

---

## 7. How it shows off Figma Weave + the design agent

The pitch to judges: **AI does the unglamorous geometry, the human keeps the soul.**

- **Design agent — layout & placement reasoning:**
  - Seamless tiling math (grid / half-drop / brick / mirror / radial) — edge-matching so there's no seam.
  - Document understanding: detect headings, margins, columns, empty regions; place stamps intelligently and avoid overlapping body text.
  - Natural-language commands ("border every page," "scatter in the gaps," "next to each heading").
- **Weave — generative imaging:**
  - Carve-a-stamp-from-a-word, rendered in the hand-cut relief style (not flat clip-art).
  - Ink textures, paper grains, and per-press coverage variance.
  - Colorway generation and product mockups (gift wrap, tote, notebook, fabric).
- **Clever-prompt showcase:** the demo money-shot is typing *"tile this as a half-drop repeat and give me a terracotta colorway"* and watching a seam-free, production-ready pattern appear — then *"now stamp it as a faded border around my uploaded invitation."*

---

## 8. Output & artifacts (what you keep)

- A **seamless tiling pattern** (PNG/SVG, plus colorways) — wallpaper, gift wrap, fabric, backgrounds.
- The **reusable stamp itself** — shareable, so a friend can print with *your* carved block.
- A **stamped document** — your uploaded PDF/image/Figma frame, decorated and exported.
- **Product mockups** — the pattern wrapped onto real objects for an instant "shop-ready" feel.
- A **community shelf** entry — gallery of everyone's prints (drives sharing + return visits).

---

## 9. Build plan (AI-assisted; effort-ordered, not time-boxed)

> The user is building with AI, so this is sequenced by dependency and risk, not a fixed calendar.

1. **The press feel (highest priority).** Nail carve → ink → press as a satisfying loop with real wobble, ink variance, and sound. If the *ka-chunk* doesn't feel good, nothing else matters.
2. **Carving engine.** Gouge tools that subtract from the block with ragged hand-cut edges; raised-vs-carved print logic; undo/patch.
3. **Ink system.** Brayer loading, over/under-ink states, color + split-fountain, per-press coverage texture.
4. **Pattern mode + seamless tiling agent.** Grid/half-drop/brick/mirror/radial repeats with true edge-matching; colorways; product mockups.
5. **Pre-made stamp library.** The themed collections above, all editable, all in the hand-cut aesthetic. Plus the hand-cut alphabet.
6. **Agent "carve from a word."** Generate new stamps in-style from a prompt.
7. **Document mode.** Upload → manual placement → natural-language smart placement → per-page/whole-doc → export.
8. **Shelf / gallery + sharing.**

**The single hardest craft problem:** making the **press feel physical** (registration wobble + ink coverage + sound), and making the **seamless tile genuinely seamless**. Protect disproportionate effort for both — they're the toy's joy and the tool's credibility, respectively.

**Smartest scope-cut if needed:** ship **Carve + Ink + Press + Seamless Tiling + the pre-made library** as the core. Document mode and agent-carved stamps are the "wow" extensions — sequence them after the core loop sings, and demo whichever is solid.

---

## 10. Title-card pitch

> **STAMP — carve your own block, ink it, and press it (ka-chunk) into a seamless pattern or any document you bring; the AI handles the perfect tiling, you keep the handmade soul.**

---

## Appendix — open questions to decide during the build

- **Name:** STAMP vs. Relief / Press / Block / Lino / Inkblock.
- **Stamp file format:** export stamps as SVG (crisp, recolorable) vs. textured PNG (preserves the cut grain) — likely offer both.
- **Document fidelity:** for PDFs/Figma frames, do we re-export a flattened decorated copy, or write stamps back as editable layers? (Editable layers = more impressive, more work.)
- **Multiplayer/gift loop:** is sharing a stamp a link, a downloadable file, or a "press it onto your wrist/doc" animated reveal like the KNOT concept?
- **Library size for the demo:** which 2–3 collections are most universally loved (likely Botanical, Celestial, Geometric) to lead with.
