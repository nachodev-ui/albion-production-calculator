import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AccountSessionProvider } from "@features/account/context/AccountSessionContext";
import { CalculationPrintPage } from "@features/craft-calculator/components/summary/CalculationPrintPage";
import { warmCentralMarketApi } from "@features/market-data/api/warmCentralMarketApi";
import { CloudPresetSync } from "@features/presets/components/CloudPresetSync";
import "./index.css";
import "./print.css";
import App from "./App.tsx";

const searchParams = new URLSearchParams(window.location.search);
const printToken = searchParams.get("printSummary");
const sharedCalculationToken = searchParams.get("c");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {printToken ? (
      <CalculationPrintPage token={printToken} />
    ) : sharedCalculationToken ? (
      <CalculationPrintPage token={sharedCalculationToken} shared />
    ) : (
      <AccountSessionProvider>
        <CloudPresetSync />
        <App />
      </AccountSessionProvider>
    )}
  </StrictMode>,
);

if (!printToken && !sharedCalculationToken) {
  void warmCentralMarketApi();
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/item-icon-cache-sw.js", {
      scope: "/",
    });
  });
}
