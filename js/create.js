import { db, collection, addDoc, serverTimestamp } from "./firebase-config.js";

// ---------------------------------------------------------------------------
// ⚠️ Replace with your own Paystack PUBLIC key (starts with pk_).
// Never put your Paystack SECRET key in frontend code. Only used for the
// Physical Package flow — Virtual Letters are always free and skip Paystack.
// ---------------------------------------------------------------------------
const PAYSTACK_PUBLIC_KEY = "pk_test_REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY";

const form = document.getElementById("letter-form");
const senderName = document.getElementById("senderName");
const recipientName = document.getElementById("recipientName");
const greeting = document.getElementById("greeting");
const message = document.getElementById("message");
const signoff = document.getElementById("signoff");
const charCount = document.getElementById("charCount");

const fontSelect = document.getElementById("fontSelect");
const animationSelect = document.getElementById("animationSelect");
const sceneSelect = document.getElementById("sceneSelect");

const modeTabs = document.querySelectorAll(".mode-tab");
const virtualFields = document.getElementById("virtualFields");
const physicalFields = document.getElementById("physicalFields");

const planSelect = document.getElementById("plan");
const planThumb = document.getElementById("planThumb");
const extrasInputs = document.querySelectorAll('input[data-extra]');
const orderTotalEl = document.getElementById("orderTotal");
const deliveryAddress = document.getElementById("deliveryAddress");
const senderEmail = document.getElementById("senderEmail");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");
const submitLabel = document.getElementById("submitLabel");

const paperSwatches = document.getElementById("paper-swatches");
const letterPreview = document.getElementById("letterPreview");
const pvGreeting = document.getElementById("pvGreeting");
const pvBody = document.getElementById("pvBody");
const pvSign = document.getElementById("pvSign");
const previewToggleBtn = document.getElementById("previewToggleBtn");
const previewWrap = document.getElementById("previewWrap");

