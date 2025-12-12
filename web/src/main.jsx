import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CheckinPage from "./components/checkin/CheckinPage.jsx";
import GivePage from "./components/giving/GivePage.jsx";
import StatusPage from "./components/status/StatusPage.jsx";
import OfflineNotice from "./components/ui/OfflineNotice.jsx";
import { registerServiceWorker } from "./serviceWorker";
import { enforcePreferredHost } from "./utils/baseUrl";
import "./index.css";

enforcePreferredHost();

const currentPath = window.location.pathname;
const isCheckinRoute = currentPath.startsWith("/checkin");
const isStatusRoute = currentPath.startsWith("/status");
const isGiveRoute = currentPath.startsWith("/give");
const RootComponent = isCheckinRoute
  ? CheckinPage
  : isGiveRoute
    ? GivePage
    : isStatusRoute
      ? StatusPage
      : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineNotice />
    <RootComponent />
  </React.StrictMode>
);

registerServiceWorker();
