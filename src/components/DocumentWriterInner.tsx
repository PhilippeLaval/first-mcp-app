import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "../mcp-app.module.css";
import type { PartialInput, Phase } from "./DocumentWriterApp.js";

type ViewMode = "preview" | "edit";

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
  partialInput?: PartialInput | null;
  phase?: Phase;
  hostContext?: McpUiHostContext;
}

export function DocumentWriterInner({
  app,
  toolResult,
  partialInput,
  phase = "settled",
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
  const [viewMode, setViewMode] = useState<ViewMode>("preview");

  useEffect(() => {
    if (initial.document !== undefined) setDoc(initial.document);
    if (initial.topic !== undefined) setTopic(initial.topic);
    setBusy(false);
  }, [initial.document, initial.topic]);

  const awaitingFirstResult = phase === "streaming" && !toolResult;
  const isLoading = awaitingFirstResult || busy;
  const streamingDoc = partialInput?.document ?? "";
  const streamingTopic = partialInput?.topic;
  const hasStreamPreview = awaitingFirstResult && streamingDoc.length > 0;

  const displayDoc = awaitingFirstResult ? streamingDoc : doc;
  const displayTopic = awaitingFirstResult ? (streamingTopic ?? topic) : topic;

  const handleApply = useCallback(async () => {
    if (isLoading) return;
    setBusy(true);
    setStatusMessage(null);

    const formalityLabel = FORMALITY_LABELS[formality - 1];
    const lengthLabel = LENGTH_LABELS[length - 1];
    const docBody = doc.trim().length > 0 ? doc : "(empty — please draft a new document)";

    const promptLines = [
      `Rewrite the document below to be ${formalityLabel.toLowerCase()} in tone (${formality}/5) and ${lengthLabel.toLowerCase()} in length (${length}/5).`,
      instructions.trim().length > 0
        ? `Also apply these instructions: ${instructions.trim()}`
        : null,
      `Then call the \`write-document\` tool with the rewritten text in the \`document\` argument${topic ? ` and topic="${topic}"` : ""} so the UI can render the updated version. Do not paste the rewritten document into chat — return it through the tool call.`,
      "",
      topic ? `Topic: ${topic}` : null,
      "",
      "Current document:",
      "",
      "```markdown",
      docBody,
      "```",
    ].filter((line) => line !== null);

    const prompt = promptLines.join("\n");

    try {
      await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: prompt }],
      });

      setStatusMessage("Asked the assistant to rewrite — the updated version will appear when ready.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Failed to send rewrite request: ${msg}`);
      setBusy(false);
    }
  }, [app, doc, formality, instructions, isLoading, length, topic]);

  const controlsDisabled = isLoading;

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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
          />
        </label>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleApply}
          disabled={isLoading}
        >
          {awaitingFirstResult
            ? "Generating…"
            : busy
              ? "Sending…"
              : "Apply changes"}
        </button>

        {statusMessage && <p className={styles.status}>{statusMessage}</p>}
      </aside>

      <section className={styles.documentPane}>
        {isLoading ? (
          <div className={styles.documentLoading} role="status" aria-live="polite">
            <span className={styles.spinnerXl} aria-hidden="true" />
            <p className={styles.loadingTitle}>
              {awaitingFirstResult
                ? "Drafting your document…"
                : "Sending your request…"}
            </p>
            <p className={styles.loadingSubtitle}>
              {awaitingFirstResult
                ? "The assistant is composing the rewritten version."
                : "Asking the assistant to rewrite — the new version will appear here."}
            </p>
            {hasStreamPreview && (
              <pre className={styles.streamPreview}>{streamingDoc}</pre>
            )}
          </div>
        ) : (
          <>
            <header className={styles.documentHeader}>
              <h3>{displayTopic || "Untitled document"}</h3>
              <div className={styles.documentHeaderRight}>
                <span className={styles.docMeta}>
                  {displayDoc.length.toLocaleString()} chars
                </span>
                <div className={styles.viewToggle} role="tablist" aria-label="Document view mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "preview"}
                    className={
                      viewMode === "preview"
                        ? `${styles.viewToggleButton} ${styles.viewToggleButtonActive}`
                        : styles.viewToggleButton
                    }
                    onClick={() => setViewMode("preview")}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "edit"}
                    className={
                      viewMode === "edit"
                        ? `${styles.viewToggleButton} ${styles.viewToggleButtonActive}`
                        : styles.viewToggleButton
                    }
                    onClick={() => setViewMode("edit")}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </header>
            {viewMode === "preview" ? (
              <div className={styles.documentPreview}>
                {displayDoc.trim().length > 0 ? (
                  <Markdown remarkPlugins={[remarkGfm]}>{displayDoc}</Markdown>
                ) : (
                  <p className={styles.previewEmpty}>
                    Your document will appear here. Use the controls on the left to ask
                    the assistant to draft or rewrite, or switch to Edit to type directly.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                className={styles.documentText}
                value={displayDoc}
                onChange={(e) => setDoc(e.target.value)}
                placeholder="Type your document in markdown. Switch back to Preview to render."
                spellCheck
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}
