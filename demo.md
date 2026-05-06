# Demo Playbook: eth-tx-lifecycle

This guide is the fastest way to run a reliable live demo of the project and tell a clear educational story.

## Demo Goal

In one sentence:

Show what happens after clicking **Send** on Ethereum, from wallet broadcast to finality, using live network data as evidence.

## Audience Fit

- **Beginner / non-crypto audience:** focus on story and visuals, avoid protocol depth first.
- **Technical audience:** keep the same story, then open relays/proposer/finality and architecture.
- **Mixed audience:** run story first (2-3 minutes), technical follow-up second (2-3 minutes).

## Core Narrative

Use this exact sequence in your voiceover:

1. **Wallet send**  
   A user signs and broadcasts a transaction.
2. **Mempool**  
   Pending transactions compete for blockspace under fee pressure.
3. **Builders/searchers**  
   Specialized actors build competing candidate blocks.
4. **Relays**  
   Builder payloads are handed to proposers.
5. **Validators/proposers**  
   One block is selected for the slot.
6. **Finality**  
   Checkpoints make history economically hard to reverse.

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
- **0:20-0:50**: Show Transaction Flow + synced explanation box  
  Click through the diagram steps and point at the synced explanation box.
- **0:50-1:20**: `2) Mempool`  
  Explain gas pricing: base fee plus priority fee.
- **1:20-1:50**: `3) Builders/searchers` then `4) Relays`  
  Explain competition + handoff.
- **1:50-2:15**: `5) Validators/proposers` + `6) Finality`  
  Explain one selected block and confirmation lock.
- **2:15-2:45**: `Track a transaction` using `latest`  
  Show practical transaction-status lookup.
- **2:45-3:00**: Close  
  "The walkthrough is readable, but the evidence is live."

## 6-Minute Version (Interview / Deep Dive)

1. Run the 3-minute flow.
2. Jump to `/mev-lab`.
3. Show `Before PBS` vs `With PBS` diagram.
4. Run live MEV detector on `latest`.
5. Explain estimate card:
   - observed live metrics vs assumption-based historical proxies
   - confidence labels and educational caveat

## What to Say for Each Section

- **Mempool:** "Pending transactions compete for scarce blockspace."
- **Builders/Searchers:** "Specialized actors assemble and bid candidate blocks."
- **Relays:** "Relays hand builder payloads to proposers and expose bidtrace data."
- **Proposer:** "One validator proposes a block for the slot."
- **Finality:** "Checkpoints make accepted history economically hard to reverse."
- **MEV Lab:** "This is advanced behavior analysis; useful for learning patterns, not courtroom-grade attribution."

## Demo Safety and Reliability Tips

- Do not rely on one panel only. If one upstream is rate-limited, move to another step and continue the story.
- Keep at least one known-good tx hash ready as fallback.
- If relays are sparse, explain graceful degradation as part of production realism.
- Keep MEV as a second act (separate page) so beginners do not lose the lifecycle thread.

## Backup Plan (If Live Data Is Degraded)

1. Still show diagram + synced explanation box.
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
