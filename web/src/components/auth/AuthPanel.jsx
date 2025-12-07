import PropTypes from "prop-types";

function ToggleButton({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 0",
        borderRadius: "999px",
        border: "none",
        background: isActive ? "#111827" : "#e5e7eb",
        color: isActive ? "white" : "#111827",
        cursor: "pointer",
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
        background: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 15px 30px rgba(15,23,42,0.1)",
        }}
      >
        <h1 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "4px" }}>
          ⛪ Apzla
        </h1>
        <p
          style={{
            marginBottom: "16px",
            color: "#4b5563",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Where Ministry Meets Order.
        </p>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
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

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={onEmailChange}
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
            }}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={onPasswordChange}
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
            }}
          />
          <button
            onClick={onSubmit}
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: loading ? "#6b7280" : "#111827",
              color: "white",
              cursor: loading ? "default" : "pointer",
              fontSize: "14px",
              fontWeight: 500,
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
            marginTop: "16px",
            fontSize: "12px",
            color: "#9ca3af",
          }}
        >
          This is a basic auth screen. Later we’ll turn this into a proper
          onboarding flow with roles and invitations.
        </p>
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
