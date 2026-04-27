import type { App } from "@modelcontextprotocol/ext-apps";
import type { Meta, StoryObj } from "@storybook/react";
import { GetTimeAppInner } from "./GetTimeAppInner.js";

function mockApp(overrides: Partial<App> = {}): App {
  const fake = {
    callServerTool: async () => ({
      content: [{ type: "text", text: new Date().toISOString() }],
    }),
    sendMessage: async () => ({ isError: false }),
    sendLog: async () => undefined,
    openLink: async () => ({ isError: false }),
    getHostContext: () => ({}),
    ...overrides,
  } as unknown as App;
  return fake;
}

const meta: Meta<typeof GetTimeAppInner> = {
  title: "MCP App/GetTimeAppInner",
  component: GetTimeAppInner,
};

export default meta;
type Story = StoryObj<typeof GetTimeAppInner>;

export const Default: Story = {
  args: {
    app: mockApp(),
    toolResult: null,
  },
};

export const WithToolResult: Story = {
  args: {
    app: mockApp(),
    toolResult: {
      content: [{ type: "text", text: "2026-04-27T10:30:00.000Z" }],
    },
  },
};

export const WithSafeAreaInsets: Story = {
  args: {
    app: mockApp(),
    toolResult: null,
    hostContext: {
      safeAreaInsets: { top: 24, right: 16, bottom: 24, left: 16 },
    },
  },
};

export const ErrorOnGetTime: Story = {
  args: {
    app: mockApp({
      callServerTool: async () => {
        throw new Error("simulated server failure");
      },
    }),
    toolResult: null,
  },
};
