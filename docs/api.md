# Bimex API

The indexer exposes a small HTTP API for the frontend on `API_PORT` (default `3002`). All JSON responses include CORS headers and expose rate-limit headers so browser clients can read them.

## Public endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/proyectos?estado=<estado>` | Lists projects, optionally filtered by state. |
| `GET` | `/proyectos/:id` | Returns a single project. Shares the `/proyectos` rate-limit bucket. |
| `GET` | `/proyectos/:id/aportaciones` | Lists project contributions. Shares the `/proyectos` rate-limit bucket. |
| `GET` | `/backers/:address/aportaciones` | Lists contributions by contributor address. |
| `GET` | `/eventos?tipo=<tipo>&limit=<n>` | Lists indexed events. `limit` defaults to `50` and is capped at `200`. |
| `GET` | `/stats` | Returns aggregate platform statistics. |
| `GET` | `/sse` | Server-Sent Events stream for realtime frontend updates. |
| `POST` | `/faucet` | Testnet-only faucet. Body: `{ "destino": "<stellar address>" }`. |

## Rate limits

Rate limits are enforced in `bimex-indexer/rateLimiter.js` and applied from `bimex-indexer/api.js`.

| Scope | Default limit | Bucket key | Notes |
|---|---:|---|---|
| `/proyectos`, `/eventos`, `/stats` | `60` requests / minute / IP | endpoint family + client IP | `/proyectos/:id` and `/proyectos/:id/aportaciones` share the `/proyectos` bucket to prevent bypassing the collection endpoint. |
| `/sse` | `5` simultaneous connections / IP | client IP | Connections are released on socket close. With Supabase storage, stale connections expire via TTL. |
| `/faucet` | `3` requests / hour / wallet | destination wallet | Preserves the existing faucet protection and now emits standard headers/logs. |

### Rate-limit headers

Limited responses include both modern `RateLimit-*` headers and the legacy `X-RateLimit-*` headers requested by clients:

- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset` (seconds until reset)
- `RateLimit-Policy`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset` (epoch seconds)
- `Retry-After` on blocked requests (`429`)

Example blocked response:

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 60
RateLimit-Remaining: 0
RateLimit-Reset: 42
RateLimit-Policy: 60;w=60
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1782298123
Retry-After: 42
Content-Type: application/json
```

```json
{
  "error": "Rate limit exceeded",
  "message": "Máximo 60 solicitudes por minuto por IP para /eventos"
}
```

## Shared storage

By default `RATE_LIMIT_STORE=supabase`. Run `bimex-indexer/schema.sql` in Supabase to create the shared rate-limit tables and RPC functions:

- `api_rate_limits`
- `api_rate_limit_blocks`
- `api_sse_connections`
- `consume_api_rate_limit(...)`
- `acquire_api_sse_connection(...)`
- `release_api_sse_connection(...)`

If the Supabase migration is not present or temporarily unavailable, the API logs one warning and safely falls back to in-memory counters so the process still protects itself.

## Configuration

| Variable | Default | Description |
|---|---:|---|
| `RATE_LIMIT_STORE` | `supabase` | Use `supabase` for shared limits or any other value for in-memory only. |
| `RATE_LIMIT_DISABLED` | `false` | Set to `true` only for controlled local debugging. |
| `RATE_LIMIT_PUBLIC_MAX` | `60` | Max requests for `/proyectos`, `/eventos`, and `/stats`. |
| `RATE_LIMIT_PUBLIC_WINDOW_MS` | `60000` | Window size for public endpoint buckets. |
| `RATE_LIMIT_SSE_CONNECTIONS` | `5` | Max simultaneous `/sse` connections per IP. |
| `RATE_LIMIT_SSE_TTL_SECONDS` | `90` | Supabase TTL for stale SSE connections; active clients refresh before expiry. |
| `RATE_LIMIT_FAUCET_MAX` | `3` | Max faucet requests per wallet. |
| `RATE_LIMIT_FAUCET_WINDOW_MS` | `3600000` | Faucet bucket window. |
| `RATE_LIMIT_WHITELIST_IPS` | empty | Comma-separated exact IPs or IPv4 CIDR ranges allowed to bypass API/SSE IP limits (for example internal Vercel/proxy IPs). |
| `TRUST_PROXY` | `true` | When true, client IP is read from `X-Forwarded-For`/`X-Real-IP` before the socket address. |

## Load-test checks

With the API running locally and `RATE_LIMIT_STORE=memory` for deterministic single-process checks:

```bash
# 61 requests to a 60/min endpoint: last response must be 429.
for i in $(seq 1 61); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-Forwarded-For: 203.0.113.10" \
    http://localhost:3002/eventos?limit=200
done | tail -1

# Inspect RFC/de-facto rate-limit headers.
curl -i -H "X-Forwarded-For: 203.0.113.11" http://localhost:3002/stats

# Open more than 5 SSE connections from the same IP; the 6th must return 429.
for i in $(seq 1 5); do
  curl -N -H "X-Forwarded-For: 203.0.113.12" http://localhost:3002/sse >/tmp/bimex-sse-$i.log &
done
curl -i -H "X-Forwarded-For: 203.0.113.12" http://localhost:3002/sse
pkill -f 'curl -N .*localhost:3002/sse' || true
```
