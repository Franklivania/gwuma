import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/app";
import { Providers } from "@/app/providers";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
