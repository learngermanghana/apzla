import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STATUS_COLORS = {
  ok: { text: "#166534", background: "#dcfce7", border: "#bbf7d0" },
  error: { text: "#991b1b", background: "#fee2e2", border: "#fecdd3" },
  skipped: { text: "#92400e", background: "#fef3c7", border: "#fde68a" },
  loading: { text: "#1f2937", background: "#e5e7eb", border: "#d1d5db" },
  unknown: { text: "#1f2937", background: "#e5e7eb", border: "#d1d5db" },
};

function StatusBadge({ label, status }) {
  const palette = STATUS_COLORS[status] || STATUS_COLORS.unknown;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        borderRadius: "999px",
        fontWeight: 600,
        fontSize: "13px",
        color: palette.text,
        background: palette.background,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "999px",
          background: palette.text,
          boxShadow: `0 0 0 4px ${palette.background}`,
        }}
      />
      {label}
    </span>
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "Not available";
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function StatusPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMountedRef = useRef(true);

  const appStatus = useMemo(() => {
    if (loading && !health) return "loading";
    if (health?.status) return health.status;
    if (error) return "error";
    return "unknown";
  }, [health, loading, error]);

  const fetchHealth = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/health");

      if (!response.ok) {
        const body = await response.text();
        const message = `Health endpoint returned ${response.status}: ${body || response.statusText}`;
        console.error("Health fetch failed", message);
        throw new Error(message);
      }

      const payload = await response.json();
      if (!isMountedRef.current) return;
      setHealth(payload);
      setError(null);
    } catch (err) {
      console.error("Health fetch failed", err);
      if (!isMountedRef.current) return;
      setError(err.message || "Unable to load health status.");
      setHealth(null);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLastUpdated(new Date());
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchHealth]);

  const firestoreStatus = health?.firestore?.status || (error ? "error" : "unknown");
  const firestoreMessage = health?.firestore?.message;
  const firestoreUpdate = health?.firestore?.updateTime || health?.firestore?.createTime;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background:
          "radial-gradient(circle at 20% 20%, #dbeafe 0, transparent 30%), radial-gradient(circle at 80% 10%, #d1fae5 0, transparent 28%), #f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "white",
          borderRadius: "20px",
          padding: "28px",
          boxShadow: "0 15px 60px rgba(15, 23, 42, 0.08)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>System status</div>
            <h1 style={{ margin: "4px 0 8px", fontSize: "26px" }}>Application health</h1>
            <p style={{ margin: 0, color: "#4b5563", maxWidth: "560px" }}>
              Live view of the application health check. This widget auto-refreshes
              every 15 seconds and logs failed requests to the console for
              debugging.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={fetchHealth}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: loading ? "#f3f4f6" : "#0f172a",
                color: loading ? "#6b7280" : "white",
                cursor: loading ? "default" : "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
              disabled={loading}
              aria-busy={loading}
              aria-label="Refresh status"
            >
              {loading ? "Refreshing…" : "Refresh now"}
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: "22px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              padding: "18px",
              borderRadius: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <StatusBadge label={`App status: ${appStatus}`} status={appStatus} />
            </div>
            <p style={{ margin: "12px 0 0", color: "#475569", fontSize: "14px" }}>
              Overall health reported by <code style={{ fontFamily: "monospace" }}>/api/health</code>.
            </p>
          </div>

          <div
            style={{
              padding: "18px",
              borderRadius: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <StatusBadge
                label={`Firestore: ${firestoreStatus}`}
                status={firestoreStatus}
              />
            </div>
            <div style={{ marginTop: "10px", color: "#475569", fontSize: "14px" }}>
              <div>Message: {firestoreMessage || "No additional details"}</div>
              <div>Last updated: {formatDate(firestoreUpdate)}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "18px",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "#fff7ed",
            border: "1px dashed #fbbf24",
            color: "#92400e",
            fontSize: "14px",
          }}
        >
          <div style={{ fontWeight: 600 }}>Auto-refresh</div>
          <div>
            Health checks refresh every 15 seconds. Failed requests are logged to
            the browser console to aid debugging.
          </div>
          {lastUpdated && (
            <div style={{ marginTop: "6px", color: "#78350f" }}>
              Last updated at {formatDate(lastUpdated)}
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: "16px",
              padding: "14px 16px",
              borderRadius: "14px",
              background: "#fef2f2",
              border: "1px solid #fecdd3",
              color: "#991b1b",
              fontSize: "14px",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>
              Unable to load status
            </div>
            <div>{error}</div>
            <div style={{ marginTop: "6px", fontSize: "13px" }}>
              Check the developer console for detailed error logs.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusPage;
