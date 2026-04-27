import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useState } from "react";
import styles from "../mcp-app.module.css";

function extractTime(callToolResult: CallToolResult): string {
  const part = callToolResult.content?.find((c) => c.type === "text");
  return part && "text" in part ? part.text : "[no text]";
}

export interface GetTimeAppInnerProps {
  app: App;
  toolResult: CallToolResult | null;
  hostContext?: McpUiHostContext;
}

export function GetTimeAppInner({ app, toolResult, hostContext }: GetTimeAppInnerProps) {
  const [serverTime, setServerTime] = useState("Loading...");
  const [messageText, setMessageText] = useState("This is message text.");
  const [logText, setLogText] = useState("This is log text.");
  const [linkUrl, setLinkUrl] = useState("https://modelcontextprotocol.io/");

  useEffect(() => {
    if (toolResult) {
      setServerTime(extractTime(toolResult));
    }
  }, [toolResult]);

  const handleGetTime = useCallback(async () => {
    try {
      const result = await app.callServerTool({ name: "get-time", arguments: {} });
      setServerTime(extractTime(result));
    } catch (e) {
      console.error(e);
      setServerTime("[ERROR]");
    }
  }, [app]);

  const handleSendMessage = useCallback(async () => {
    const signal = AbortSignal.timeout(5000);
    try {
      await app.sendMessage(
        { role: "user", content: [{ type: "text", text: messageText }] },
        { signal },
      );
    } catch (e) {
      console.error("Message send error:", signal.aborted ? "timed out" : e);
    }
  }, [app, messageText]);

  const handleSendLog = useCallback(async () => {
    await app.sendLog({ level: "info", data: logText });
  }, [app, logText]);

  const handleOpenLink = useCallback(async () => {
    await app.openLink({ url: linkUrl });
  }, [app, linkUrl]);

  return (
    <main
      className={styles.main}
      style={{
        paddingTop: hostContext?.safeAreaInsets?.top,
        paddingRight: hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft: hostContext?.safeAreaInsets?.left,
      }}
    >
      <p className={styles.notice}>Watch activity in the DevTools console!</p>

      <div className={styles.action}>
        <p>
          <strong>Server Time:</strong>{" "}
          <code className={styles.serverTime}>{serverTime}</code>
        </p>
        <button onClick={handleGetTime}>Get Server Time</button>
      </div>

      <div className={styles.action}>
        <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} />
        <button onClick={handleSendMessage}>Send Message</button>
      </div>

      <div className={styles.action}>
        <input type="text" value={logText} onChange={(e) => setLogText(e.target.value)} />
        <button onClick={handleSendLog}>Send Log</button>
      </div>

      <div className={styles.action}>
        <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <button onClick={handleOpenLink}>Open Link</button>
      </div>
    </main>
  );
}
