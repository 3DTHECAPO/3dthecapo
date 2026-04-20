const reels = document.getElementById('reels');

const symbols = ["💰","🔒","🎤","💎","👑"];

function spin(){
    reels.innerHTML = "";

    for(let c=0;c<5;c++){
        const reel = document.createElement("div");
        reel.className = "reel";

        for(let r=0;r<3;r++){
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.innerText = symbols[Math.floor(Math.random()*symbols.length)];
            reel.appendChild(cell);
        }

        reels.appendChild(reel);
    }
}

document.getElementById("spinBtn").onclick = spin;

// initial render
spin();
