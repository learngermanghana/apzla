import PropTypes from "prop-types";

function ToggleButton({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 0",
        borderRadius: "999px",
        border: "1px solid #cbd5e1",
        background: isActive
          ? "linear-gradient(135deg, #4338ca, #2563eb)"
          : "#f1f5f9",
        color: isActive ? "white" : "#0f172a",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "14px",
        boxShadow: isActive ? "0 10px 30px rgba(37,99,235,0.25)" : "none",
      }}
    >
      {label}
    </button>
  );
}

ToggleButton.propTypes = {
  label: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

export function AuthPanel({
  authMode,
  setAuthMode,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  loading,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px 64px",
        background:
          "radial-gradient(circle at 10% 20%, rgba(59,130,246,0.12) 0, transparent 30%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.14) 0, transparent 30%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.12) 0, transparent 32%), linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
        color: "#0f172a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0, rgba(255,255,255,0) 35%), radial-gradient(circle at 70% 10%, rgba(236,72,153,0.08) 0, rgba(255,255,255,0) 25%)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "28px",
          alignItems: "stretch",
          maxWidth: "1080px",
          width: "100%",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.85)",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 25px 60px rgba(15,23,42,0.1)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: "#eef2ff",
              color: "#4338ca",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            <span style={{ fontSize: "18px" }}>⛪</span>
            Apzla for Churches
          </div>

          <h1
            style={{
              fontSize: "32px",
              margin: "16px 0 8px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Ministry-first customer relationships.
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              color: "#475569",
              fontSize: "15px",
              maxWidth: "540px",
            }}
          >
            Apzla is a modern ministry relationship platform built for churches.
            Unite follow-up, member care, attendance, giving, and communication
            in one beautiful workspace.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                background: "linear-gradient(145deg, #eef2ff, #e0f2fe)",
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid rgba(148,163,184,0.35)",
              }}
            >
              <p style={{ margin: 0, color: "#4338ca", fontSize: "12px" }}>
                Mission
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontWeight: 700,
                  color: "#111827",
                  fontSize: "15px",
                }}
              >
                Equip every church to love people well with clear, actionable
                data.
              </p>
            </div>
            <div
              style={{
                background: "white",
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid rgba(148,163,184,0.35)",
                boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
              }}
            >
              <p style={{ margin: 0, color: "#0f766e", fontSize: "12px" }}>
                About Us
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontWeight: 700,
                  color: "#111827",
                  fontSize: "15px",
                }}
              >
                A pastoral co-pilot that captures every guest, follow-up, and
                service moment.
              </p>
            </div>
            <div
              style={{
                background: "#0f172a",
                padding: "14px",
                borderRadius: "14px",
                color: "white",
                boxShadow: "0 16px 40px rgba(15,23,42,0.4)",
              }}
            >
              <p style={{ margin: 0, opacity: 0.8, fontSize: "12px" }}>
                Our Promise
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontWeight: 700,
                  fontSize: "15px",
                }}
              >
                Simple to adopt. Secure by default. Built for shepherding teams.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {["Member care CRM", "Attendance & giving", "Visitor follow-up", "Sermon + media links"].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(148,163,184,0.3)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: "30px",
                      height: "30px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #4338ca, #22c55e)",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>
                      {item}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                      Purpose-built for ministry momentum.
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 25px 60px rgba(15,23,42,0.14)",
            border: "1px solid rgba(148,163,184,0.25)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <h2
              style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 6px" }}
            >
              Welcome back
            </h2>
            <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
              Sign in to shepherd your church with clarity and care.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
              fontSize: "14px",
            }}
          >
            <ToggleButton
              label="Login"
              isActive={authMode === "login"}
              onClick={() => setAuthMode("login")}
            />
            <ToggleButton
              label="Register"
              isActive={authMode === "register"}
              onClick={() => setAuthMode("register")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={onEmailChange}
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                background: "#f8fafc",
                outline: "none",
              }}
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={onPasswordChange}
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                background: "#f8fafc",
                outline: "none",
              }}
            />
            <button
              onClick={onSubmit}
              disabled={loading}
              style={{
                marginTop: "8px",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "none",
                background: loading
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #4338ca, #2563eb)",
                color: loading ? "#475569" : "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: 700,
                boxShadow: "0 10px 30px rgba(37,99,235,0.35)",
              }}
            >
              {loading
                ? "Working..."
                : authMode === "login"
                ? "Login"
                : "Create account"}
            </button>
          </div>

          <p
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Secure, role-aware access for every ministry leader. Need help?
            Email us at hello@apzla.com.
          </p>
        </div>
      </div>
    </div>
  );
}

AuthPanel.propTypes = {
  authMode: PropTypes.oneOf(["login", "register"]).isRequired,
  setAuthMode: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default AuthPanel;
