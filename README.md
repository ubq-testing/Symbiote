<p align="center">
  <img src="https://img.shields.io/badge/status-experimental-orange" alt="Status: Experimental" />
  <img src="https://img.shields.io/badge/runtime-Deno%20|%20Cloudflare-blue" alt="Runtime: Deno | Cloudflare" />
  <img src="https://img.shields.io/badge/ai-powered-brightgreen" alt="AI Powered" />
</p>

# 🧬 Symbiote

> *Your asynchronous symbiont on GitHub—working entirely on your behalf, for your benefit.*

Symbiote is a proactive, AI-powered GitHub automation agent that monitors your activity, understands context, and acts on your behalf. It processes notifications, responds to reviews, creates pull requests, and keeps your workflow moving—even while you sleep.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Mental Models & Paradigms](#mental-models--paradigms)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Commands](#commands)
- [API Reference](#api-reference)
- [Telegram Integration](#telegram-integration)
- [Development](#development)
- [Security Model](#security-model)

---

## Overview

### The Problem

GitHub developers are inundated with notifications: review requests, mentions, CI failures, issue updates. Most require context gathering before any action can be taken. This cognitive overhead slows down development and creates bottlenecks.

### The Solution

Symbiote acts as your always-on development partner:

- **🔍 Monitors** your GitHub notifications and events continuously
- **🧠 Understands** context by fetching related issues, PRs, commits, and comments
- **🎯 Classifies** each notification by priority and required action
- **⚡ Acts** on your behalf—responding to reviews, creating PRs, posting comments
- **💬 Communicates** via Telegram when human judgment is needed

### What Makes Symbiote Different

| Feature | Traditional Bots | Symbiote |
|---------|-----------------|----------|
| Trigger | Webhook-driven (reactive) | Poll-driven (proactive) |
| Auth | Single token | Three-tier OAuth system |
| Scope | Single repo | Entire user activity |
| Intelligence | Rule-based | AI-powered with tool use |
| Communication | None | Real-time via Telegram |

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER'S GITHUB ACTIVITY                         │
│   @mentions • review requests • assignments • comments • CI updates      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYMBIOTE POLLING LOOP                            │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ Poll Events  │───▶│ Poll Notifs  │───▶│ Telegram Rx  │               │
│  │  (60s cycle) │    │              │    │              │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│          │                  │                   │                        │
│          └──────────────────┴───────────────────┘                        │
│                             │                                            │
│                             ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    AI CLASSIFICATION                             │    │
│  │                                                                   │    │
│  │   Input: notification + latest comment + repo context            │    │
│  │                                                                   │    │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │    │
│  │   │   RESPOND   │  │ INVESTIGATE │  │   IGNORE    │              │    │
│  │   │  (act now)  │  │ (need info) │  │  (no action)│              │    │
│  │   └─────────────┘  └─────────────┘  └─────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                             │                                            │
│                             ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    AI TOOL EXECUTION                             │    │
│  │                                                                   │    │
│  │   Read Tools              Write Tools          Telegram Tools    │    │
│  │   ───────────             ───────────          ──────────────    │    │
│  │   • fetch_pr_details      • create_comment     • send_message    │    │
│  │   • fetch_issue           • create_pr          • await_response  │    │
│  │   • fetch_comments        • create_review                        │    │
│  │   • fetch_commits         • update_issue                         │    │
│  │   • fetch_reviews         • add_reaction                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ACTIONS PERFORMED                               │
│   Comments posted • PRs created • Reviews submitted • Issues updated     │
│                    (all appear as: "User • with Symbiote")               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lifecycle

1. **Trigger**: User runs `/symbiote start` in any issue or PR
2. **OAuth**: If needed, Symbiote requests user authorization via GitHub OAuth
3. **Dispatch**: Worker dispatches a GitHub Actions workflow (`compute.yml`)
4. **Polling Loop**: Action polls events/notifications every 60 seconds
5. **AI Classification**: Each notification is assessed for priority and action
6. **Tool Execution**: AI uses read tools to gather context, write tools to act
7. **Auto-Restart**: After ~5 hours, action signals worker to spawn a fresh instance

---

## Architecture

### Dual Runtime System

Symbiote operates across two distinct runtimes, each optimized for its purpose:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WORKER (Edge)                               │
│                     Cloudflare Workers / Deno Deploy                     │
│                                                                          │
│  Purpose: Lightweight request handling, OAuth, routing                   │
│                                                                          │
│  Endpoints:                                                              │
│  ├── POST /kernel/:stateId  →  Kernel webhook (Ubiquity OS integration) │
│  ├── POST /callback         →  Action-to-worker communication           │
│  ├── GET  /oauth/callback   →  GitHub OAuth token exchange              │
│  └── POST /telegram         →  Telegram bot webhook                     │
│                                                                          │
│  Responsibilities:                                                       │
│  • Parse incoming webhooks & slash commands                              │
│  • Manage OAuth flow & token storage                                     │
│  • Dispatch GitHub Actions workflows                                     │
│  • Receive restart/stop signals from Action                              │
│  • Store/retrieve Telegram messages via Deno KV                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    workflow_dispatch (inputs: stateId, authToken, etc.)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            ACTION (Compute)                              │
│                          GitHub Actions Workflow                         │
│                                                                          │
│  Purpose: Long-running compute, AI inference, GitHub API operations      │
│                                                                          │
│  Lifecycle: Runs up to 6 hours (5 hours + 1 hour safety buffer)          │
│                                                                          │
│  Responsibilities:                                                       │
│  • Poll user events & notifications (every 60s)                          │
│  • Determine routing: kernel-forwarded | safe-action | unsafe-action     │
│  • Run AI classification on each notification                            │
│  • Execute suggested actions via tool calls                              │
│  • Monitor runtime and signal restart when threshold reached             │
│  • Process unsolicited Telegram messages from host                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Event Routing

Symbiote intelligently routes events based on repository context:

| Routing | Condition | Auth Used |
|---------|-----------|-----------|
| **kernel-forwarded** | Repo has Ubiquity App installed | App installation token |
| **safe-action** | Public repo, no Ubiquity App | App authentication |
| **unsafe-action** | Private repo or no app access | User's OAuth token |

### Three-Tier Authorization

```typescript
/**
 * appOctokit    → GitHub App (APP_ID + PRIVATE_KEY)
 *                 Use for: listing installations, dispatching workflows
 *
 * hostOctokit   → User PAT (SYMBIOTE_HOST_PAT)
 *                 Use for: polling events, accessing private repos
 *
 * symbioteOctokit → User OAuth (from OAuth flow)
 *                   Use for: creating comments, PRs, reviews
 *                   Actions appear as: "Username · with AppName"
 */
```

This separation ensures:
- **App-level operations** don't consume user rate limits
- **Polling** works with full user access (including private repos)
- **Public actions** are properly attributed to the user

---

## Mental Models & Paradigms

### 1. Symbiosis, Not Automation

Symbiote isn't a bot that follows scripts—it's a partner that understands your workflow:

```
Traditional Bot:          Symbiote:
───────────────           ─────────
IF review_requested       "Let me understand this review request.
THEN post_template        What's the context? What changes are needed?
                          I'll implement them in a symbiote branch,
                          open a PR for you to verify, and move on."
```

### 2. Fork-First Philosophy

Symbiote **never** modifies upstream repositories directly. All work happens in the host's fork:

```
Upstream Repo                    Your Fork                     Symbiote Branch
(organization/project)           (you/project)                 (you/project)
        │                              │                              │
        │   PR: feature-x              │                              │
        │◀─────────────────────────────│                              │
        │                              │   PR: symbiote/fix-review    │
        │                              │◀─────────────────────────────│
        │                              │                              │
        ▼                              ▼                              ▼
```

This ensures:
- All Symbiote code is **untrusted until you verify it**
- You maintain **full control** over what gets merged
- Upstream repos are **never touched** without your explicit action

### 3. Classification → Investigation → Action

Every notification follows a three-phase decision process:

```
Phase 1: CLASSIFY
┌──────────────────────────────────────────────────────────┐
│ Input: Notification + Latest Comment                      │
│ Output: { shouldAct, priority, confidence, classification } │
│                                                           │
│ Classifications:                                          │
│ • respond  → Take action now                              │
│ • investigate → Need more context first                   │
│ • ignore   → No action needed                             │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
Phase 2: INVESTIGATE (if needed)
┌──────────────────────────────────────────────────────────┐
│ Read-Only Tools:                                          │
│ • fetch_pull_request_details                              │
│ • fetch_issue_details                                     │
│ • fetch_recent_comments                                   │
│ • fetch_commit_details                                    │
│ • fetch_pull_request_reviews                              │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
Phase 3: ACT
┌──────────────────────────────────────────────────────────┐
│ Write Tools (via symbioteOctokit):                        │
│ • create_comment, create_pull_request                     │
│ • create_review, update_issue                             │
│ • add_reaction                                            │
│                                                           │
│ Telegram Tools (if enabled):                              │
│ • send_telegram_message (with optional await_response)    │
└──────────────────────────────────────────────────────────┘
```

### 4. Continuous Runtime with Auto-Restart

GitHub Actions has a 6-hour limit. Symbiote handles this gracefully:

```
Hour 0                    Hour 5                     Hour 6 (limit)
   │                         │                           │
   ▼                         ▼                           ▼
┌──────────────────────────────────────────────────────────┐
│ Action Instance #1                                        │
│ [polling] ──────────────────────────── [restart signal]  │
└──────────────────────────────────────────────────────────┘
                                              │
                              POST /callback (server.restart)
                                              │
                                              ▼
                         ┌──────────────────────────────────┐
                         │ Worker dispatches new workflow    │
                         └──────────────────────────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────┐
│ Action Instance #2                                        │
│ [polling] ──────────────────────────────────────────────  │
└──────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 24.11.0 or **Deno** (recommended)
- **Bun** (for local development)
- A **GitHub App** with appropriate permissions
- A **Cloudflare Workers** or **Deno Deploy** account

### 1. Fork & Clone

```bash
# Fork this repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/Symbiote.git
cd Symbiote
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .dev.vars.example .dev.vars
```

Required variables:

```bash
# GitHub App Configuration
APP_ID=1234567
APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Symbiote Host (the user this instance serves)
SYMBIOTE_HOST='{"USERNAME": "your-github-username", "FORKED_REPO": "your-username/Symbiote"}'
SYMBIOTE_HOST_PAT="ghp_xxxxxxxxxxxxxxxxxxxx"  # Personal Access Token

# OAuth Configuration (from your GitHub App)
OAUTH='{"CLIENT_ID": "Iv1.xxx", "CLIENT_SECRET": "xxx", "REDIRECT_URI": "https://your-worker.workers.dev/oauth/callback"}'

# Token Encryption (for encrypting OAuth tokens at rest)
# Generate with: openssl rand -base64 32
TOKEN_ENCRYPTION_KEY="your-base64-encoded-32-byte-key"

# Worker Communication
WORKER_SECRET="a-strong-random-secret"
WORKER_URL="https://your-worker.workers.dev"

# AI Configuration
AI_API_KEY="sk-or-v1-xxxx"  # OpenRouter API key

# Deno KV (for state persistence across runtimes)
DENO_KV_UUID="your-deno-kv-database-id"
DENO_KV_ACCESS_TOKEN="your-deno-deploy-token"

# Optional: Telegram Integration
TELEGRAM='{"BOT_TOKEN": "123456:ABC-DEF", "USER_ID": "123456789"}'
```

### 4. Set Up GitHub Secrets

In your forked repository, add these secrets (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `APP_ID` | Your GitHub App ID |
| `APP_PRIVATE_KEY` | GitHub App private key (PEM format) |
| `SYMBIOTE_HOST` | JSON with USERNAME and FORKED_REPO |
| `SYMBIOTE_HOST_PAT` | Personal access token for the host user |
| `OAUTH` | JSON with CLIENT_ID, CLIENT_SECRET, REDIRECT_URI |
| `TOKEN_ENCRYPTION_KEY` | Base64 key for encrypting OAuth tokens (`openssl rand -base64 32`) |
| `WORKER_SECRET` | Shared secret for worker-action communication |
| `WORKER_URL` | Your deployed worker URL |
| `AI_API_KEY` | OpenRouter or OpenAI API key |
| `DENO_KV_UUID` | Deno KV database UUID |
| `DENO_DEPLOY_TOKEN` | Deno Deploy access token |

### 5. Deploy the Worker

**Option A: Cloudflare Workers**

```bash
wrangler login
wrangler deploy --env prod
```

**Option B: Deno Deploy**

Push to your repository. If you've configured Deno Deploy, it will auto-deploy from `.github/workflows/deno-deploy.yml`.

### 6. Start Symbiote

In any issue or PR on a repository where the GitHub App is installed:

```
/symbiote start
```

---

## Configuration

### Plugin Settings

Configure via `manifest.json` or per-repository settings:

```json
{
  "executionBranch": "development",
  "pollIntervalSeconds": 60,
  "maxRuntimeHours": 6,
  "runtimeCheckIntervalMinutes": 60,
  "aiConfig": {
    "kind": "OpenRouter",
    "model": "x-ai/grok-4.1-fast",
    "baseUrl": "https://openrouter.ai/api/v1"
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `executionBranch` | `"development"` | Branch to run workflows from |
| `pollIntervalSeconds` | `60` | Seconds between event polling |
| `maxRuntimeHours` | `6` | Max runtime before auto-restart |
| `runtimeCheckIntervalMinutes` | `60` | How often to check runtime |
| `aiConfig.model` | `"x-ai/grok-4.1-fast"` | LLM model identifier |
| `aiConfig.baseUrl` | OpenRouter URL | LLM API endpoint |

### GitHub App Permissions

Your GitHub App needs these permissions:

**Repository Permissions:**
- Actions: Read & Write
- Contents: Read & Write
- Issues: Read & Write
- Pull Requests: Read & Write
- Workflows: Read & Write

**Account Permissions:**
- Email: Read
- Notifications: Read

**Subscribe to Events:**
- Issue comment
- Issues
- Pull request
- Pull request review

---

## Commands

Control Symbiote via slash commands in any issue or PR:

| Command | Description |
|---------|-------------|
| `/symbiote start` | Start monitoring your GitHub activity |
| `/symbiote stop` | Stop the running Symbiote instance |
| `/symbiote restart` | Restart with fresh state |

---

## API Reference

### Worker Endpoints

#### `POST /kernel/:stateId`

Handles callbacks from the Ubiquity OS kernel.

#### `POST /callback`

Receives signals from the Action runtime (restart, stop).

```typescript
// Request
{
  "action": "server.restart",
  "client_payload": {
    "stateId": "uuid",
    "sessionId": "uuid",
    "workflowId": 12345
  }
}
```

#### `GET /oauth/callback`

Handles GitHub OAuth authorization callback.

Query params: `code`, `state`

#### `POST /telegram`

Receives incoming Telegram messages (webhook endpoint).

#### `POST /telegram/init`

Initializes the Telegram webhook. Call once after deployment.

```bash
curl -X POST https://your-worker.workers.dev/telegram/init
```

#### `GET /health`

Health check endpoint. Returns Telegram configuration status.

```json
{ "ok": true, "telegram": "configured" }
```

---

## Telegram Integration

Enable real-time communication with Symbiote via Telegram:

### Setup

1. **Create a bot** via [@BotFather](https://t.me/botfather)
   - Send `/newbot` and follow the prompts
   - Save the bot token (looks like `123456:ABC-DEF...`)

2. **Configure environment**:
   ```bash
   TELEGRAM='{"BOT_TOKEN": "123456:ABC-DEF...", "WEBHOOK_URL": "https://your-worker.workers.dev/telegram"}'
   ```

3. **Initialize the webhook** (after deployment):
```bash
   # Option A: Call the init endpoint
   curl -X POST https://your-worker.workers.dev/telegram/init

   # Option B: Send any message to your bot - it auto-registers on first contact
   ```

4. **Register yourself as host**: Send any message to your bot. The first user to message becomes the host (only they can communicate with Symbiote).

### How Webhook Registration Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Deploy Worker                                                         │
│    └── TELEGRAM env var contains BOT_TOKEN + WEBHOOK_URL                 │
│                                                                          │
│ 2. Initialize Webhook (one of):                                          │
│    ├── POST /telegram/init  →  Registers webhook with Telegram API       │
│    └── First incoming message → Lazy initialization                      │
│                                                                          │
│ 3. First Message to Bot                                                  │
│    └── Sender becomes the "host" (stored in KV)                          │
│    └── Only host can communicate with Symbiote                           │
│                                                                          │
│ 4. Ongoing Communication                                                 │
│    └── Telegram sends updates to /telegram endpoint                      │
│    └── Symbiote processes and responds                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Security Model

- **First-user binding**: The first person to message the bot becomes the host
- **Single-user only**: All other users are ignored
- **Webhook secret**: Optional `WEBHOOK_SECRET` for additional validation
- **Persistent binding**: Host identity stored in Deno KV (survives restarts)

### Capabilities

When Telegram is enabled, Symbiote can:

- **Send notifications** about important events
- **Ask for clarification** when uncertain
- **Request approval** before taking actions
- **Wait for your response** with configurable timeout

```
🤖 Welcome, Alex!

You are now registered as the host for this Symbiote bot.

I'll send you notifications about your GitHub activity and you can
send me messages to respond to actions.
```

---

## Development

### Local Development

```bash
# Start the worker (with hot reload)
bun run dev:bun

# Or with Deno
bun run dev:deno
```

### Testing

```bash
# Run tests with coverage
bun run test

# Run OAuth flow test
bun run test:oauth
```

### Code Quality

```bash
# Format code
bun run format

# Check formatting (CI)
bun run check-formatting

# Find unused exports
bun run knip
```

### Project Structure

```
src/
├── worker.ts              # Edge runtime entry point
├── action.ts              # GitHub Actions entry point
├── index.ts               # Shared plugin logic
├── adapters/
│   ├── ai/
│   │   ├── adapter.ts     # AI classification & execution
│   │   ├── tools.ts       # GitHub read/write tools
│   │   ├── telegram-tools.ts
│   │   └── prompts/       # System prompts for AI
│   ├── kv.ts              # Deno KV adapter
│   └── telegram/          # Telegram messaging
├── handlers/
│   ├── worker/            # Worker-side handlers
│   │   ├── routes/        # HTTP route handlers
│   │   └── symbiote-server.ts
│   ├── action/            # Action-side handlers
│   │   ├── server/        # Polling loop & event processing
│   │   └── symbiote-server.ts
│   ├── dispatcher.ts      # Workflow dispatch logic
│   └── octokit.ts         # Octokit factory functions
├── types/
│   ├── context.ts         # Core context type definitions
│   ├── env.ts             # Environment schemas (TypeBox)
│   └── ...
└── utils/
    ├── crypto.ts          # AES-256-GCM encryption for tokens
    ├── env.ts             # Environment validation
    ├── kv.ts              # KV key builders
    └── runtime-tracker.ts # Runtime monitoring
```

---

## Security Model

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUSTED ZONE                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Your Fork   │  │ Deno KV      │  │  Secrets     │       │
│  │  (symbiote/) │  │ (tokens,     │  │  (encrypted) │       │
│  │              │  │  state)      │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                       VERIFICATION REQUIRED
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   UNTRUSTED ZONE                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Symbiote PRs │  │ AI Outputs   │                         │
│  │ (review      │  │ (verify      │                         │
│  │  before      │  │  before      │                         │
│  │  merging)    │  │  approving)  │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Principles

1. **OAuth tokens are encrypted at rest** using AES-256-GCM
2. **Symbiote never pushes to upstream repos**—only to your fork
3. **All Symbiote PRs require your review** before merging
4. **Worker-Action communication uses WORKER_SECRET** for authentication
5. **Telegram only accepts messages from configured USER_ID**

### Token Encryption

OAuth tokens are encrypted before storage using industry-standard cryptography:

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Size | 256 bits (32 bytes) |
| IV Size | 96 bits (12 bytes, random per encryption) |
| Auth Tag | 128 bits |

```bash
# Generate an encryption key
openssl rand -base64 32
```

Legacy unencrypted tokens are automatically migrated to encrypted format on first read.

### Token Scopes

| Token | Scope | Stored Where |
|-------|-------|--------------|
| App Private Key | App-level auth | GitHub Secrets |
| Host PAT | Polling & private repos | GitHub Secrets |
| OAuth Token | User-facing actions | Deno KV (AES-256-GCM encrypted) |
| Encryption Key | Token encryption | GitHub Secrets |

---

## License

MIT © Ubiquity DAO

---

<p align="center">
  <i>Symbiote: Your GitHub, on autopilot.</i>
</p>
