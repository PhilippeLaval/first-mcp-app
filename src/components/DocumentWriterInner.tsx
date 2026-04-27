import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../mcp-app.module.css";

const FORMALITY_LABELS = ["Very casual", "Casual", "Neutral", "Formal", "Very formal"];
const LENGTH_LABELS = ["Very brief", "Brief", "Medium", "Detailed", "Very detailed"];

const DEFAULT_FORMALITY = 3;
const DEFAULT_LENGTH = 3;

interface ToolStructured {
  document?: string;
  topic?: string;
}

function readStructured(result: CallToolResult | null): ToolStructured {
  const sc = result?.structuredContent as ToolStructured | undefined;
  return sc ?? {};
}

export interface DocumentWriterInnerProps {
  app: App;
  toolResult: CallToolResult | null;
  hostContext?: McpUiHostContext;
}

export function DocumentWriterInner({
  app,
  toolResult,
  hostContext,
}: DocumentWriterInnerProps) {
  const initial = useMemo(() => readStructured(toolResult), [toolResult]);

  const [doc, setDoc] = useState(initial.document ?? "");
  const [topic, setTopic] = useState(initial.topic ?? "");
  const [formality, setFormality] = useState(DEFAULT_FORMALITY);
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initial.document !== undefined) setDoc(initial.document);
    if (initial.topic !== undefined) setTopic(initial.topic);
    setBusy(false);
  }, [initial.document, initial.topic]);

  const handleApply = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStatusMessage(null);

    const formalityLabel = FORMALITY_LABELS[formality - 1];
    const lengthLabel = LENGTH_LABELS[length - 1];

    const contextMd = [
      `---`,
      `target-formality: ${formalityLabel} (${formality}/5)`,
      `target-length: ${lengthLabel} (${length}/5)`,
      topic ? `topic: ${topic}` : null,
      `---`,
      "",
      "## Current document",
      "",
      doc.trim().length > 0 ? doc : "(empty — please draft a new document)",
      "",
      instructions.trim().length > 0 ? `## User instructions\n\n${instructions}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");

    try {
      await app.updateModelContext({
        content: [{ type: "text", text: contextMd }],
      });

      const promptParts = [
        `Rewrite the document above to be ${formalityLabel.toLowerCase()} in tone and ${lengthLabel.toLowerCase()} in length.`,
        instructions.trim().length > 0
          ? `Also apply these user instructions: ${instructions.trim()}`
          : null,
        `Then call the \`write-document\` tool with the rewritten text in the \`document\` argument${topic ? ` and topic="${topic}"` : ""} so the UI can render the updated version. Do not paste the rewritten document into chat — return it through the tool call.`,
      ]
        .filter((p) => p !== null)
        .join(" ");

      await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: promptParts }],
      });

      setStatusMessage("Asked the assistant to rewrite — the updated version will appear when ready.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Failed to send rewrite request: ${msg}`);
      setBusy(false);
    }
  }, [app, busy, doc, formality, instructions, length, topic]);

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
      <aside className={styles.controls}>
        <header className={styles.controlsHeader}>
          <h2>Document Writer</h2>
          <p className={styles.subtitle}>
            Adjust the sliders, add instructions, then ask the assistant to rewrite.
          </p>
        </header>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Topic</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What is this document about?"
          />
        </label>

        <div className={styles.field}>
          <div className={styles.sliderRow}>
            <span className={styles.fieldLabel}>Formality</span>
            <span className={styles.sliderValue}>{FORMALITY_LABELS[formality - 1]}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={formality}
            onChange={(e) => setFormality(Number(e.target.value))}
          />
          <div className={styles.sliderTicks}>
            <span>casual</span>
            <span>formal</span>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.sliderRow}>
            <span className={styles.fieldLabel}>Length</span>
            <span className={styles.sliderValue}>{LENGTH_LABELS[length - 1]}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
          <div className={styles.sliderTicks}>
            <span>shorter</span>
            <span>longer</span>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Instructions</span>
          <textarea
            rows={5}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. focus on Q3 results, drop the marketing fluff, add a call to action…"
          />
        </label>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleApply}
          disabled={busy}
        >
          {busy ? "Rewriting…" : "Apply changes"}
        </button>

        {statusMessage && <p className={styles.status}>{statusMessage}</p>}
      </aside>

      <section className={styles.documentPane}>
        <header className={styles.documentHeader}>
          <h3>{topic || "Untitled document"}</h3>
          <span className={styles.docMeta}>{doc.length.toLocaleString()} chars</span>
        </header>
        <textarea
          className={styles.documentText}
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="Your document will appear here. Edit freely, or use the controls on the left to ask the assistant to rewrite."
          spellCheck
        />
      </section>
    </main>
  );
}
