import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const seasonPreview = import.meta.env.VITE_ENABLE_SEASON_PREVIEW === "true"
  && new URLSearchParams(window.location.search).get("scorecard") !== "1";
const SeasonPreview = React.lazy(() => import("./season/SeasonPreview"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {seasonPreview ? (
      <React.Suspense fallback={<div className="min-h-screen bg-slate-950 p-8 text-white">Loading season preview…</div>}>
        <SeasonPreview />
      </React.Suspense>
    ) : <App />}
  </React.StrictMode>
);

if (!seasonPreview && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
