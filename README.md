# Ink & Ember

A vintage, Greek-scroll–themed web app for sending sealed digital love letters,
with optional flowers/chocolate delivery. Static HTML/CSS/JS — no build step —
using Firebase Firestore as the database and Paystack for payment.

## What's included

```
index.html          Landing page (hero, how it works, plans)
create.html          Letter composer: live preview, plan/extras, Paystack checkout
letter.html          Recipient reveal page: floating envelope → animated scroll
css/style.css         Full design system (papyrus/wax-seal theme, all animations)
js/firebase-config.js Firebase init (your config is already wired in)
js/create.js          Composer logic + Paystack + Firestore write
js/letter.js          Recipient page logic + Firestore read
firestore.rules       Suggested security rules
```

## 1. Firebase setup

Your config is already in `js/firebase-config.js`. You still need to:

1. In the [Firebase console](https://console.firebase.google.com/), open project
   **ink-and-ember001** → **Build → Firestore Database** → **Create database**
   (start in production mode).
2. Go to **Firestore → Rules** and paste in the contents of `firestore.rules`
   (or run `firebase deploy --only firestore:rules` if you have the Firebase
   CLI set up). This lets anyone with a letter's link read *that* letter only,
   and blocks anyone from listing all letters or editing letter content.
3. That's it — no Cloud Functions or Auth are required for the current
   client-only flow.

## 2. Paystack setup

Physical packages carry a real price (from ₦10,000) and run through Paystack.
The Virtual Letter is always free and never touches Paystack.

1. Create a [Paystack](https://paystack.com) account and grab your **public
   key** (starts with `pk_test_…` for testing, `pk_live_…` in production).
2. Open `js/create.js` and replace:
   ```js
   const PAYSTACK_PUBLIC_KEY = "pk_test_REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY";
   ```
3. **Important — the secret key never goes in this frontend code.** The
   current flow uses Paystack's inline popup, so the public key is all the
   browser needs. For production, add a small server-side step (a Firebase
   Cloud Function is a natural fit) that calls Paystack's `/transaction/verify`
   endpoint with your **secret key** before you fully trust a payment — right
   now the app trusts the client-side `callback`, which is fine for getting a
   real product in front of people fast, but a bad actor could in theory call
   `saveLetterAndReveal()` without paying. See "Going further" below.

## 3. Running it locally

Because the pages use ES module `<script type="module">` imports, you can't
just double-click the HTML files — open them through a local server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## 4. Deploying

Any static host works (Firebase Hosting, Netlify, Vercel, GitHub Pages).
Firebase Hosting is the natural pairing since you're already using Firestore:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # point the public directory at this folder
firebase deploy
```

## How the flow works

1. **`create.html`** — the sender fills out the letter, picks a parchment
   style (live-previewed), a plan (Scroll / Bloom / Ember), and optional
   extras. On submit, Paystack's inline popup collects payment; on success
   the letter is written to the `letters` collection in Firestore and a
   share link (`letter.html?id=<docId>`) is generated.
2. **`letter.html`** — the recipient opens the link, sees a floating wax-sealed
   envelope, and taps it. The flap opens, the seal breaks, and a parchment
   scroll unrolls with the letter text, revealed line by line. If the plan or
   extras include physical delivery (flowers/chocolate/rush), that's noted
   at the bottom of the letter. The `opened` field flips to `true` in
   Firestore the first time it's viewed.

## Product catalog

Prices and images live directly in `index.html` (pricing cards) and
`create.html` (the `<select>` options and add-on checkboxes) — there's no
separate database table for the catalog itself, since it changes rarely.
Product photos are in `img/`. To change a price or swap a photo, edit both
files directly (keep the `data-price`/`data-img` attributes on the `<option>`
and `<input>` elements in `create.html` in sync with what you show on the
landing page).

**Virtual Letter — Free.** No delivery, no payment. The sender picks a paper
design, a font, a reveal animation, and a background scene; the recipient
gets a private link.

**Letters & Scrolls**
- Ember Letter — ₦10,000 (`img/ember-letter.jpg`)
- Ember Scroll — ₦13,000 (`img/ember-scroll.jpg`)
- Simple Gesture — ₦13,000 (`img/simple-gesture.jpg`)

**Curated Boxes**
- Custom Box 1 — ₦17,000 (`img/custom-box-1.jpg`)
- Custom Box 2 — ₦22,000 (`img/custom-box-2.jpg`)
- Custom Box 3 — ₦30,500 (`img/custom-box-3.jpg`)
- Premium Box — ₦55,000 (`img/premium-box.jpg`)

**Add-ons** (selectable on `create.html`, stack on top of any package)
- Note Jar — ₦15,000 (`img/addon-note-jar.jpg`)
- Vintage Box — ₦12,000 *(placeholder — you didn't give me a price for this one, update it in `create.html`'s add-ons list)* (`img/addon-vintage-box.jpg`)
- Vintage Wrapped Diffuser — ₦11,000 (`img/addon-diffuser.jpg`)

## The digital reveal system

Every letter — virtual or physical — generates a private `letter.html?id=...`
link with a fully customizable reveal experience, chosen by the sender on
`create.html`:

- **Paper designs (6):** Papyrus, Rose, Olive, Midnight, Ivory Lace, Gold Fleck
- **Fonts (6):** Cormorant (classic serif), Dancing Script, Great Vibes,
  Parisienne, Playfair Display, Sacramento — all loaded from Google Fonts
- **Reveal animations (4):** Wax Envelope (tap to break the seal), Unfurling
  Scroll (untie the ribbon), Blooming Flower (petals open outward), Velvet
  Curtain (panels slide apart)
- **Background scenes (5):** Warm Embers, Floating Hearts, Falling Petals,
  Twinkling Stars, or None (minimal)

These are stored per-letter in Firestore (`paper`, `font`, `animation`,
`scene` fields) and read by `js/letter.js`, which shows the matching
animation markup, spins up the matching floating-particle system, and applies
the chosen paper/font to the letter itself.

## Going further (recommended before real launch)

- **Verify payments server-side.** Add a Cloud Function that calls Paystack's
  `GET /transaction/verify/:reference` with your secret key, and only then
  writes the letter to Firestore (instead of writing it straight from the
  browser after the client-side `callback` fires).
- **Fulfillment for physical extras.** `deliveryAddress`, `plan`, and `extras`
  are stored per letter — wire up a simple internal dashboard (or a Zapier/
  Google Sheets export) so your delivery team can see and fulfill orders.
- **Custom domain + analytics.** Firebase Analytics is already initialized in
  `firebase-config.js`; add Hosting + a custom domain when you're ready to
  go live.
- **Rate limiting / abuse prevention.** Consider Firebase App Check to stop
  bots from spamming letter creation.
