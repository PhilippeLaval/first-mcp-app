# text-generator — Document Writer MCP App

An interactive **MCP App** for drafting and rewriting markdown documents. The user adjusts sliders for tone (formality) and length, types free-form instructions, and clicks **Apply** — the host LLM (Claude in Claude Desktop / claude.ai / Goose) rewrites the document and the UI re-renders with the new version.

Built with TypeScript + Vite + React 19 + Storybook, exposed over MCP via stdio and Streamable HTTP.

## What it looks like

```
┌─────────────────────┬────────────────────────────────────────────┐
│ Document Writer     │  Quarterly update         140 chars  [P E] │
│                     │ ─────────────────────────────────────────  │
│ Topic: ___________  │                                            │
│                     │  # Quarterly update                        │
│ Formality:  Neutral │                                            │
│ ▁▁▁●▁▁▁             │  We had a strong quarter overall.          │
│                     │  Revenue grew 14% and we shipped two of    │
│ Length:    Medium   │  the three roadmap items we committed to   │
│ ▁▁▁●▁▁▁             │  in January.                               │
│                     │                                            │
│ Instructions:       │  ## What worked                            │
│ ┌──────────────┐    │                                            │
│ │              │    │  | Area | Status |                         │
│ │              │    │  | ---- | ------ |                         │
│ └──────────────┘    │  | Onboarding | shipped |                  │
│                     │                                            │
│ [ Apply changes ]   │                                            │
└─────────────────────┴────────────────────────────────────────────┘
```

Left panel = controls. Right panel = live markdown render with a Preview/Edit toggle. Clicking **Apply** opens a chat turn asking Claude to rewrite based on the controls; Claude calls `write-document` again with the new text and a new iframe shows the result.

## Stack

- **Vite + React 19 + TypeScript** — UI bundled into a single `mcp-app.html` via `vite-plugin-singlefile` so the host can render it in a sandboxed iframe with no external network deps.
- **`@modelcontextprotocol/ext-apps`** — App SDK + React `useApp()` hook for the host postMessage channel.
- **`@modelcontextprotocol/sdk`** — MCP server (stdio + Streamable HTTP transports).
- **`react-markdown` + `remark-gfm`** — markdown rendering with GFM (tables, strikethrough, task lists, fenced code).
- **Storybook 8** — design components in isolation with a mocked `App`.
- **bun** — used by the build script to bundle `server.ts` / `main.ts` for distribution.

## How the rewrite flow works

There's exactly one tool: `write-document`. It accepts an optional `topic` and an optional `document`, echoes them back as `structuredContent`, and renders the UI via `_meta.ui.resourceUri`.

The "rewrite loop" is the host LLM's job:

1. User clicks **Apply** in the UI.
2. UI calls `app.sendMessage(...)` with a markdown prompt that includes:
   - the formality + length sliders (numeric and labeled),
   - the free-form instructions,
   - the current document body in a fenced ```` ```markdown ```` block.
3. Claude reads the prompt, rewrites the doc, and calls `write-document` *again* with the rewritten text in the `document` argument.
4. A new iframe mounts. `ontoolresult` fires; the new doc renders.

The doc is sent inline in the visible chat message (rather than via `updateModelContext`) so users can see exactly what Claude received and audit the round-trip.

### Why not MCP sampling?

Sampling (`server.server.createMessage`) would let the *server* request a rewrite from the host LLM — meaning the rewrite could happen via `app.callServerTool` and update the **same** iframe in place, no new chat turn, no new iframe. That would be the cleanest UX.

It's not what we do because **claude.ai's custom-connector hosts don't support sampling yet** (as of writing). Goose does. If you only target Goose / Claude Desktop, this is a trivial substitution — see "Single-iframe variant" below.

### Why not direct Anthropic API call?

You could give the server an `ANTHROPIC_API_KEY` and rewrite directly. That works in any host but moves the rewrite *outside* the host LLM: the user's claude.ai conversation no longer sees the document, no follow-up like *"make paragraph three punchier"* works, and billing shifts to the API key. The current sendMessage pattern keeps the host LLM as the brain.

## Layout

```
mcp-app.html                          # Vite entry (UI side)
src/mcp-app.tsx                       # mounts <DocumentWriterApp />
src/components/
  DocumentWriterApp.tsx               # connected: useApp() + state + lifecycle handlers
  DocumentWriterInner.tsx             # presentational: takes App as prop, owns sliders/doc/instructions
  DocumentWriterInner.stories.tsx
