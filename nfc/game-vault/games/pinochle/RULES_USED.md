# Rules Used - Pinochle

Sources consulted:
- Bicycle Cards two-player Pinochle rules.
- Britannica Pinochle deck, meld, trick, and simplified scoring notes.
- Trickster Cards single-deck Pinochle deck/rank notes.

Variant implemented:
- Single-deck 48-card Pinochle.
- 2-player stock/trick foundation by default.
- Guarded 4-player/team foundation with 12 cards per seat and no stock.

Fully implemented:
- 48-card invariant: two each of 9, J, Q, K, 10, A in each suit.
- 2-player deal: 12 cards per player and 24-card stock.
- 4-player/team foundation: 12 cards to each of four seats.
- Visible player hand, opponent card backs, stock, trick pile, meld area, trump, and score.
- CPU plays legal follow-suit turns.
- Meld scoring for trump runs, marriages, dix, pinochle, arounds, and double meld counts where the 48-card hand contains both copies.

Guarded / not fully implemented:
- Full 4-player bidding/contract enforcement is not complete.
- Full two-player stock/meld timing variations are simplified.
- 4-player/team mode is a guarded trick-and-meld foundation with four seats and CPU fill, not a full partnership bidding engine.
