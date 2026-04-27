# first-mcp-app

A first [MCP App](https://apps.extensions.modelcontextprotocol.io/) — interactive React UI rendered inline in Claude when a tool is invoked. Built with TypeScript + Vite + React + Storybook.

## Stack

- **Vite + React 19 + TypeScript** — UI bundled into a single HTML resource via `vite-plugin-singlefile`
- **`@modelcontextprotocol/ext-apps`** — App SDK + React `useApp()` hook
- **`@modelcontextprotocol/sdk`** — server (stdio + Streamable HTTP)
- **Storybook 8** — design components in isolation with mocked `App`
- **bun** — used by the build script to bundle `server.ts` / `main.ts` for distribution

## Layout

```
mcp-app.html              # Vite entry (UI side)
src/mcp-app.tsx           # mounts <GetTimeApp />
src/components/
  GetTimeApp.tsx          # connected: useApp() + state
  GetTimeAppInner.tsx     # presentational: takes App as prop
  GetTimeAppInner.stories.tsx
src/global.css            # host CSS variable fallbacks
src/mcp-app.module.css
server.ts                 # registers tool + ui:// resource
main.ts                   # stdio + streamable HTTP transports
.storybook/
```

## Scripts

```bash
npm install
npm run dev            # vite watch + server with bun --watch
npm run build          # bundles UI into dist/mcp-app.html, then server
npm run start          # build + serve (Streamable HTTP on :3001)
npm run start:stdio    # build + serve over stdio
npm run storybook      # design loop on :6006
npm run inspect        # MCP Inspector against built stdio binary
npm run inspect:http   # MCP Inspector with an HTTP target (paste your URL)
npm run tunnel         # tailscale funnel (background)
npm run tunnel:status  # show the public URL Tailscale assigned
npm run tunnel:stop    # tear down the funnel
npm run tunnel:ngrok   # alternative: ngrok http 3001
npm run typecheck
```

## Local testing

### 1. Storybook (fastest design loop, no MCP needed)

```bash
npm run storybook
```

Stories mock the `App` interface so `callServerTool` / `sendMessage` / `openLink` resolve immediately. Use this for visual iteration.

### 2. MCP Inspector (full SDK contract, no Claude needed)

```bash
npm run build
npm run inspect          # spawns dist/index.js --stdio
```

The Inspector opens in your browser. You can call `get-time`, see the tool result, and inspect the `ui://get-time/mcp-app.html` resource. The rendered UI runs in an iframe so you can click the buttons and watch the postMessage traffic.

For HTTP mode:
```bash
npm run start &          # local Streamable HTTP on :3001
npm run inspect:http     # then point at http://localhost:3001/mcp
```

### 3. Claude Code / Claude Desktop via stdio

Add to `~/.claude.json` (Claude Code) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Desktop):

```json
{
  "mcpServers": {
    "first-mcp-app": {
      "command": "bash",
      "args": [
        "-c",
        "cd /Users/PhL/.superset/worktrees/MCPApp/Philippe-Laval/first-mcp-app && npm run build >&2 && node dist/index.js --stdio"
      ]
    }
  }
}
```

Restart the client and ask Claude to "get the time" — the React UI will render inline.

## Streamable HTTP testing without deploying

Claude (web/desktop) can connect to remote MCP servers over Streamable HTTP. Expose your local server publicly via tunnel:

### Tailscale Funnel (preferred — stable URL, on your own identity)

**One-time setup if `tailscale` isn't on PATH** (macOS App Store install hides it inside the app bundle):

```bash
sudo ln -s /Applications/Tailscale.app/Contents/MacOS/Tailscale /usr/local/bin/tailscale
```

(Alternative: open Tailscale menu bar → "Install CLI…" if your build offers it.)

Then:

```bash
npm run start          # Terminal 1: server on :3001
npm run tunnel         # Terminal 2: tailscale funnel --bg 3001
npm run tunnel:status  # prints the https://<machine>.<tailnet>.ts.net URL
```

Your MCP endpoint is `https://<machine>.<tailnet>.ts.net/mcp`. The URL is **stable across restarts** (unlike ngrok free), so Claude won't lose the connector.

Add as a custom connector:
- **claude.ai** → Settings → Connectors → Add custom connector → paste `<url>/mcp`
- **Claude Desktop** → Settings → Developer → MCP Servers
- **Claude Code** → `~/.claude.json` `mcpServers` with `"transport": "http"` and `"url": "..."`

When done: `npm run tunnel:stop`.

#### Funnel prerequisites (one-time per tailnet)

If `tailscale funnel` complains, you may need to enable Funnel + HTTPS on your tailnet:
- Admin console → DNS → enable MagicDNS + HTTPS certificates
- Admin console → Access controls → add `funnel` to your `nodeAttrs` for this machine

### Alternatives

```bash
npm run tunnel:ngrok   # ngrok http 3001  → https://*.ngrok-free.app/mcp
cloudflared tunnel --url http://localhost:3001   # ephemeral *.trycloudflare.com
```

## Notes on CORS / sessions

`main.ts` sets `cors()` open and uses `sessionIdGenerator: undefined` (stateless). For production you'd want stricter CORS and a real session store; for tunneling-to-Claude this is fine.

## How it works (one paragraph)

The server registers two things in lockstep: a **tool** (`get-time`) whose `_meta.ui.resourceUri` points to a **resource** (`ui://get-time/mcp-app.html`). When Claude calls the tool, it reads that resource, gets the bundled HTML+JS, and renders it in a sandboxed iframe. The UI uses `useApp()` to open a postMessage channel back to the host — that's how it can call other tools, send chat messages, send logs, and open links.
