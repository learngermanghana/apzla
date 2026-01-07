import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CheckinPage from "./components/checkin/CheckinPage.jsx";
import GivePage from "./components/giving/GivePage.jsx";
import MemberInvitePage from "./components/members/MemberInvitePage.jsx";
import StatusPage from "./components/status/StatusPage.jsx";
import OfflineNotice from "./components/ui/OfflineNotice.jsx";
import PrivacyPage from "./components/legal/PrivacyPage.jsx";
import TermsPage from "./components/legal/TermsPage.jsx";
import PublicSermonDetailPage from "./modules/sermons/PublicSermonDetailPage.jsx";
import PublicSermonsPage from "./modules/sermons/PublicSermonsPage.jsx";
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
const isSermonsRoute = pathname === "/sermons" || pathname.startsWith("/sermons/");
const isPrivacyRoute = pathname === "/privacy" || pathname.startsWith("/privacy/");
const isTermsRoute = pathname === "/terms" || pathname.startsWith("/terms/");

function getSecondSegment(path) {
  // "/checkin/<token>" => "<token>"
  const parts = path.split("/").filter(Boolean); // removes empty
  return parts.length >= 2 ? parts[1] : null;
}

function getSermonSegments(path) {
  // "/sermons/<churchId>/<sermonId>" => { churchId, sermonId }
  const parts = path.split("/").filter(Boolean);
  return {
    churchId: parts.length >= 2 ? parts[1] : null,
    sermonId: parts.length >= 3 ? parts[2] : null,
  };
}

const checkinToken = isCheckinRoute ? getSecondSegment(pathname) : null;
const giveId = isGiveRoute ? getSecondSegment(pathname) : null;
const inviteToken = isMemberInviteRoute ? getSecondSegment(pathname) : null;
const { churchId: sermonsChurchId, sermonId } = isSermonsRoute
  ? getSermonSegments(pathname)
  : { churchId: null, sermonId: null };

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineNotice />
    {isCheckinRoute ? (
      <CheckinPage token={checkinToken} />
    ) : isGiveRoute ? (
      <GivePage id={giveId} />
    ) : isMemberInviteRoute ? (
      <MemberInvitePage token={inviteToken} />
    ) : isSermonsRoute ? (
      sermonId ? (
        <PublicSermonDetailPage churchId={sermonsChurchId} sermonId={sermonId} />
      ) : (
        <PublicSermonsPage churchId={sermonsChurchId} />
      )
    ) : isPrivacyRoute ? (
      <PrivacyPage />
    ) : isTermsRoute ? (
      <TermsPage />
    ) : isStatusRoute ? (
      <StatusPage />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

registerServiceWorker();
