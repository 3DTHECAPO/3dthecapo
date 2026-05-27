(function(){
  'use strict';

  const lines = {
    dominoes: {
      DOMINO: [
        'DOMINO. WASH THE DISHES.',
        'Last bone down. Domino called.',
        'Table closed. Domino.'
      ],
      BLOCKED: [
        'Board blocked. Count the bones.',
        'No plays left. Blocked round.',
        'The table is locked. Lowest hand wins.'
      ],
      COUNT: [
        'Open ends counted.',
        'Board count locked.',
        'Count the ends.'
      ],
      BIG_SCORE: [
        'Big count on the board.',
        'That score hits heavy.',
        'Clean table pressure.'
      ],
      SPINNER: [
        'Spinner is live.',
        'Four arms open from the spinner.',
        'Spinner controls the table.'
      ],
      TURN: [
        'Your turn.',
        'Choose the right end.',
        'Play the match.'
      ]
    },
    pinochle: {
      BID: [
        'Bid is on the table.',
        'New high bid declared.',
        'The bid climbs.'
      ],
      PASS: [
        'Pass recorded.',
        'Player passes.',
        'No bid from that seat.'
      ],
      TRUMP: [
        'Trump declared.',
        'Trump suit is locked.',
        'Trump controls the hand.'
      ],
      MELD: [
        'Meld counted.',
        'Meld is on the board.',
        'Partnership points posted.'
      ],
      WIN: [
        'Hand won.',
        'Trick pressure paid off.',
        'The table pays the winner.'
      ]
    },
    casino: {
      JACKPOT: [
        'Jackpot pressure.',
        'Vault lights up.',
        'That hit shakes the room.'
      ],
      LOSE: [
        'No win. House collects.',
        'Table stays cold.',
        'Reset and run it back.'
      ],
      BONUS: [
        'Bonus triggered.',
        'Bonus round energy.',
        'Extra action unlocked.'
      ]
    },
    vault: {
      ACCESS: [
        'Access check active.',
        'Vault access recognized.',
        'Credential scan complete.'
      ],
      UNLOCK: [
        'Vault unlocked.',
        'Door open. Step inside.',
        'Access granted.'
      ],
      ELITE: [
        'Elite access active.',
        'Elite room cleared.',
        'High-tier access confirmed.'
      ]
    }
  };

  window.SuperiorLines = Object.freeze(lines);
})();
