import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
// @ts-ignore
import { Formio } from "react-formio";


const MY_SERVER_URL = "http://localhost:8080/api/forms"; 

Formio.setBaseUrl(MY_SERVER_URL);
Formio.setProjectUrl(MY_SERVER_URL);

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <App />
);
