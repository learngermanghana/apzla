// web/src/components/StatusBanner.jsx
import React from "react";

const toneClassMap = {
  info: "checkin-banner-info",
  success: "checkin-banner-success",
  error: "checkin-banner-error",
};

export default function StatusBanner({ tone = "info", message = "" }) {
  if (!message) return null;

  const toneClass = toneClassMap[tone] || toneClassMap.info;

  return <div className={`checkin-banner ${toneClass}`}>{message}</div>;
}
