import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useEffect, useState } from "react";
import { GetTimeAppInner } from "./GetTimeAppInner.js";

export function GetTimeApp() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  const { app, error } = useApp({
    appInfo: { name: "First MCP App", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.onteardown = async () => ({});
      app.ontoolinput = async (input) => {
        console.info("tool input:", input);
      };
      app.ontoolresult = async (result) => {
        setToolResult(result);
      };
      app.ontoolcancelled = (params) => {
        console.info("tool cancelled:", params.reason);
      };
      app.onerror = console.error;
      app.onhostcontextchanged = (params) => {
        setHostContext((prev) => ({ ...prev, ...params }));
      };
    },
  });

  useEffect(() => {
    if (app) setHostContext(app.getHostContext());
  }, [app]);

  if (error) return <div><strong>ERROR:</strong> {error.message}</div>;
  if (!app) return <div>Connecting...</div>;

  return <GetTimeAppInner app={app} toolResult={toolResult} hostContext={hostContext} />;
}
