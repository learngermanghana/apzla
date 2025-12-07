import PropTypes from "prop-types";

function Field({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        padding: "8px 10px",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        fontSize: "14px",
      }}
    />
  );
}

Field.propTypes = {
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export function ChurchSetupPanel({
  userEmail,
  churchName,
  churchCountry,
  churchCity,
  onChangeChurchName,
  onChangeChurchCountry,
  onChangeChurchCity,
  onCreateChurch,
  onLogout,
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
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 15px 30px rgba(15,23,42,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "4px",
              }}
            >
              ⛪ Welcome to Apzla
            </h1>
            <p
              style={{
                margin: 0,
                color: "#4b5563",
                fontSize: "13px",
              }}
            >
              Where Ministry Meets Order.
            </p>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              Logged in as <strong>{userEmail}</strong>
            </p>
          </div>

          <button
            onClick={onLogout}
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              border: "none",
              background: "#ef4444",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Logout
          </button>
        </div>

        <p
          style={{
            marginBottom: "16px",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          Let’s set up your church. This creates your first church in Apzla and
          links it to your account as the church admin.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxWidth: "400px",
          }}
        >
          <Field
            placeholder="Church name (e.g. Grace Chapel International)"
            value={churchName}
            onChange={onChangeChurchName}
          />
          <Field
            placeholder="Country"
            value={churchCountry}
            onChange={onChangeChurchCountry}
          />
          <Field
            placeholder="City"
            value={churchCity}
            onChange={onChangeChurchCity}
          />
          <button
            onClick={onCreateChurch}
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
            {loading ? "Saving..." : "Create Church"}
          </button>
        </div>
      </div>
    </div>
  );
}

ChurchSetupPanel.propTypes = {
  userEmail: PropTypes.string.isRequired,
  churchName: PropTypes.string.isRequired,
  churchCountry: PropTypes.string.isRequired,
  churchCity: PropTypes.string.isRequired,
  onChangeChurchName: PropTypes.func.isRequired,
  onChangeChurchCountry: PropTypes.func.isRequired,
  onChangeChurchCity: PropTypes.func.isRequired,
  onCreateChurch: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ChurchSetupPanel;
