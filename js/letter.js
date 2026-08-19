import { db, doc, getDoc, updateDoc } from "./firebase-config.js";

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const envelopeScene = document.getElementById("envelopeScene");
const envelope = document.getElementById("envelope");
const envelopeHint = document.getElementById("envelopeHint");

const revealLetter = document.getElementById("revealLetter");
const revealScroll = document.getElementById("revealScroll");
const rvGreeting = document.getElementById("rvGreeting");
const rvBody = document.getElementById("rvBody");
const rvSign = document.getElementById("rvSign");
const rvExtras = document.getElementById("rvExtras");
const closeBtn = document.getElementById("closeBtn");
const embersWrap = document.getElementById("embers");

const EXTRA_LABELS = {
  "note-jar": "a note jar filled with little reasons and reminders",
  "vintage-box": "a vintage keepsake box",
  "diffuser": "a vintage wrapped reed diffuser",
};
const PLAN_LABELS = {
  "ember-letter": null,
  "ember-scroll": null,
  "simple-gesture": "dried flowers and a small box of chocolates",
  "custom-box-1": "a vintage map-print keepsake box",
  "custom-box-2": "a hand-toned envelope in a gift box",
  "custom-box-3": "a candle, chocolate, a mini treasure chest, and a printed photo",
  "premium-box": "a hand-rolled scroll with dried florals in a premium box",
};

function spawnEmbers() {
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("div");
    p.className = "ember-particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
    p.style.animationDuration = 5 + Math.random() * 6 + "s";
    p.style.animationDelay = Math.random() * 6 + "s";
    embersWrap.appendChild(p);
  }
}
spawnEmbers();

async function loadLetter() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    showError();
    return;
  }
  try {
    const snap = await getDoc(doc(db, "letters", id));
    if (!snap.exists()) {
      showError();
      return;
    }
    const data = snap.data();
    loadingState.hidden = true;
    envelopeScene.hidden = false;

    rvGreeting.textContent = data.greeting || `My dearest ${data.recipientName || ""},`;
    rvBody.textContent = data.message || "";
    rvSign.textContent = data.signoff || `— ${data.senderName || ""}`;
    revealScroll.dataset.paper = data.paper || "papyrus";

    const extrasParts = [];
    const planExtra = PLAN_LABELS[data.plan];
    if (planExtra) extrasParts.push(planExtra);
    (data.extras || []).forEach(e => { if (EXTRA_LABELS[e]) extrasParts.push(EXTRA_LABELS[e]); });
    if (extrasParts.length) {
      rvExtras.hidden = false;
      rvExtras.textContent = `This letter arrives with ${extrasParts.join(" and ")}, on its way to your door.`;
    }

    envelope.addEventListener("click", () => openEnvelope(id, snap.data().opened));
    envelopeHint.addEventListener("click", () => openEnvelope(id, snap.data().opened));
  } catch (err) {
    console.error(err);
    showError();
  }
}

function showError() {
  loadingState.hidden = true;
  errorState.hidden = false;
}

let opening = false;
function openEnvelope(id, alreadyOpened) {
  if (opening) return;
  opening = true;
  document.getElementById("envelopeScene").classList.add("opening");

  setTimeout(() => {
    revealLetter.classList.add("visible");
    closeBtn.classList.add("visible");
  }, 650);

  if (!alreadyOpened) {
    updateDoc(doc(db, "letters", id), { opened: true }).catch(() => {});
  }
}

closeBtn.addEventListener("click", () => {
  revealLetter.classList.remove("visible");
  closeBtn.classList.remove("visible");
});

loadLetter();
