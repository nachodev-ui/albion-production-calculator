import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AccountSessionProvider } from "@features/account/context/AccountSessionContext";
import { CalculationPrintPage } from "@features/craft-calculator/components/summary/CalculationPrintPage";
import { SharedCalculationPage } from "@features/craft-calculator/components/summary/SharedCalculationPage";
import { CloudPresetSync } from "@features/presets/components/CloudPresetSync";
import "./index.css";
import App from "./App.tsx";

const searchParams = new URLSearchParams(window.location.search);
const printToken = searchParams.get("printSummary");
const sharedCalculationToken = searchParams.get("c");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {printToken ? (
      <CalculationPrintPage token={printToken} />
    ) : sharedCalculationToken ? (
      <SharedCalculationPage token={sharedCalculationToken} />
    ) : (
      <AccountSessionProvider>
        <CloudPresetSync />
        <App />
      </AccountSessionProvider>
    )}
  </StrictMode>,
);
