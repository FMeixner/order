import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// Offline-Fähigkeit: nur in der normalen Web-Ausgabe, nicht in der Einzeldatei-Vorschau
if ("serviceWorker" in navigator && import.meta.env.PROD && !__SINGLE__ && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
