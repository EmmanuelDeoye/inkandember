import { db, doc, getDoc, updateDoc } from "./firebase-config.js";

const stage = document.getElementById("stage");
const particlesWrap = document.getElementById("particles");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");

const animContainers = {
  envelope: document.getElementById("animEnvelope"),
  scroll: document.getElementById("animScroll"),
  bloom: document.getElementById("animBloom"),
  curtain: document.getElementById("animCurtain"),
};
// How long each animation's "opening" transition needs before the letter shows
const ANIM_DELAY = { envelope: 650, scroll: 900, bloom: 950, curtain: 1100 };

const revealLetter = document.getElementById("revealLetter");
const revealScroll = document.getElementById("revealScroll");
const rvGreeting = document.getElementById("rvGreeting");
const rvBody = document.getElementById("rvBody");
const rvSign = document.getElementById("rvSign");
const rvExtras = document.getElementById("rvExtras");
const closeBtn = document.getElementById("closeBtn");

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

// ---------------------------------------------------------------------------
// Floating background particles — shape + motion depend on the chosen scene
// ---------------------------------------------------------------------------
const SCENE_CONFIG = {
  embers:  { shape: "ember", count: 26, motion: "rise" },
  hearts:  { shape: "heart", count: 16, motion: "rise" },
  stars:   { shape: "star",  count: 24, motion: "rise" },
  petals:  { shape: "petal", count: 18, motion: "fall" },
  none:    null,
};

function spawnParticles(scene) {
  const config = SCENE_CONFIG[scene] || SCENE_CONFIG.embers;
  if (!config) return;
  for (let i = 0; i < config.count; i++) {
    const p = document.createElement("div");
    p.className = `particle particle--${config.shape} particle--${config.motion}`;
    p.style.left = Math.random() * 100 + "%";
    p.style.setProperty("--drift", (Math.random() * 90 - 45) + "px");
    p.style.setProperty("--spin", (Math.random() * 360 - 180) + "deg");
    p.style.setProperty("--peak-opacity", (0.55 + Math.random() * 0.35).toFixed(2));
    const duration = config.motion === "fall" ? 7 + Math.random() * 7 : 5 + Math.random() * 6;
    p.style.animationDuration = duration + "s";
    p.style.animationDelay = (Math.random() * duration).toFixed(2) + "s";
    if (config.shape === "star" || config.shape === "petal") {
      p.style.transform = `scale(${(0.7 + Math.random() * 0.7).toFixed(2)})`;
    }
    particlesWrap.appendChild(p);
  }
}

// ---------------------------------------------------------------------------
// Load the letter and wire up whichever reveal animation was chosen
// ---------------------------------------------------------------------------
async function loadLetter() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) { showError(); return; }

  try {
    const snap = await getDoc(doc(db, "letters", id));
    if (!snap.exists()) { showError(); return; }
    const data = snap.data();

    loadingState.hidden = true;

    const animationKey = animContainers[data.animation] ? data.animation : "envelope";
    const scene = data.scene || "embers";
    const paper = data.paper || "papyrus";
    const font = data.font || "cormorant";

    stage.dataset.scene = scene;
    spawnParticles(scene);

    rvGreeting.textContent = data.greeting || `My dearest ${data.recipientName || ""},`;
    rvBody.textContent = data.message || "";
    rvSign.textContent = data.signoff || `— ${data.senderName || ""}`;
    revealScroll.dataset.paper = paper;
    revealScroll.dataset.font = font;
    // The scroll animation feels right unrolling from its own center rather than the top
    revealScroll.classList.toggle("origin-center", animationKey === "scroll");

    const extrasParts = [];
    const planExtra = PLAN_LABELS[data.plan];
    if (planExtra) extrasParts.push(planExtra);
    (data.extras || []).forEach(e => { if (EXTRA_LABELS[e]) extrasParts.push(EXTRA_LABELS[e]); });
    if (extrasParts.length) {
      rvExtras.hidden = false;
      rvExtras.textContent = `This letter arrives with ${extrasParts.join(" and ")}, on its way to your door.`;
    }

    const container = animContainers[animationKey];
    container.hidden = false;
    container.addEventListener("click", () => openLetter(id, animationKey, !!data.opened));
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
function openLetter(id, animationKey, alreadyOpened) {
  if (opening) return;
  opening = true;

  const container = animContainers[animationKey];
  container.classList.add("opening");

  setTimeout(() => {
    revealLetter.classList.add("visible");
    closeBtn.classList.add("visible");
  }, ANIM_DELAY[animationKey] || 700);

  if (!alreadyOpened) {
    updateDoc(doc(db, "letters", id), { opened: true }).catch(() => {});
  }
}

closeBtn.addEventListener("click", () => {
  revealLetter.classList.remove("visible");
  closeBtn.classList.remove("visible");
});

loadLetter();
