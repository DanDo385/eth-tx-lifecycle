# Loom Demo Guide: eth-tx-lifecycle

Status: optimized for a natural 45-90 second transaction lifecycle walkthrough.
Demo focus: walkthrough
Primary repo URL: https://github.com/DanDo385/eth-tx-lifecycle

## Core story

Problem:
People click "send" in a wallet, then the transaction disappears into an invisible machine: mempool, builders, relays, validators, confirmations, finality, and MEV. Most interfaces show a hash and expect the user to trust the rest.

Solution:
This project turns that invisible machine into a guided visual model. It explains the transaction lifecycle with real Ethereum concepts, beginner-friendly analogies, and enough technical structure that a smart non-specialist can understand what is happening.

One-liner:
An Ethereum transaction lifecycle visualizer that explains what happens after a user clicks send: mempool, builders, relays, validators, finality, and MEV.

Positioning:
This walkthrough translates a complex distributed system into a product experience humans can understand. The flex is clarity without losing technical accuracy.

## What the Loom should feel like

Natural and generous.
Pretend the viewer is smart, skeptical, and new to Ethereum.
Do not sound like you are dumbing it down. Sound like you are making the system legible.

The demo should be a walkthrough of the product, not a lecture about every Ethereum component.

## What to run before recording

1. Start the backend per README if live data is desired.
2. Start frontend:

   cd /Users/openclaw/Code/eth-tx-lifecycle/frontend
   npm run dev

3. Use a clean browser window.
4. Open the clean recording route:

   http://localhost:3000/walkthrough

5. Click **Track a transaction** to start the package-tracker auto tour.
6. Use the main `/` technical explorer only as a follow-up if the viewer wants live data details.

## Step-by-step 60-second Loom

### 0:00-0:06 -- Hook

Show the title/top of app.
Say:
"Most people click send in a wallet and have no idea what happens next. This project makes that invisible path visible."

### 0:06-0:15 -- Mempool

Click/show Mempool.
Say:
"First the transaction enters the mempool, which is like a sorting room. Gas is the postage and priority signal. During congestion, that priority matters."

Point at:
- Pending transactions.
- Gas / priority metrics.

### 0:15-0:28 -- Builders and relays

Click Builders / Relays.
Say:
"Then builders assemble candidate blocks. Relays deliver bids to validators. This is where ordering becomes valuable, which is why MEV exists."

Point at:
- Builder competition.
- Relay-delivered payloads.
- Builder payments if visible.

### 0:28-0:42 -- Validators and finality

Click validator/proposed block/finality panels.
Say:
"The validator proposes the winning block, and the transaction starts moving toward finality. Finality is when reversing it becomes economically unrealistic. That is why exchanges wait for confirmations."

Point at:
- Proposed block.
- Finality/checkpoint panel.

### 0:42-0:55 -- MEV, but human-readable

Click MEV detector.
Say:
"MEV is hidden value created by ordering. Users may experience it as worse execution, but behind the scenes there is an entire builder and relay market. This interface gives that market a shape."

### 0:55-1:00 -- Close

Say:
"The engineering goal was not just to fetch data. It was to build a teaching interface around a complex live system. The communication layer is the product."

## 90-second variant

Add these beats if recording for a more technical interviewer:

1. Show the backend/frontend split.
   Say:
   "The Go backend handles the Ethereum data collection and aggregation. The Next.js frontend turns that data into an educational sequence."

2. Mention external data and reliability.
   Say:
   "The app has to deal with public RPCs, beacon APIs, relays, caching, rate limits, and partial failures. That is the real product problem: making the system understandable even when the data sources are messy."

3. Show transaction tracking if the app has a good example loaded.
   Say:
   "For a specific transaction, the same model becomes a trace: where it entered, when it landed, and how final it is."

## Short 30-second cut

0:00-0:05
"You clicked send. Where did your transaction actually go?"

0:05-0:15
Show mempool -> builders -> relays.
"It moves from a public waiting room into a builder/relay market."

0:15-0:25
Show validator/finality.
"A validator proposes the block, then the transaction moves toward finality."

0:25-0:30
Show MEV/finality.
"This makes Ethereum's invisible transaction pipeline understandable for humans."

## GIF / MP4 preview plan

Length: 6-10 seconds.
Loop:
1. Show title: "You clicked send. Now what?"
2. Mempool panel lights up.
3. Builder/relay panel lights up.
4. Validator/finality panel lights up.
5. End on finality/checkmark.

Caption baked into preview:
"Ethereum tx lifecycle: mempool -> builder -> validator -> finality"

Prefer MP4/WebM over GIF if magro.dev supports it.

## Thumbnail plan

Title:
"YOU CLICKED SEND. NOW WHAT?"

Subtitle:
"Ethereum transactions explained for humans"

Visual composition:
A glowing package/transaction moving across five labeled stations: Wallet, Mempool, Builder, Validator, Finality.

## Speaking guidance

This one should sound generous and clear. Pretend the viewer is smart but new.
Avoid sounding like you are dumbing it down. Say: "I wanted to make this legible" rather than "I simplified it."

Confidence line:
"A good technical system still needs a clear mental model. This project is about building that model."
