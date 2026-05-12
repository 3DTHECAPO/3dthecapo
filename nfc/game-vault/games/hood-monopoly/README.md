# PLAY 3D — Hood Monopoly · V-Town Edition (Vallejo, CA)

A premium browser-based Monopoly-style game themed around **Vallejo, California** —
Mare Island, Carquinez Bridge, Sonoma Blvd, Tennessee Street, Empress Theatre,
Six Flags Fairgrounds, the works. Built for the PLAY 3D / Game Vault / Superior
ecosystem. Vanilla JS / HTML / CSS — **no build step required**.

## Run
Double-click `index.html`. That's it. Works from `file://` and from any static host.

## File Structure
```
hood-monopoly/
├── index.html
├── style.css
├── script.js              # main controller + DOM renderer
├── README.md
├── assets/
│   ├── skyline.svg        # cinematic Vallejo waterfront w/ Carquinez Bridge + Mare Island cranes
│   └── fonts/             # locally bundled fonts (Unbounded, Outfit, JetBrains Mono) — no CDN
├── audio/
│   └── README.md          # drop your MP3/WAV here (synth engine ships by default)
├── engine/
│   ├── board.js           # 40 Vallejo tiles + 11×11 grid positions
│   ├── gameEngine.js      # pure game logic
│   ├── aiPlayer.js        # Easy / Medium / Aggressive AI
│   ├── audio.js           # WebAudio synthesised SFX + ambient drone
│   └── persistence.js     # localStorage save/load
├── cards/
│   └── cards.js           # 10 Hood Cards + 10 Street Cards — Vallejo flavoured
├── players/
│   └── tokens.js          # 8 tokens: lowrider, mic, V-Town crown, ferry, Carquinez bridge,
│                          # gold chain, vault key, Mare Island anchor
└── saves/
    └── README.md
```

All paths are relative (`./assets/...`, `./audio/...`, `./engine/...`). No absolute
or `localhost` paths anywhere. No external CDN — fonts are bundled locally.

## Vallejo Map (40 tiles)
- **West Vallejo** group: West Vallejo · Magazine Street
- **North Vallejo** group: Springs Road · Lincoln Road · Glen Cove
- **Sonoma Strip** group: Sonoma Blvd · Curtola Parkway · Tennessee Street
- **East Vallejo** group: Tuolumne Heights · Mariposa Blocks · Solano Avenue
- **Club Row** group: Empress Theatre · Vista Club · Diamond Lounge
- **V-Town Studios** group: Tennessee Studios · V-Town Booth · Crockett Sound Lab
- **Mare Island & Marina** group: Marina Vista · Glen Cove Marina · Mare Island Shipyard
- **Downtown Tier** group: Georgia Street · Downtown Vallejo
- **Transit**: Vallejo Ferry Terminal · Carquinez Bridge · Lowrider Garage · Six Flags Fairgrounds
- **Utilities**: Mare Island Power Co · Vallejo Water Co
- **Corners**: GO (Welcome to V-Town) · Brig (Just Visiting) · Waterfront Block Party · Sent To The Brig

## Features
- Cinematic loading screen → main menu → lobby → game state machine
- Solo vs AI (Easy / Medium / Aggressive) **and** local hot-seat 2–4 player mode
- Dice, GO bonus, jail (3-roll cap, $50 bail), Go-To-Jail tile, 3-doubles jail
- Hood Cards & Street Cards with cinematic 3D flip animation — all V-Town themed
- Property purchase / rent / utility (4× or 10× dice) / transit (rent ladder)
- Group monopoly = doubled base rent
- Bankrupt + auto win condition
- Cinematic gold-luxury UI with marquee borders, gold sweep, glass panels, grain overlay
- Custom SVG skyline: Carquinez Bridge with suspension cables, Mare Island cranes & cargo ship,
  Vallejo ferry, streetlights with gold glow, waterfront fog
- WebAudio synthesised SFX (dice, buy, rent, jail, card, victory, bankrupt) + ambient drone
- localStorage auto-save → `Continue Save` from main menu

## Superior / Game Vault Hooks
- `HM` global namespace exposes engine for external audit / multiplayer sync.
- `HM.STORAGE_KEY = 'play3d.hood-monopoly.v1'` is the save key.
- All game state is JSON-serialisable — drop into a socket payload as-is.
