import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
// @ts-ignore
import { Formio } from "react-formio";
// 🟢 Import Config
import { FORM_IO_API_URL } from "./config";

// 🟢 Use Variable
const MY_SERVER_URL = FORM_IO_API_URL;

Formio.setBaseUrl(MY_SERVER_URL);
Formio.setProjectUrl(MY_SERVER_URL);

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <App />
);
