import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GetTimeApp } from "./components/GetTimeApp.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GetTimeApp />
  </StrictMode>,
);
