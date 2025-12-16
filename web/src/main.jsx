import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CheckinPage from "./components/checkin/CheckinPage.jsx";
import GivePage from "./components/giving/GivePage.jsx";
import MemberInvitePage from "./components/members/MemberInvitePage.jsx";
import StatusPage from "./components/status/StatusPage.jsx";
import TrustPage from "./components/trust/TrustPage.jsx";
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
const isMemberInviteRoute =
  pathname === "/member-invite" || pathname.startsWith("/member-invite/");
const isTrustRoute = ["/privacy", "/terms", "/contact"].includes(pathname);

function getSecondSegment(path) {
  // "/checkin/<token>" => "<token>"
  const parts = path.split("/").filter(Boolean); // removes empty
  return parts.length >= 2 ? parts[1] : null;
}

const checkinToken = isCheckinRoute ? getSecondSegment(pathname) : null;
const giveId = isGiveRoute ? getSecondSegment(pathname) : null;
const inviteToken = isMemberInviteRoute ? getSecondSegment(pathname) : null;
const trustPage = isTrustRoute ? pathname.slice(1) : null;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineNotice />
    {isCheckinRoute ? (
      <CheckinPage token={checkinToken} />
    ) : isGiveRoute ? (
      <GivePage id={giveId} />
    ) : isMemberInviteRoute ? (
      <MemberInvitePage token={inviteToken} />
    ) : isStatusRoute ? (
      <StatusPage />
    ) : isTrustRoute ? (
      <TrustPage page={trustPage} />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

registerServiceWorker();
