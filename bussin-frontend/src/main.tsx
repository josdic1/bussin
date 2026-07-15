import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DriverPage } from "./pages/driver/DriverPage";
import { ParentPage } from "./pages/parent/ParentPage";
import "./styles.css";

const Page = window.location.pathname.startsWith("/driver")
  ? DriverPage
  : ParentPage;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
