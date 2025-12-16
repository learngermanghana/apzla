import PropTypes from "prop-types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Pill from "../ui/Pill";

export function ChurchSetupPanel({
  userEmail,
  churchName,
  churchAddress,
  churchCountry,
  churchCity,
  churchPhone,
  onChangeChurchName,
  onChangeChurchAddress,
  onChangeChurchCountry,
  onChangeChurchCity,
  onChangeChurchPhone,
  onCreateChurch,
  onLogout,
  loading,
}) {
  return (
    <div className="app-shell soft-background">
      <Card className="centered-panel" style={{ boxShadow: "0 15px 30px rgba(15,23,42,0.1)" }}>
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
            <Pill variant="white" style={{ color: "#4338ca", marginBottom: "8px" }}>
              <span aria-hidden>⛪</span>
              Church onboarding
            </Pill>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                margin: "6px 0 4px",
              }}
            >
              Welcome to Apzla
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

          <Button variant="danger" onClick={onLogout} style={{ borderRadius: "10px" }}>
            Logout
          </Button>
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
          <Input
            type="text"
            placeholder="Church name (e.g. Grace Chapel International)"
            value={churchName}
            onChange={onChangeChurchName}
          />
          <Input
            type="text"
            placeholder="Street address"
            value={churchAddress}
            onChange={onChangeChurchAddress}
          />
          <Input
            type="text"
            placeholder="Country"
            value={churchCountry}
            onChange={onChangeChurchCountry}
          />
          <Input
            type="text"
            placeholder="City"
            value={churchCity}
            onChange={onChangeChurchCity}
          />
          <Input
            type="text"
            placeholder="Church phone number"
            value={churchPhone}
            onChange={onChangeChurchPhone}
          />
          <Button
            onClick={onCreateChurch}
            disabled={loading}
            fullWidth
            style={{ marginTop: "8px" }}
            variant={loading ? "secondary" : "primary"}
          >
            {loading ? "Saving..." : "Create Church"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

ChurchSetupPanel.propTypes = {
  userEmail: PropTypes.string.isRequired,
  churchName: PropTypes.string.isRequired,
  churchAddress: PropTypes.string.isRequired,
  churchCountry: PropTypes.string.isRequired,
  churchCity: PropTypes.string.isRequired,
  churchPhone: PropTypes.string.isRequired,
  onChangeChurchName: PropTypes.func.isRequired,
  onChangeChurchAddress: PropTypes.func.isRequired,
  onChangeChurchCountry: PropTypes.func.isRequired,
  onChangeChurchCity: PropTypes.func.isRequired,
  onChangeChurchPhone: PropTypes.func.isRequired,
  onCreateChurch: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ChurchSetupPanel;
