import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>IMPACT ATLAS</h1>
        <p>
          The application could not load. Your exported files are unaffected.
        </p>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("impact-atlas:last");
            } catch {}
            location.hash = "";
            location.reload();
          }}
        >
          Reset current scenario and reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);
if (
  import.meta.env.PROD &&
  location.protocol !== "file:" &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* Offline cache is optional; bundled map remains local. */
    });
  });
}