src/global.css                        # host CSS variable fallbacks
src/mcp-app.module.css                # 2-panel layout, sliders, markdown preview, spinner
server.ts                             # registers the write-document tool + ui:// resource
main.ts                               # stdio + Streamable HTTP transports + CORS
.storybook/
```

## Scripts

```bash
npm install
npm run dev            # vite watch + server with bun --watch (concurrent)
npm run build          # bundles UI into dist/mcp-app.html, then server (server.js + index.js)
npm run start          # build + serve (Streamable HTTP on :3001)
npm run start:stdio    # build + serve over stdio
npm run storybook      # design loop on :6006
npm run inspect        # MCP Inspector against the built stdio binary
npm run inspect:http   # MCP Inspector with an HTTP target (paste your URL)
npm run tunnel         # tailscale funnel --bg 3001
npm run tunnel:status  # show the public URL Tailscale assigned
npm run tunnel:stop    # tear down the funnel
npm run tunnel:ngrok   # alternative: ngrok http 3001
npm run typecheck
```

## Local development

### 1. Storybook (fastest design loop, no MCP host needed)

```bash
npm run storybook
```

Stories mock the `App` interface so `callServerTool` / `sendMessage` / `updateModelContext` / `openLink` resolve immediately. Use this for visual iteration on the controls, the markdown preview, the spinner, etc. The shipped stories cover:

- empty initial state
- a populated short doc
- a rich-markdown doc (headings, list, table, fenced code)
- streaming partial input
- safe-area insets
- a `sendMessage` failure

### 2. MCP Inspector (full SDK contract, no Claude needed)

```bash
npm run build
npm run inspect          # spawns dist/index.js --stdio
```

The Inspector opens in your browser. Call `write-document` with `{}` or `{ "topic": "Q1 launch retro" }` and inspect both the tool result and the `ui://write-document/mcp-app.html` resource. The rendered UI runs in an iframe so you can click Apply and watch the postMessage traffic in DevTools.

For HTTP mode:

```bash
npm run start &          # local Streamable HTTP on :3001
npm run inspect:http     # then point at http://localhost:3001/mcp
```

### 3. Goose (CLI or Desktop)

Goose renders MCP App UI resources fully, so you get the React iframe rendered inline.

**Goose CLI:**

```bash
goose configure
# → Add Extension → Command-line Extension
# ID: text-generator
# Command: node /Users/PhL/.superset/worktrees/MCPApp/text-generator/dist/index.js --stdio
# enable it
```

**Goose Desktop:** Settings → Extensions → Add custom extension → Standard IO with the same command.

Then:

```bash
goose session
# > Use the write-document tool to start a draft about our Q1 launch retro.
```

### 4. Claude Code / Claude Desktop via stdio

Add to `~/.claude.json` (Claude Code) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Desktop):

```json
{
  "mcpServers": {
    "document-writer": {
      "command": "bash",
      "args": [
        "-c",
        "cd /Users/PhL/.superset/worktrees/MCPApp/text-generator && npm run build >&2 && node dist/index.js --stdio"
      ]
    }
  }
}
```

Restart the client. Ask Claude to *"start a document about X"* — the React UI will render inline.

### 5. claude.ai (custom connector via Streamable HTTP)

claude.ai connects to remote MCP servers over Streamable HTTP. Expose your local server via tunnel, then add it as a custom connector.

#### Tailscale Funnel (preferred — stable URL)

The Tailscale CLI is at `/opt/homebrew/bin/tailscale` (homebrew install) or `/Applications/Tailscale.app/Contents/MacOS/Tailscale` (App Store / GUI app). The package scripts assume `tailscale` is on `PATH`; if it isn't:

```bash
sudo ln -s /Applications/Tailscale.app/Contents/MacOS/Tailscale /usr/local/bin/tailscale
```

Then:

```bash
npm run start          # Terminal 1: server on :3001
npm run tunnel         # Terminal 2: tailscale funnel --bg 3001
npm run tunnel:status  # prints the https://<machine>.<tailnet>.ts.net URL
```

Public MCP endpoint = `https://<machine>.<tailnet>.ts.net/mcp`. The URL is **stable across restarts**, so the connector won't keep needing reconfiguration.

