import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DocumentWriterApp } from "./components/DocumentWriterApp.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocumentWriterApp />
  </StrictMode>,
);
