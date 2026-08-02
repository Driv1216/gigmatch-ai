import "@fontsource-variable/archivo";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/space-grotesk";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { WorkflowProvider } from "./domain/WorkflowProvider";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WorkflowProvider>
        <App />
      </WorkflowProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
