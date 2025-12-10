// web/src/components/StatusBanner.jsx
import React from "react";
import PropTypes from "prop-types";

const TONES = {
  success: { background: "#dcfce7", border: "#bbf7d0", color: "#166534" },
  error: { background: "#fee2e2", border: "#fecdd3", color: "#991b1b" },
  warning: { background: "#fef3c7", border: "#fde68a", color: "#92400e" },
  info: { background: "#e0f2fe", border: "#bfdbfe", color: "#1d4ed8" },
};

function StatusBanner({ tone = "info", message }) {
  if (!message) return null;

  const palette = TONES[tone] || TONES.info;

  return (
    <div
      className="checkin-banner"
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: palette.background,
        border: `1px solid ${palette.border}`,
        color: palette.color,
      }}
    >
      {message}
    </div>
  );
}

StatusBanner.propTypes = {
  tone: PropTypes.string,
  message: PropTypes.string,
};

export default StatusBanner;
