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

const RICH_DOC = `# Q1 launch retrospective

## Highlights

- **Revenue**: +14% QoQ, ahead of forecast.
- **Shipped**: 2 of 3 roadmap items, plus an unscoped UX overhaul.
- **Team health**: morale survey at 4.3 / 5.

## What worked

> Daily standups stayed under 10 minutes for the entire quarter.

| Area | Status | Notes |
| ---- | ------ | ----- |
| Onboarding | shipped | Conversion +9% |
| Billing | shipped | Stripe migration done |
| Reporting | slipped | scoped for Q2 |

## What to do differently

1. Lock the roadmap one sprint earlier.
2. Over-invest in QA for billing-adjacent code.
3. Pair design + engineering on every customer-facing surface.

\`\`\`ts
function shipIt(scope: Scope): Result {
  return scope === "small" ? "shipped" : "slipped";
}
\`\`\`
`;

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

export const StreamingEmpty: Story = {
  args: {
    app: mockApp(),
    toolResult: null,
    phase: "streaming",
    partialInput: { topic: "Quarterly update" },
  },
};

export const RichMarkdown: Story = {
  args: {
    app: mockApp(),
    toolResult: {
      content: [{ type: "text", text: "Document on \"Q1 launch retrospective\"." }],
      structuredContent: { document: RICH_DOC, topic: "Q1 launch retrospective" },
    },
  },
};

export const StreamingPartial: Story = {
  args: {
    app: mockApp(),
    toolResult: null,
    phase: "streaming",
    partialInput: {
      topic: "Quarterly update",
      document: "# Quarterly update\n\nWe had a strong quarter overall. Revenue grew 14% and",
    },
  },
};
