
const symbols=["speaker.png","crown.png","key.png","lock.png","chain.png","cash.png"];

const reels=document.getElementById("reels");

function build(){
  reels.innerHTML="";
  for(let i=0;i<5;i++){
    let reel=document.createElement("div");
    reel.className="reel";

    for(let j=0;j<3;j++){
      let cell=document.createElement("div");
      cell.className="cell";

      let img=document.createElement("img");
      img.src="./assets/"+symbols[Math.floor(Math.random()*symbols.length)];

      cell.appendChild(img);
      reel.appendChild(cell);
    }
    reels.appendChild(reel);
  }
}

document.getElementById("spin").onclick=build;
document.getElementById("lever").onclick=build;

build();
