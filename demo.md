# Demo Playbook: eth-tx-lifecycle

This guide is the fastest way to run a reliable live demo of the project and tell a clear educational story.

## Demo Goal

In one sentence:

Show a smart beginner what happens after clicking **Send** on Ethereum using the post office analogy, while proving each step with live network data.

## Audience Fit

- **Beginner / non-crypto audience:** focus on story and visuals, avoid protocol depth first.
- **Technical audience:** keep the same story, then open relays/proposer/finality and architecture.
- **Mixed audience:** run story first (2-3 minutes), technical follow-up second (2-3 minutes).

## Core Narrative (Post Office Mapping)

Use this exact sequence in your voiceover:

1. **Wallet send -> Drop letter in mailbox**  
   A user signs and broadcasts a transaction.
2. **Mempool -> Local sorting room**  
   Pending letters wait; stamp price pressure changes priority.
3. **Builders/searchers -> Logistics optimizers**  
   Teams build competing dispatch plans.
4. **Relays -> Trusted handoff depots**  
   Candidate bags are checked and forwarded.
5. **Validators/proposers -> Dispatch authority**  
   One route bag is selected and sent.
6. **Finality -> Certified delivery lock**  
   Records are confirmed and become hard to reverse.

## Pre-Demo Checklist (5 Minutes)

1. Start services:
   ```bash
   make start
   ```
2. Open these tabs:
   - `http://localhost:3000/`
   - `http://localhost:3000/mev-lab`
3. Quick backend health:
   ```bash
   curl http://localhost:8080/api/health/ready
   ```
4. Warm lifecycle data:
   - Open `2) Mempool`
   - Open `3) Builders/searchers`
   - Open `4) Relays`
5. Warm MEV Lab once:
   - Click `Analyze block` with `latest`

## Recommended Live Demo Flow

## 3-Minute Version (Default)

- **0:00-0:20**: Hook  
  "Most people click send and never see the pipeline. This walks through the route from wallet broadcast to finality."
- **0:20-0:50**: Show Transaction Flow + analogy cards  
  Point at analogy cards under the diagram.
- **0:50-1:20**: `2) Mempool`  
  Explain variable stamp pricing (base fee + tip).
- **1:20-1:50**: `3) Builders/searchers` then `4) Relays`  
  Explain competition + handoff.
- **1:50-2:15**: `5) Validators/proposers` + `6) Finality`  
  Explain one selected block and confirmation lock.
- **2:15-2:45**: `Track a transaction` using `latest`  
  Show practical "where is my letter now?" use case.
- **2:45-3:00**: Close  
  "Story is beginner-friendly, but evidence is live."

## 6-Minute Version (Interview / Deep Dive)

1. Run the 3-minute flow.
2. Jump to `/mev-lab`.
3. Show `Before PBS` vs `With PBS` diagram.
4. Run live MEV detector on `latest`.
5. Explain estimate card:
   - observed live metrics vs assumption-based historical proxies
   - confidence labels and educational caveat

## What to Say for Each Section

- **Mempool:** "Letters are waiting in sorting bins; higher tips often move sooner."
- **Builders/Searchers:** "Different logistics teams build competing route bags."
- **Relays:** "Depots verify and forward candidate bags to dispatch authorities."
- **Proposer:** "Only one bag leaves on the truck each slot."
- **Finality:** "After checkpoint confirmation, delivery records are effectively locked."
- **MEV Lab:** "This is advanced behavior analysis; useful for learning patterns, not courtroom-grade attribution."

## Demo Safety and Reliability Tips

- Do not rely on one panel only. If one upstream is rate-limited, move to another step and continue the story.
- Keep at least one known-good tx hash ready as fallback.
- If relays are sparse, explain graceful degradation as part of production realism.
- Keep MEV as a second act (separate page) so beginners do not lose the lifecycle thread.

## Backup Plan (If Live Data Is Degraded)

1. Still show diagram + analogy cards.
2. Use whichever lifecycle panel has data first (mempool, headers, or finality).
3. Use transaction tracker with `latest`.
4. Explain: "Public data sources are rate-limited; this app is designed to degrade gracefully."

## Quick Commands

```bash
make start
make status
make stop
curl http://localhost:8080/api/health
curl http://localhost:8080/api/health/ready
```

## Post-Demo Q&A Anchors

- "Is this real data?" -> Yes, live public upstreams plus cache/fallback.
- "Why the analogy?" -> Faster mental model for non-specialists.
- "Where is MEV?" -> Dedicated `/mev-lab` to keep core flow beginner-first.
- "How accurate are estimates?" -> Clearly labeled educational estimates with confidence tags.
