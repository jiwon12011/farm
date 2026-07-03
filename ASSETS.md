# Firefly Farm Asset Pack

Art direction: readable warm 16-bit pixel art for a vertical mobile top-down farming RPG, combining a clear daytime farm style with stronger night/firefly mystery accents.

## Style Anchors

- Base mood: cozy, healing, approachable.
- Mystery layer: twilight navy shadows, golden fireflies, spirit shrine/deer motifs.
- View: top-down 3/4, character-following scroll maps.
- Palette anchors: cream `#FFF3D6`, straw `#E8B96B`, soil brown `#8A5A3B`, leaf green `#7CB458`, dark green `#3E7A44`, roof red `#C75B4A`, night navy `#2B3A67`, firefly gold `#FFD97A`.
- Maps are opaque PNG backgrounds.
- Characters, icons, crops, animals, dishes, buildings, and objects are transparent PNGs.
- No generated image should contain text, logos, watermarks, or readable lettering.

## Generated Assets

Current pack: 240 PNG files.

| Folder | Count | Notes |
|---|---:|---|
| `assets/maps` | 4 | Farm, village, forest, home. Resized to `2048x2048` for 64x64 tiles at 32px. |
| `assets/characters` | 17 | Hero 4-direction 2-frame walk cycle, NPCs, Lumi, firefly spirit. |
| `assets/portraits` | 4 | Dialogue portraits for hero, Bandi, Grandma, Lumi. |
| `assets/crops` | 23 | Shared growth stages, all major seasonal mature crops, and magical crops. |
| `assets/animals` | 15 | Adult/baby ranch animals, beehive, and legendary star sheep. |
| `assets/items` | 41 | Harvest items, ranch products, processed ingredients, feed/fertilizer, and helper icons. |
| `assets/dishes` | 42 | Core and extended cooking icons including moonlight stew and suspicious porridge. |
| `assets/buildings` | 34 | Repairable village/farm facilities, broken/repaired states, cooking stations, spirit shrine, and extra ranch props. |
| `assets/objects` | 13 | Environment props, map blockers, and magical effect sprites. |
| `assets/ui` | 38 | App icon, panels, buttons, counters, currency/tool/menu icons, joystick pieces, recipe book. |
| `assets/cutscenes` | 9 | Vertical title screen background plus eight story cutscene illustrations. |

## Phase Gap Fill

The following previously missing items have been added:

- `assets/buildings/pickling_barrel.png`
- `assets/buildings/restaurant_broken.png`
- `assets/buildings/bakery_oven_broken.png`
- `assets/buildings/lantern_tower_broken.png`
- `assets/buildings/festival_stage_broken.png`
- `assets/buildings/spirit_shrine.png`
- `assets/buildings/spirit_shrine_broken.png`
- `assets/buildings/spirit_shrine_repaired.png`
- `assets/ui/joystick_base_art.png`
- `assets/ui/joystick_thumb_art.png`
- `assets/ui/action_button_blank.png`
- `assets/ui/tab_button_blank.png`
- `assets/cutscenes/story_01_letter.png` through `assets/cutscenes/story_08_firefly_festival.png`

## Map Guidance

The maps are intended for a scrolling camera, not a fixed one-screen scene.

- Logical viewport target: about 11x20 tiles on vertical mobile.
- Map target: 2048x2048px, equivalent to 64x64 tiles at 32px.
- Keep walkable space generous. Avoid dense decoration in the center of movement lanes.
- Farm progression should happen inside the same large map: weeds, stones, logs, and fallen fences can block expansion areas until upgrades clear them.
- Forest progression should use bridge repair and blocked paths to reveal new areas later.

## Source Files

Raw generated originals and processed alpha sheets are kept in `work/imagegen/`.

For future regeneration, keep this structure:

1. Generate map backgrounds as single opaque square images.
2. Generate transparent-needed assets on a flat `#ff00ff` chroma-key background.
3. Remove chroma locally and split sheets into individual PNG files.
4. Save final app-facing files only under `assets/`.

## Regeneration Prompt Base

Use this prefix for future assets:

```text
Crisp 16-bit pixel art game asset for a vertical mobile top-down farming RPG, cozy warm daytime farm readability with subtle magical firefly mystery, Stardew Valley-like clarity with gentle Ghibli warmth, top-down 3/4 view, clean bold silhouette, soft rounded pixel shapes, palette anchors cream #FFF3D6, straw #E8B96B, soil brown #8A5A3B, leaf green #7CB458, roof red #C75B4A, night navy #2B3A67, firefly gold #FFD97A, no text, no watermark, no logo.
```

For transparent assets add:

```text
Create the asset on a perfectly flat solid #ff00ff chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep the subject fully separated from the background with crisp edges and generous padding. Do not use #ff00ff anywhere in the subject.
```
