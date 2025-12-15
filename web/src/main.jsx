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

const { pathname } = window.location;

// Accept both /checkin/... and /attendance/...
const isCheckinRoute =
  pathname === "/checkin" ||
  pathname.startsWith("/checkin/") ||
  pathname === "/attendance" ||
  pathname.startsWith("/attendance/");

const isStatusRoute = pathname === "/status" || pathname.startsWith("/status/");
const isGiveRoute = pathname === "/give" || pathname.startsWith("/give/");

function getSecondSegment(path) {
  // "/checkin/<token>" => "<token>"
  const parts = path.split("/").filter(Boolean); // removes empty
  return parts.length >= 2 ? parts[1] : null;
}

const checkinToken = isCheckinRoute ? getSecondSegment(pathname) : null;
const giveId = isGiveRoute ? getSecondSegment(pathname) : null;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineNotice />
    {isCheckinRoute ? (
      <CheckinPage token={checkinToken} />
    ) : isGiveRoute ? (
      <GivePage id={giveId} />
    ) : isStatusRoute ? (
      <StatusPage />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

registerServiceWorker();
