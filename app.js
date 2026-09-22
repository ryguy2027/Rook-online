const $ = (s) => document.querySelector(s);

const screens = ["home", "lobby", "game", "rules"];
function show(id) {
  screens.forEach(x => document.getElementById(x).classList.toggle("active", x === id));
}

const suits = [
  {name:"Red", symbol:"♥", cls:"red"},
  {name:"Yellow", symbol:"◆", cls:""},
  {name:"Green", symbol:"♣", cls:""},
  {name:"Black", symbol:"♠", cls:""}
];

let deck = [];
let players = [];
let currentPlayer = 0;
let trick = [];
let trickLead = null;
let scores = [0,0,0,0];

function buildDeck() {
  const d = [];
  suits.forEach((s, si) => {
    for (let n=1; n<=14; n++) d.push({suit:si, rank:n, label:`${n}${s.symbol}`, color:s.cls});
  });
  d.push({rook:true, label:"ROOK"});
  return d;
}

function shuffle(a) {
  for (let i=a.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function startGame() {
  deck = shuffle(buildDeck());
  players = [
    {name: $("#playerName").value.trim() || "You", hand:[]},
    {name:"Player 2", hand:[]},
    {name:"Player 3", hand:[]},
    {name:"Player 4", hand:[]}
  ];
  for (let i=0;i<deck.length;i++) players[i%4].hand.push(deck[i]);
  players.forEach(p => p.hand.sort((a,b)=>(a.rook?99:a.suit*20+a.rank)-(b.rook?99:b.suit*20+b.rank)));
  currentPlayer=0; trick=[]; trickLead=null; scores=[0,0,0,0];
  renderGame();
  show("game");
}

function cardText(c) { return c.rook ? "ROOK" : c.label; }

function canPlay(card) {
  if (currentPlayer !== 0) return false;
  if (card.rook) return true;
  if (trickLead === null) return true;
  const hasLead = players[0].hand.some(c => !c.rook && c.suit === trickLead);
  return !hasLead || card.suit === trickLead;
}

function playCard(index) {
  if (currentPlayer !== 0) return;
  const card = players[0].hand[index];
  if (!canPlay(card)) {
    $("#message").textContent = "You must follow the lead suit if you can.";
    return;
  }
  players[0].hand.splice(index,1);
  addToTrick(0,card);
  renderGame();
  if (trick.length < 4) setTimeout(aiTurn, 500);
}

function addToTrick(playerIndex, card) {
  if (trick.length === 0 && !card.rook) trickLead = card.suit;
  trick.push({playerIndex, card});
}

function aiTurn() {
  if (trick.length >= 4) return;
  const p = currentPlayer;
  if (p === 0) return;
  const hand = players[p].hand;
  let candidates = hand.filter(c => {
    if (c.rook) return true;
    if (trickLead === null) return true;
    const hasLead = hand.some(x => !x.rook && x.suit === trickLead);
    return !hasLead || c.suit === trickLead;
  });
  const card = candidates[Math.floor(Math.random()*candidates.length)];
  const idx = hand.indexOf(card);
  hand.splice(idx,1);
  addToTrick(p,card);
  renderGame();
  if (trick.length < 4) {
    currentPlayer = (currentPlayer + 1) % 4;
    setTimeout(aiTurn, 600);
  } else {
    setTimeout(finishTrick, 900);
  }
}

function winnerOfTrick() {
  let best = trick[0];
  for (const t of trick.slice(1)) {
    const c=t.card, b=best.card;
    if (c.rook && !b.rook) best=t;
    else if (!c.rook && !b.rook && c.suit === trickLead && b.suit !== trickLead) best=t;
    else if (!c.rook && !b.rook && c.suit === b.suit && c.rank > b.rank) best=t;
  }
  return best.playerIndex;
}

function finishTrick() {
  const winner = winnerOfTrick();
  scores[winner] += trick.reduce((sum,t)=>sum + (t.card.rook ? 20 : t.card.rank), 0);
  currentPlayer = winner;
  trick=[]; trickLead=null;
  if (players.every(p => p.hand.length === 0)) {
    renderGame();
    $("#message").textContent = `Game over — ${players[winner].name} won the last trick!`;
    return;
  }
  renderGame();
  if (currentPlayer !== 0) setTimeout(aiTurn, 600);
}

function renderGame() {
  $("#turnLabel").textContent = `Turn: ${players[currentPlayer]?.name || ""}`;
  $("#scoreboard").innerHTML = players.map((p,i)=>
    `<div class="score ${i===currentPlayer?"active":""}"><b>${escapeHtml(p.name)}</b><br>${scores[i]}</div>`
  ).join("");

  $("#p1").textContent = `▲ ${players[2]?.name || ""} • ${players[2]?.hand.length || 0} cards`;
  $("#p2").textContent = `◀ ${players[1]?.name || ""} • ${players[1]?.hand.length || 0}`;
  $("#p3").textContent = `${players[3]?.name || ""} • ${players[3]?.hand.length || 0} ▶`;

  $("#trick").innerHTML = trick.map(t =>
    `<div class="played">${escapeHtml(cardText(t.card))}<small>${escapeHtml(players[t.playerIndex].name)}</small></div>`
  ).join("");

  $("#hand").innerHTML = players[0].hand.map((c,i) => {
    const disabled = !canPlay(c) ? "disabled" : "";
    const extra = c.rook ? "rook" : c.color;
    return `<button class="card-item ${extra} ${disabled}" data-index="${i}" ${disabled?"disabled":""}>
      <span>${escapeHtml(cardText(c))}</span>
    </button>`;
  }).join("");

  $("#hand").querySelectorAll(".card-item").forEach(btn =>
    btn.addEventListener("click", () => playCard(Number(btn.dataset.index)))
  );

  if (currentPlayer === 0) $("#message").textContent = "Your turn — play a card.";
  else $("#message").textContent = `${players[currentPlayer].name} is thinking…`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

$("#createBtn").onclick = () => {
  $("#roomCode").textContent = String(Math.floor(100000 + Math.random()*900000));
  show("lobby");
};
$("#startLocalBtn").onclick = startGame;
$("#joinBtn").onclick = () => $("#joinDialog").showModal();
$("#rulesBtn").onclick = () => show("rules");
$("#newGameBtn").onclick = startGame;

document.querySelectorAll("[data-back]").forEach(b => b.onclick = () => show(b.dataset.back));

$("#joinDialog").addEventListener("close", () => {
  if ($("#joinDialog").returnValue === "join") {
    $("#roomCode").textContent = $("#joinCode").value.trim() || "------";
    show("lobby");
  }
});
