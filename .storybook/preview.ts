import type { Preview } from "@storybook/react";
import "../src/global.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: "host-light",
      values: [
        { name: "host-light", value: "#ffffff" },
        { name: "host-dark", value: "#1a1a1a" },
      ],
    },
  },
};

export default preview;