In claude.ai → Settings → Connectors → **Add custom connector** → paste the URL. Toggle on for the chat. Then ask *"Use the write-document tool to draft a short note about MCP apps."*

#### Tailscale Funnel — one-time tailnet setup

If `tailscale funnel` complains, you need to enable Funnel + HTTPS on your tailnet:

1. Admin console → **DNS** → enable **MagicDNS** + **HTTPS Certificates** (separate toggles, both required).
2. Admin console → **Access controls** → add this `nodeAttrs` block to your ACL:
   ```jsonc
   "nodeAttrs": [
     { "target": ["autogroup:member"], "attr": ["funnel"] }
   ]
   ```
3. Bounce the daemon by toggling Tailscale **Disconnect → Connect** in the menu bar so the local cache picks up the new tailnet policy.

#### Tailscale Funnel — exit-node gotcha

If you have an active **exit node** (visible in `tailscale status`), it may intercept the daemon's connection to `controlplane.tailscale.com` and Let's Encrypt during ACME, breaking cert provisioning with errors like `connection reset by peer` or `write: broken pipe`.

Fix: temporarily disable the exit node only for cert issuance / renewal:

```bash
tailscale set --exit-node=          # disable
tailscale cert <your>.<tailnet>.ts.net   # provision (or it provisions automatically when funnel starts)
tailscale set --exit-node=<exit-node-name>   # re-enable
```

The cert is cached locally (~60 day Let's Encrypt validity), so you only need to do this on first issue and on renewal.

#### Alternatives

```bash
npm run tunnel:ngrok                          # ngrok http 3001 → https://*.ngrok-free.app/mcp
cloudflared tunnel --url http://localhost:3001  # ephemeral *.trycloudflare.com URL
```

Both give you HTTPS URLs you can paste as a custom connector. Tradeoff: the URL changes on every restart.

## Deployment notes

- `main.ts` sets `cors()` open and uses `sessionIdGenerator: undefined` (stateless). Fine for local tunneling-to-Claude; for a real deployment, tighten CORS, add a real session store, and put auth in front.
- `dist/mcp-app.html` is a single self-contained bundle — no external network dependencies, no CSP `connect-src` needed unless you add one (the host renders it in a sandboxed iframe with restrictive CSP by default).
- `server.ts` reads `dist/mcp-app.html` from disk on every resource fetch, so HTML changes are picked up without restarting the server. Tool definition changes (in `server.ts` or `main.ts`) *do* require a restart.

## Extending

### Single-iframe variant (sampling-capable hosts)

If you only target Goose or Claude Desktop, you can collapse the rewrite into a single in-place update:

1. Add an app-only tool `rewrite-document` with `_meta.ui.visibility: ["app"]`.
2. In its handler, call `server.server.createMessage({ messages, maxTokens, systemPrompt })` to ask the host LLM to rewrite, then return the result as `structuredContent`.
3. In `DocumentWriterInner.handleApply`, replace `app.sendMessage(...)` with `app.callServerTool({ name: "rewrite-document", arguments: { ... } })` and `setDoc(result.structuredContent.document)`.

The result: clicking Apply spins, then the same iframe updates with the new doc — no new chat turn, no new iframe. Loses host-LLM context for follow-up chat (the host LLM doesn't see the rewrite request).

### Direct API variant (any host)

Same as above but the handler calls the Anthropic SDK directly with an `ANTHROPIC_API_KEY` env var. Works everywhere but the host LLM is bypassed entirely.

### Persisting state across iframe remounts

Each tool call mounts a new iframe. To persist slider settings or instructions across rewrites, set `_meta.viewUUID` in the tool result and use `localStorage[viewUUID]` in the UI. See `/tmp/mcp-ext-apps/docs/patterns.md` ("Persisting view state") for the full recipe.

## How it works (one paragraph)

The server registers two things in lockstep: a **tool** (`write-document`) whose `_meta.ui.resourceUri` points to a **resource** (`ui://write-document/mcp-app.html`). When Claude calls the tool, the host reads that resource, gets the bundled HTML+JS, and renders it in a sandboxed iframe. The UI uses `useApp()` to open a postMessage channel back to the host — that's how it can call other tools (`callServerTool`), send chat messages (`sendMessage`), push out-of-band context (`updateModelContext`), send logs, and open links. For the rewrite loop, the UI sends a chat message asking Claude to rewrite and call back into the same tool with the new text — each iteration produces a fresh iframe with the updated document.
