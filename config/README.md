# Dev / staging ports (`config/ports.json`)

Single source of truth for **eth-tx-lifecycle** local services and the Cloudflare Tunnel origin.

| Service | Port | Notes |
|---------|------|--------|
| Frontend (Next.js) | **3000** | `scripts/start-frontend.sh` / `WEB_PORT` |
| Backend (Go API) | **8081** | Chosen to coexist with eth-l2 on **8080** |

## Consumers

- `scripts/lib/ports.sh` — shell exports used by start scripts and Makefile
- `scripts/start-backend.sh` — binds `backend.bind` unless `GOAPI_ADDR` / `PORT` override
- `scripts/start-frontend.sh` — sets `WEB_PORT` and default `GOAPI_ORIGIN` for rewrites
- `scripts/start-staging-backend.sh` — loopback bind for tunnel + optional launchd
- `Makefile` — `stop-ports` frees the ports from this file (not hard-coded 8080)

## Hosted split (Vercel UI + local API)

| Piece | Value |
|-------|--------|
| Public API | `https://api-staging-eth-tx.magro.dev` |
| Tunnel origin | `http://127.0.0.1:8081` (`backend.bind`) |
| Vercel UI | `https://eth-tx-lifecycle.vercel.app` |
| Vercel env | `PROXY_MODE=route`, `GOAPI_ORIGIN=https://api-staging-eth-tx.magro.dev` |

See [docs/cloudflare-tunnel.example.yml](../docs/cloudflare-tunnel.example.yml). Never commit tunnel credentials or LAN IPs.

## Durable backend (launchd)

```bash
./scripts/install-backend-launch-agent.sh   # KeepAlive + RunAtLoad
./scripts/uninstall-backend-launch-agent.sh
```

## Overrides

| Env var | Effect |
|---------|--------|
| `GOAPI_ADDR` | Backend listen `host:port` (wins over `ports.json`) |
| `PORT` | Used only when `GOAPI_ADDR` unset; scripts prefer `ports.json` |
| `WEB_PORT` | Frontend listen port |
| `GOAPI_ORIGIN` | Next rewrite / route-proxy target **or** Go CORS origin (see README) |
