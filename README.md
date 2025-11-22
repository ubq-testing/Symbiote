# Symbiote

A proactive GitHub automation agent that polls user events and acts on their behalf.

## Concept

- Users fork the Symbiote repo and set a `GH_PAT` environment variable
- Edge worker creates sessions and dispatches long-running GitHub Actions workflows
- Main workflow polls GitHub's `user/events` API every 60 seconds for 6 hours
- When events are detected, routing logic determines:
  1. **Kernel-forwarded**: Events from repos with ubiquity app installed → kernel handles
  2. **Safe actions**: Public repos → app authentication
  3. **Unsafe actions**: Private repos → queued for main workflow with user auth
- Worker handles session management and state-based communication
- All data persisted to `__STORAGE__` branch

## Event Routing

- **Kernel-forwarded**: Events from repos with ubiquity app → kernel handles via existing infrastructure
- **App authentication**: Public repos without ubiquity app → safe to use app permissions
- **User authentication**: Private repos or sensitive actions → main workflow handles with user's PAT

## POC Implementation

This is a proof-of-concept implementation with the following features:

- ✅ **Session Management**: Long-lived workflow sessions with automatic cleanup
- ✅ **State-based Communication**: Kernel forwards requests via state_id routing
- ✅ **Storage Layer**: Persistent data storage on `__STORAGE__` branch
- ✅ **Event Routing**: Intelligent routing based on ubiquity app installation status
- ✅ **Concurrent Workflows**: Multiple users can have active sessions simultaneously
- ✅ **Secure Callbacks**: Workflow-to-worker communication with session validation




















## Getting Started

1. Fork this repository
2. Clone your fork locally
3. Install dependencies: `bun install`
4. Copy `.dev.vars.example` to `.dev.vars` and fill in your GitHub PAT
5. Run locally: `bun run dev:bun`

## Configuration

Create a `.dev.vars` file with:

```bash
GH_PAT="your_github_personal_access_token_here"
LOG_LEVEL="INFO"
```

The `GH_PAT` should have these permissions:
- `read:user` - to read user profile information
- `read:org` - to read org membership (if applicable)
- `repo` - full access to private repositories
- `public_repo` - access to public repositories

## Usage

### Local Development

```bash
# Start the HTTP server
bun run dev:bun

# Check health
curl http://localhost:4000/health

# Manually start polling for a user
curl -X POST http://localhost:4000/start/your-github-username
```

### Testing Event Processing

The server will automatically poll for events every 60 seconds when started. To test:

1. Create activity on GitHub (comment on an issue, create a PR, push code, etc.)
2. Wait for the next polling cycle
3. Check the server logs for event processing
4. Look for acknowledgment comments on the relevant issues/PRs

### GitHub Actions Integration

For private repositories or actions requiring user authentication:

1. The system automatically dispatches the `symbiote-auth.yml` workflow
2. The workflow runs with your repository's permissions
3. Results are sent back to the callback URL

## API Endpoints

- `GET /health` - Health check
- `POST /session/callback` - Workflow session registration
- `POST /state/:stateId` - State-based requests from kernel
- `POST /start/:userId` - Manually start polling for a user
- `GET /session/:userId/status` - Check session status
- `GET /storage/events/:userId` - Retrieve processed events
- `POST /registry/refresh` - Refresh org/repo registry

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub User   │────│   Edge Worker    │────│   GitHub API    │
│   Activity      │    │   (Session Mgmt) │    │   (Events)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                        │
                              │                        ▼
                              │               ┌──────────────────┐
                              │               │  Main Workflow   │
                              │               │  (6hr polling)   │
                              │               └──────────────────┘
                              ▼                        │
                       ┌──────────────────┐          │
                       │  Safety Check    │          │
                       │  & Routing       │          │
                       └──────────────────┘          │
                              │                      │
                    ┌─────────┼─────────┐          │
                    │         │         │          │
           ┌────────▼──┐ ┌────▼───┐ ┌──▼────────┐   │
           │App Auth   │ │Kernel  │ │User Auth  │   │
           │(Public)   │ │Forward │ │(Workflow) │   │
           └───────────┘ └────────┘ └───────────┘   │
                                                   │
                    All user-auth actions handled ──┘
                         by main workflow
```

## Deployment

Deploy to Cloudflare Workers:

```bash
# Set your Cloudflare credentials
wrangler auth login

# Deploy
wrangler deploy
```

Update the `getWorkerUrl()` function in `symbiote.ts` with your deployed worker URL.
