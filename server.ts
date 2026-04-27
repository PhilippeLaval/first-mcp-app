import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const DocumentResponseSchema = z.object({
  document: z.string(),
  topic: z.string().optional(),
});

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Document Writer",
    version: "0.1.0",
  });

  const resourceUri = "ui://write-document/mcp-app.html";

  registerAppTool(
    server,
    "write-document",
    {
      title: "Write Document",
      description:
        "Open the Document Writer UI. The user can adjust formality and length sliders and give free-form instructions; the UI will then ask you to rewrite the document and call this tool again with the new `document` value to render the updated version.",
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe("Topic / subject of the document (used for the initial draft)."),
        document: z
          .string()
          .optional()
          .describe(
            "Full text of the document to display. When the UI requests a rewrite, call this tool again with the rewritten text in this field.",
          ),
      },
      outputSchema: DocumentResponseSchema.shape,
      _meta: { ui: { resourceUri } },
    },
    async ({ topic, document }): Promise<CallToolResult> => {
      const text =
        document ??
        (topic
          ? `# ${topic}\n\nStart writing about ${topic} here, then use the sliders and instructions on the left to refine.`
          : "Tell the assistant what you'd like to write about, or start typing in the document panel.");

      const summary = topic
        ? `Document on "${topic}" (${text.length} chars).`
        : `Document (${text.length} chars).`;

      return {
        content: [{ type: "text", text: summary }],
        structuredContent: { document: text, topic },
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: "Interactive Document Writer UI",
    },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}
