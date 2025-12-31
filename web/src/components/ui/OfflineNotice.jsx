import React from "react";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";

function OfflineNotice() {
  const isOffline = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="status">
      <div className="offline-banner__content">
        <p className="offline-banner__title">You are currently offline.</p>
        <p className="offline-banner__subtitle">
          Any changes will sync when your connection returns. You can continue
          browsing cached pages.
        </p>
      </div>
    </div>
  );
}

export default OfflineNotice;
