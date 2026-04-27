import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useEffect, useState } from "react";
import { DocumentWriterInner } from "./DocumentWriterInner.js";

export type Phase = "streaming" | "settled";

export interface PartialInput {
  document?: string;
  topic?: string;
}

export function DocumentWriterApp() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [partialInput, setPartialInput] = useState<PartialInput | null>(null);
  const [phase, setPhase] = useState<Phase>("streaming");
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  const { app, error } = useApp({
    appInfo: { name: "Document Writer", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.onteardown = async () => ({});
      app.ontoolinputpartial = (params) => {
        const args = params.arguments as PartialInput | undefined;
        if (args) setPartialInput(args);
      };
      app.ontoolinput = (params) => {
        const args = params.arguments as PartialInput | undefined;
        if (args) setPartialInput(args);
      };
      app.ontoolresult = (result) => {
        setToolResult(result);
        setPhase("settled");
      };
      app.ontoolcancelled = (params) => {
        console.info("tool cancelled:", params.reason);
        setPhase("settled");
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
  if (!app) return <div>Connecting…</div>;

  return (
    <DocumentWriterInner
      app={app}
      toolResult={toolResult}
      partialInput={partialInput}
      phase={phase}
      hostContext={hostContext}
    />
  );
}
