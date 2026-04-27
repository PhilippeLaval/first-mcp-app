import type { App } from "@modelcontextprotocol/ext-apps";
import type { Meta, StoryObj } from "@storybook/react";
import { DocumentWriterInner } from "./DocumentWriterInner.js";

function mockApp(overrides: Partial<App> = {}): App {
  const fake = {
    callServerTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
    sendMessage: async () => ({ isError: false }),
    sendLog: async () => undefined,
    openLink: async () => ({ isError: false }),
    updateModelContext: async () => undefined,
    getHostContext: () => ({}),
    ...overrides,
  } as unknown as App;
  return fake;
}

const SAMPLE_DOC = `# Quarterly update

We had a strong quarter overall. Revenue grew 14% and we shipped two of the three roadmap items we committed to in January. The team is in good shape heading into Q2.`;

const meta: Meta<typeof DocumentWriterInner> = {
  title: "MCP App/DocumentWriterInner",
  component: DocumentWriterInner,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof DocumentWriterInner>;

export const Empty: Story = {
  args: {
    app: mockApp(),
    toolResult: null,
  },
};

export const WithDocument: Story = {
  args: {
    app: mockApp(),
    toolResult: {
      content: [{ type: "text", text: "Document on \"Quarterly update\" (200 chars)." }],
      structuredContent: { document: SAMPLE_DOC, topic: "Quarterly update" },
    },
  },
};

export const WithSafeAreaInsets: Story = {
  args: {
    app: mockApp(),
    toolResult: {
      content: [{ type: "text", text: "Document (200 chars)." }],
      structuredContent: { document: SAMPLE_DOC, topic: "Quarterly update" },
    },
    hostContext: {
      safeAreaInsets: { top: 24, right: 16, bottom: 24, left: 16 },
    },
  },
};

export const SendMessageFails: Story = {
  args: {
    app: mockApp({
      sendMessage: async () => {
        throw new Error("simulated host failure");
      },
    }),
    toolResult: {
      content: [{ type: "text", text: "Document (200 chars)." }],
      structuredContent: { document: SAMPLE_DOC, topic: "Quarterly update" },
    },
  },
};
