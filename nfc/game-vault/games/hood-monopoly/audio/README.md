# /audio — Custom Music & SFX

Drop your own `.mp3` / `.wav` files here for future use. The current build ships with a
pure WebAudio synthesised SFX engine (no external audio files required), so the game
runs from the file system with zero missing references.

Suggested files when you swap to real audio:
- `ambient_city.mp3`   — looping ambient bed (Bay Area night)
- `sfx_dice.wav`       — dice roll
- `sfx_buy.wav`        — property purchase
- `sfx_rent.wav`       — rent collected
- `sfx_jail.wav`       — jail clang
- `sfx_card.wav`       — card flip
- `sfx_victory.wav`    — game over win

To wire them up, edit `./engine/audio.js` and replace each `_tone(...)` / `_noise(...)`
call with `new Audio('./audio/sfx_xxx.wav').play()`.
