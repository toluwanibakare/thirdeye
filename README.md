<div align="center">

# THIRDEYE

### _ThirdEye watches your third parties._

A **continuous trust layer for third-party integrations** — every request an
authorized integration makes is scored against its declared purpose _before_ it
lands, then allowed, throttled, or quarantined.

**Continuous Integration Security Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey?logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-All_Rights_Reserved-red.svg)](./LICENSE)

**[The 90-second demo](#the-90-second-demo) · [How it works](#how-it-works) · [Quickstart](#quickstart) · [API reference](#api-reference) · [SDKs & Agent skill](#sdks--agent-skill)**

</div>

---

## Contents

- [The problem](#the-problem)
- [What ThirdEye is](#what-thirdeye-is)
- [How it works](#how-it-works)
- [The 90-second demo](#the-90-second-demo)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Monorepo layout](#monorepo-layout)
- [Quickstart](#quickstart)
- [API reference](#api-reference)
- [SDKs & Agent skill](#sdks--agent-skill)
- [Realtime](#realtime)
- [Deployment](#deployment)
- [Docs](#docs)
- [Team](#team)
- [License](#license)

---

## The problem

Modern apps run on third-party integrations — payments, delivery, analytics,
marketing. They are **authorized once, then trusted forever**. When one of them gets
compromised (or simply starts drifting), nothing stops to ask:

> _“Is this integration allowed to make this request — and does this request even
> make sense for what it's supposed to do?”_

API gateways do rate limiting. Monitors do dashboards. **Nobody continuously verifies
purpose.** That is the gap ThirdEye fills.

---

## What ThirdEye is

ThirdEye is **security middleware that sits between your application and its
third-party APIs**. Every outbound request passes through it first:

```text
APPLICATION  →  THIRDEYE MIDDLEWARE  →  RISK ENGINE  →  THIRD-PARTY API
```

Each request is judged on **declared purpose + approved scope + actual behaviour +
current context**, producing a **continuous trust score (0–100)** and a **graded
response** — never just on/off:

| Score  | Level      | Response                         |
| ------ | ---------- | -------------------------------- |
| 0–30   | TRUSTED    | `ALLOW`                          |
| 31–60  | SUSPICIOUS | `ALLOW` + `MONITOR`              |
| 61–80  | HIGH RISK  | `RATE_LIMIT` + `MONITOR`         |
| 81–100 | CRITICAL   | `BLOCK` + `QUARANTINE` + `ALERT` |

Hit critical and the integration is **quarantined** — every future request from it is
blocked until a human reviews and releases it. And the dashboard always explains
**_why_**, in plain language.

---

## How it works

### 1 · Trust profiles

Every integration registers what it is _supposed_ to do. This is its contract:

```json
{
  "id": "analytics_001",
  "name": "Analytics Provider",
  "purpose": "Collect anonymous usage statistics",
  "allowedEndpoints": ["/analytics/events", "/analytics/metrics"],
  "allowedMethods": ["GET", "POST"],
  "allowedData": ["anonymous_user_id", "page", "event", "timestamp"],
  "forbiddenData": ["payment", "phone", "address", "password"],
  "expectedRequestRate": 100
}
```

### 2 · Six checks on every request

`POST /api/check-request` runs each request through the full pipeline:

```text
REQUEST → IDENTIFY → ENDPOINT → PURPOSE → DATA → BEHAVIOUR → CONTEXT → SCORE → ACT
```

| #   | Check     | Question                                    |          Cost |
| --- | --------- | ------------------------------------------- | ------------: |
| 1   | Identity  | Does this `integrationId` even exist?       | +50 → `BLOCK` |
| 2   | Endpoint  | Is the endpoint inside `allowedEndpoints`?  |           +20 |
| 3   | Purpose   | Does the call match the registered purpose? |           +25 |
| 4   | Data      | Is it touching `forbiddenData`?             |           +30 |
| 5   | Behaviour | Is volume abnormal vs the baseline?         |           +20 |
| 6   | Context   | 3am traffic? Unknown method?                |      +5 / +10 |

Scores are **cumulative and capped at 100**. A known-good context — `black_friday`,
`campaign_launch`, `known_spike` — **subtracts 20**, so a sales-day surge never blocks
revenue on volume alone.

### 3 · Response engine + quarantine

<details>
<summary><strong>See the escalation ladder</strong></summary>
<br>

```text
RISK  8  →  ALLOW                    everything matches the contract
RISK 45  →  ALLOW + MONITOR          purpose drift detected, watching closely
RISK 72  →  RATE_LIMIT + MONITOR     forbidden data + volume spike
RISK 95  →  BLOCK + QUARANTINE       full breach — isolated until review
```

Quarantine flips the integration to `QUARANTINED`, emits an alert event, and blocks
everything from it. One click releases it back to `ACTIVE`.

</details>

### 4 · Tamper-evident audit log

Every violation is **SHA-256 hash-chained** — each event cryptographically linked to
the previous one. One click verifies the entire chain. Built for auditors, not just
developers.

---

## The 90-second demo

The whole pitch, live, in one flow:

1. **Initial Unconnected State**: Open ThirdEye (`/integrations` or `/dashboard`) — starts clean with 0 active connectors before project connection.
2. **Connect via Autonomous Agent Skill**: In StoreX project terminal, run `npm run thirdeye:connect` (or click `Connect Agent Skill` on UI).
   - Agent discovers 5 StoreX API connectors (`/api/payments`, `/api/delivery`, `/api/analytics`, `/api/campaigns`, `/api/agent`) and connects project `te_proj_storex_99a8b7c6`.
3. **Live Dashboard Update**: Refresh ThirdEye — all 5 StoreX integrations show active and protected!
4. **Attack Simulation & Quarantine**: Open `/simulator` → select **Segment Analytics** (or **StoreX Sales AI Agent Skill**) → **Start Attack Simulation**.
   - **Phase 1**: Normal `/analytics/events` traffic. Risk **8**, `ALLOW`.
   - **Phase 2**: Purpose & endpoint drift probing `/customers/profile`. Risk **45**, `MONITOR`.
   - **Phase 3**: Payment-data exfiltration + rate spike. Risk **72**, `RATE_LIMIT`.
   - **Phase 4**: Breach spike at 17.8× volume. Risk **95**, `BLOCK` + **QUARANTINE**.
5. **Dashboard Audit Explanation**: Dashboard displays exact root causes (purpose violation, PII leak, rate spike) and moves compromised integration to **QUARANTINE**.
6. **Release & Recover**: Click **Release** — integration is restored to `ACTIVE`.

> **The one sentence:** _ThirdEye continuously verifies that authorized third-party
> integrations behave within their intended purpose and approved scope — then
> progressively restricts them when behaviour turns risky._

---

## Features

- **Integration Registry** — full CRUD for third-party integrations and trust profiles
- **Request Interceptor** — the `check-request` middleware pipeline (pure, unit-testable engine)
- **Risk Engine** — additive 0–100 scoring, context-aware, golden-tested
- **Graded Response** — `ALLOW → MONITOR → RATE_LIMIT → BLOCK → QUARANTINE`, never binary
- **Security Event Log** — hash-chained, verifiable, exportable to CSV/JSON
- **Live Dashboard** — KPI stats, trust table, topology map, activity timeline
- **Integration Map** — live `Store → ThirdEye → partners` traffic topology
- **Attack Simulator** — the 4-phase credential-compromise demo in a single button
- **Realtime + fallback** — Supabase Realtime pushes with 5s polling backup (venue-wifi-proof)
- **SDKs** — TypeScript + Python guard clients
- **Agent Skill** — hand ThirdEye to an AI coding agent and it wires itself up
- **Command-center UI** — dark theme, risk badges, glass cards, animated charts

---

## Tech stack

| Layer    | Choice                                                     |
| -------- | ---------------------------------------------------------- |
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind · Recharts |
| Backend  | Node.js · Express 5 · TypeScript                           |
| Database | Supabase Postgres (+ Realtime + RLS)                       |
| Shared   | npm workspaces — `apps/web`, `apps/api`, `packages/*`      |
| Deploy   | Vercel (web) · Render/Railway (api) · Supabase (db)        |

> **Enforced in code:** the frontend _never_ writes to Supabase directly — all writes
> go through Express. Reads subscribe to Realtime for instant updates.

---

## Monorepo layout

```text
thirdeye/
├── apps/
│   ├── web/                  # Next.js console — landing, dashboard,
│   │                         # integrations[/:id], events, simulator, settings
│   └── api/                  # Express — risk engine, CRUD, simulator, StoreX demo service
├── packages/
│   ├── shared/               # Shared TS types — single source of truth
│   ├── sdk-typescript/       # @the-third-eye/sdk (guard client + Express middleware)
│   └── sdk-python/           # thirdeye-sdk (guard client + decorator)
├── supabase/                 # migrations.sql + seed.sql (4 demo integrations)
├── skills/thirdeye/          # Agent skill (open AgentSkills format)
├── docs/                     # prd.md · TECH_PRD.md · PAYLOADS.md + challenge briefs
├── assets/                   # Brand sources (served images live in apps/web/public/)
├── LICENSE                   # MIT
└── .env.example              # Env template
```

---

## Quickstart

### Prerequisites

- Node.js 20+ and npm 10+
- A free [Supabase](https://supabase.com/) project — _optional_. Without keys the API
  serves seed data from memory and the UI runs in `DEMO` mode instead of `LIVE`.

### 1 · Environment

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# then fill in SUPABASE_URL, keys, NEXT_PUBLIC_API_URL, WEB_URL
```

### 2 · Database

In the Supabase SQL editor, run in order:

1. `supabase/migrations.sql` — tables, RLS policies, realtime publication
2. `supabase/seed.sql` — the four demo integrations

Then enable Realtime on `integrations`, `requests` and `security_events`.

### 3 · Install & run

```bash
npm install

npm run dev        # web only → http://localhost:3000 → /dashboard
npm run dev:api    # api only → http://localhost:4000  (GET /healthz)
npm run dev:all    # both together
```

### 4 · Run the attack

`/simulator` → **Credential Compromise** on `analytics_001` → watch
`8 → 45 → 72 → 95` → `BLOCK` + `QUARANTINE`.

---

## API reference

Base URL `http://localhost:4000`. Every response carries `X-Request-Id` and
`X-Response-Time`, and all DTOs are **dual-cased** (`risk_score` _and_ `riskScore`)
so clients never hit `undefined`.

| Method | Endpoint                           | What it does                              |
| ------ | ---------------------------------- | ----------------------------------------- |
| POST   | `/api/check-request`               | Score a request → risk, level, action     |
| GET    | `/api/integrations`                | List integrations (`?status&search&sort`) |
| GET    | `/api/integrations/:id`            | Trust profile + behaviour + violations    |
| GET    | `/api/integrations/:id/history`    | Traffic/risk series for charts            |
| POST   | `/api/integrations`                | Register an integration                   |
| PATCH  | `/api/integrations/:id`            | Update purpose / baseline / status        |
| POST   | `/api/integrations/:id/quarantine` | Quarantine (risk → 95, block all)         |
| POST   | `/api/integrations/:id/release`    | Release back to `ACTIVE` (risk → 8)       |
| GET    | `/api/security-events`             | Audit log (`?integrationId&limit`)        |
| GET    | `/api/security-events/verify`      | Verify the SHA-256 chain                  |
| GET    | `/api/security-events/export`      | Audit log download (`?format=csv\|json`)  |
| GET    | `/api/dashboard/stats`             | KPI cards                                 |
| GET    | `/api/dashboard/activity`          | Live activity feed                        |
| POST   | `/api/simulator/start`             | Begin attack run → phases                 |
| POST   | `/api/simulator/stop`              | Halt the run                              |
| POST   | `/api/simulator/reset`             | Reset target to baseline                  |
| GET    | `/healthz`                         | Liveness probe                            |

<details>
<summary><strong>Example — catching an exfiltration attempt</strong></summary>
<br>

```bash
curl -X POST http://localhost:4000/api/check-request \
  -H 'Content-Type: application/json' \
  -d '{
    "integrationId": "analytics_001",
    "method": "GET",
    "endpoint": "/customers/payment-details",
    "dataRequested": ["payment", "phone", "address"],
    "requestCount": 1780
  }'
```

```json
{
  "riskScore": 95,
  "level": "CRITICAL",
  "action": "BLOCK",
  "violations": [
    { "code": "UNKNOWN_ENDPOINT", "points": 20 },
    { "code": "PURPOSE_MISMATCH", "points": 25 },
    { "code": "FORBIDDEN_DATA", "points": 30 },
    { "code": "ABNORMAL_VOLUME", "points": 20 }
  ],
  "reason": "…"
}
```

</details>

Full payload contracts: [`docs/PAYLOADS.md`](./docs/PAYLOADS.md).

---

## SDKs & Agent skill

**Use ThirdEye from anywhere** — no-code dashboard, a 3-line SDK, or zero effort via AI:

### SDK Quickstart

Install the official SDKs:

```bash
# TypeScript / Node.js
npm install @the-third-eye/sdk

# Python
pip install thirdeye-sdk
```

```ts
// TypeScript
import { ThirdEyeClient, wrapOutbound } from '@the-third-eye/sdk';

const te = new ThirdEyeClient({ baseUrl: process.env.THIRDEYE_API_URL });
const safeFetch = wrapOutbound(te, { integrationId: 'stripe_001', endpoint: '/payments' }, fetch);
```

```python
# Python
from thirdeye import ThirdEyeClient, guard

te = ThirdEyeClient()

@guard("stripe_001", "/payments", client=te)
def charge_stripe(order_id, amount):
    ...
```

---

### Agent Skill Setup (for Coding Agents)

ThirdEye ships with a production-grade **Agent Skill** (`skills/thirdeye/SKILL.md`) that teaches autonomous coding agents (**Antigravity**, **Claude Code**, **Cursor**, **GitHub Copilot**) how to audit, guard, and verify integrations.

#### 1. Install into any project (One-Liner)

Run in the root of your project:

```bash
curl -fsSL https://raw.githubusercontent.com/toluwanibakare/thirdeye/main/skills/install.sh | bash
```

Or using `npx degit`:

```bash
# For Antigravity / Gemini CLI / Cursor:
npx degit toluwanibakare/thirdeye/skills/thirdeye .agents/skills/thirdeye

# For Claude Code:
npx degit toluwanibakare/thirdeye/skills/thirdeye .claude/skills/thirdeye
```

> **Global machine-wide install:**
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/toluwanibakare/thirdeye/main/skills/install.sh | bash -s -- --global
> ```

#### 2. What your coding agent can do

Once installed, prompt your agent in plain English:

- **Audit**: _"Audit this project with ThirdEye to find all external API calls and sensitive parameters."_
- **Trust Profile**: _"Generate a ThirdEye Trust Profile for Stripe and SendGrid and register it."_
- **Wire SDK Guards**: _"Guard our checkout API route with `@the-third-eye/sdk` (or `thirdeye-sdk`) against exfiltration."_
- **Agentic AI Security**: _"Guard our LangChain / OpenAI tool calls with ThirdEye so the agent cannot leak PII."_
- **Verify**: _"Run the ThirdEye golden probes to confirm our guards work."_

- Verification suite: `bash skills/thirdeye/scripts/verify_skill.sh`
- Complete recipes: `skills/thirdeye/references/coding-agent-recipes.md`

---

### Publishing SDKs (npm & PyPI)

#### Publish TypeScript SDK to npm

```bash
# 1. Build and verify package
npm run build --workspace=@the-third-eye/sdk
npm pack --workspace=@the-third-eye/sdk --dry-run

# 2. Publish to npm public registry
npm publish --workspace=@the-third-eye/sdk --access public
```

#### Publish Python SDK to PyPI

```bash
# 1. Build sdist and wheel
python3 -m build packages/sdk-python
python3 -m twine check packages/sdk-python/dist/*

# 2. Upload to PyPI
python3 -m twine upload packages/sdk-python/dist/*
```

---

## Realtime

Backend writes → Supabase → the frontend subscribes to `security_events` inserts and
re-renders instantly. If Realtime is unreachable, 5-second polling takes over
automatically — the demo never depends on venue wifi.

---

## Deployment

| Service    | Target         | Env vars                                                                           |
| ---------- | -------------- | ---------------------------------------------------------------------------------- |
| `apps/web` | Vercel         | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `apps/api` | Render/Railway | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEB_URL`, `PORT`                     |
| Database   | Supabase       | run `migrations.sql` → `seed.sql`, enable Realtime                                 |

Warm `GET /healthz` before demoing (cold starts are real), and keep a backup
recording — judges love live demos, but engineers keep receipts.

---

## Docs

- [`docs/prd.md`](./docs/prd.md) — product spec, the _what_ and _why_
- [`docs/TECH_PRD.md`](./docs/TECH_PRD.md) — engineering spec, the _how_
- [`docs/PAYLOADS.md`](./docs/PAYLOADS.md) — complete API payload contracts
- Challenge briefs — `docs/ICSC2026-challenge-statements.pdf`, `docs/TrustGuard-user-story.pdf`

---

## Team

**Team** — two backend, two frontend:

- **BE-1** — schema, seed, CRUD, stats/activity
- **BE-2** — risk engine, `check-request`, quarantine, simulator
- **FE-1** — dashboard, topology map, integration detail
- **FE-2** — events timeline, simulator, settings

---

## License

All rights reserved — see [LICENSE](./LICENSE). No copying, modification, or
distribution without prior written permission. Built with paranoia and care by
Team G1.

<div align="center">

**ThirdEye watches your third parties.**

</div>