const shareModal = document.getElementById("shareModal");
const shareLink = document.getElementById("shareLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const whatsappShare = document.getElementById("whatsappShare");

let selectedPaper = "papyrus";
let previewOpen = false;
let currentMode = "virtual";

// Pre-select plan / mode from ?plan=... or ?mode=... query params
const urlParams = new URLSearchParams(window.location.search);
const presetPlan = urlParams.get("plan");
if (presetPlan && planSelect && [...planSelect.options].some(o => o.value === presetPlan)) {
  planSelect.value = presetPlan;
  currentMode = "physical";
}
if (urlParams.get("mode") === "physical") currentMode = "physical";

// ---------------------------------------------------------------------------
// Mode switch — Virtual Letter (free) vs Physical Package (paid)
// ---------------------------------------------------------------------------
function applyMode() {
  modeTabs.forEach(tab => {
    const active = tab.dataset.mode === currentMode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  virtualFields.hidden = currentMode !== "virtual";
  physicalFields.hidden = currentMode !== "physical";
  deliveryAddress.required = currentMode === "physical";
  senderEmail.required = currentMode === "physical";
  submitLabel.textContent = currentMode === "virtual" ? "Seal & Send — Free" : "Seal & Pay";
  if (currentMode === "physical") refreshTotal();
}
modeTabs.forEach(tab => tab.addEventListener("click", () => {
  currentMode = tab.dataset.mode;
  applyMode();
}));
applyMode();

// ---------------------------------------------------------------------------
// Live preview — rendered only on command (button press), not on every keystroke
// ---------------------------------------------------------------------------
function renderPreview() {
  pvGreeting.textContent = greeting.value.trim() || `My dearest ${recipientName.value.trim() || "…"},`;
  pvBody.textContent = message.value.trim() || "Your words will appear here once you write them…";
  pvSign.textContent = signoff.value.trim() || (senderName.value.trim() ? `— ${senderName.value.trim()}` : "");
  letterPreview.dataset.paper = selectedPaper;
  letterPreview.dataset.font = fontSelect.value;
}

previewToggleBtn.addEventListener("click", () => {
  previewOpen = !previewOpen;
  if (previewOpen) {
    renderPreview();
    previewWrap.classList.add("visible");
    previewToggleBtn.textContent = "Hide preview";
    previewWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else {
    previewWrap.classList.remove("visible");
    previewToggleBtn.textContent = "Preview your letter";
  }
});

message.addEventListener("input", () => {
  charCount.textContent = message.value.length;
});
fontSelect.addEventListener("change", () => { if (previewOpen) renderPreview(); });

paperSwatches.addEventListener("click", (e) => {
  const swatch = e.target.closest(".swatch");
  if (!swatch) return;
  document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
  swatch.classList.add("active");
  selectedPaper = swatch.dataset.paper;
  if (previewOpen) renderPreview();
});

// ---------------------------------------------------------------------------
// Plan thumbnail — swaps to match the selected physical package
// ---------------------------------------------------------------------------
function updatePlanThumb() {
  const img = planSelect.selectedOptions[0].dataset.img;
  if (img) {
    planThumb.src = img;
    planThumb.alt = planSelect.selectedOptions[0].textContent.trim() + " preview";
  }
}
planSelect.addEventListener("change", updatePlanThumb);
updatePlanThumb();

// ---------------------------------------------------------------------------
// Pricing (physical packages only — virtual letters are always free)
// ---------------------------------------------------------------------------
function calcTotal() {
  const planPrice = Number(planSelect.selectedOptions[0].dataset.price);
  let extrasTotal = 0;
  extrasInputs.forEach(input => {
    if (input.checked) extrasTotal += Number(input.dataset.price);
  });
  return planPrice + extrasTotal;
}
function refreshTotal() {
  orderTotalEl.textContent = `₦${calcTotal().toLocaleString("en-NG")}`;
}
planSelect.addEventListener("change", refreshTotal);
extrasInputs.forEach(i => i.addEventListener("change", refreshTotal));

// ---------------------------------------------------------------------------
// Submit → validate → (Paystack if physical) → save to Firestore → share link
// ---------------------------------------------------------------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  formError.textContent = "";

  if (!senderName.value.trim() || !recipientName.value.trim() || !message.value.trim()) {
    formError.textContent = "Please fill in your name, their name, and the letter itself.";
    return;
  }

  if (currentMode === "virtual") {
    submitBtn.disabled = true;
    submitLabel.textContent = "Sealing…";
    saveLetterAndReveal(null).finally(() => {
      submitBtn.disabled = false;
      submitLabel.textContent = "Seal & Send — Free";
    });
    return;
  }

  // Physical package flow
  if (!deliveryAddress.value.trim()) {
    formError.textContent = "Please add a delivery address so your package can reach them.";
    return;
  }
  if (!senderEmail.value.trim() || !/^\S+@\S+\.\S+$/.test(senderEmail.value.trim())) {
    formError.textContent = "Please enter a valid email for your payment receipt.";
    return;
  }
  if (PAYSTACK_PUBLIC_KEY.includes("REPLACE_WITH")) {
    formError.textContent = "Payments aren't configured yet — add your Paystack public key in js/create.js.";
    return;
  }

  const totalNaira = calcTotal();
  submitBtn.disabled = true;
  submitLabel.textContent = "Opening payment…";

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: senderEmail.value.trim(),
    amount: totalNaira * 100,
    currency: "NGN",
    metadata: {
      custom_fields: [
        { display_name: "Recipient", variable_name: "recipient", value: recipientName.value.trim() },
        { display_name: "Package", variable_name: "plan", value: planSelect.value },
      ],
    },
    callback: function (response) {
      saveLetterAndReveal(response.reference).finally(() => {
        submitBtn.disabled = false;
        submitLabel.textContent = "Seal & Pay";
      });
    },
    onClose: function () {
      submitBtn.disabled = false;
      submitLabel.textContent = "Seal & Pay";
    },
  });
  handler.openIframe();
});

async function saveLetterAndReveal(paymentReference) {
  try {
    const baseDoc = {
      type: currentMode, // 'virtual' | 'physical'
      senderName: senderName.value.trim(),
      recipientName: recipientName.value.trim(),
      greeting: greeting.value.trim() || `My dearest ${recipientName.value.trim()},`,
      message: message.value.trim(),
      signoff: signoff.value.trim() || `— ${senderName.value.trim()}`,
      paper: selectedPaper,
      font: fontSelect.value,
      animation: animationSelect.value,
      scene: sceneSelect.value,
      opened: false,
      createdAt: serverTimestamp(),
    };

    if (currentMode === "physical") {
      const extras = [...extrasInputs].filter(i => i.checked).map(i => i.dataset.extra);
      Object.assign(baseDoc, {
        plan: planSelect.value,
        extras,
        deliveryAddress: deliveryAddress.value.trim(),
        senderEmail: senderEmail.value.trim(),
        totalNaira: calcTotal(),
        paymentReference,
      });
    }

    const docRef = await addDoc(collection(db, "letters"), baseDoc);

    const link = `${window.location.origin}${window.location.pathname.replace("create.html", "")}letter.html?id=${docRef.id}`;
    shareLink.value = link;
    whatsappShare.href = `https://wa.me/?text=${encodeURIComponent("I wrote you something. Open it here: " + link)}`;
    shareModal.hidden = false;
  } catch (err) {
    console.error(err);
    if (paymentReference) {
      formError.textContent = "Your payment went through, but we couldn't save your letter. Please contact support with your payment reference: " + paymentReference;
    } else {
      formError.textContent = "Something went wrong saving your letter. Please try again.";
    }
  }
}

copyLinkBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(shareLink.value);
  copyLinkBtn.textContent = "Copied";
  setTimeout(() => (copyLinkBtn.textContent = "Copy"), 1800);
});
