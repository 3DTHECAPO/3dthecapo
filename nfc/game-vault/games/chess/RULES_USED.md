# Rules Used - Chess

Source consulted:
- chess.js 1.4.0 package documentation and standard chess legal move model.

Variant implemented:
- Standard chess from the normal starting position.

Fully implemented:
- Legal move generation through chess.js.
- Check, checkmate, stalemate, draw, castling, en passant, and promotion legality through chess.js.
- CPU chooses only legal engine moves.
- Existing PLAY 3D board layout is preserved.

Guarded / not fully implemented:
- Fan Challenge can exchange FEN through existing room hooks, but full hosted turn arbitration is guarded.
- No original chess image set was found, so the game uses chess glyph pieces instead of raw letters.
