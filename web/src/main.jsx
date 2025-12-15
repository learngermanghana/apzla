import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CheckinPage from "./components/checkin/CheckinPage.jsx";
import GivePage from "./components/giving/GivePage.jsx";
import MemberInvitePage from "./components/members/MemberInvitePage.jsx";
import StatusPage from "./components/status/StatusPage.jsx";
import OfflineNotice from "./components/ui/OfflineNotice.jsx";
import { registerServiceWorker } from "./serviceWorker";
import { enforcePreferredHost } from "./utils/baseUrl";
import "./index.css";

enforcePreferredHost();

const { pathname } = window.location;

const isCheckinRoute = ["/checkin", "/attendance", "/self-checkin"].some(
  (route) => pathname === route || pathname.startsWith(`${route}/`)
);

const isStatusRoute = pathname === "/status" || pathname.startsWith("/status/");
const isGiveRoute = pathname === "/give" || pathname.startsWith("/give/");
const isMemberInviteRoute = pathname === "/join" || pathname.startsWith("/join/");

function getSecondSegment(path) {
  // "/give/<id>" => "<id>"
  const parts = path.split("/").filter(Boolean); // removes empty
  return parts.length >= 2 ? parts[1] : null;
}

const giveId = isGiveRoute ? getSecondSegment(pathname) : null;
const memberInviteId = isMemberInviteRoute ? getSecondSegment(pathname) : null;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineNotice />
    {isCheckinRoute ? (
      <CheckinPage />
    ) : isGiveRoute ? (
      <GivePage id={giveId} />
    ) : isMemberInviteRoute ? (
      <MemberInvitePage churchId={memberInviteId} />
    ) : isStatusRoute ? (
      <StatusPage />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

registerServiceWorker();
