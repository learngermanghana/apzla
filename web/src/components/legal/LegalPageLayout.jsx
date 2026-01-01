import React from "react";
import PropTypes from "prop-types";

function LegalPageLayout({ title, updatedAt, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "48px 20px",
        background:
          "radial-gradient(circle at 15% 20%, #e0e7ff 0, transparent 40%), radial-gradient(circle at 85% 10%, #dcfce7 0, transparent 35%), #f8fafc",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          background: "white",
          borderRadius: "24px",
          padding: "36px",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Apzla
            </p>
            <h1 style={{ margin: "6px 0 8px", fontSize: "30px" }}>{title}</h1>
            <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
              Last updated: {updatedAt}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href="/"
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                background: "#0f172a",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Back to sign in
            </a>
            <a
              href="/status"
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Status
            </a>
          </div>
        </div>

        <div style={{ marginTop: "28px", color: "#1f2937", lineHeight: 1.7 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

LegalPageLayout.propTypes = {
  title: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default LegalPageLayout;
