import React from "react";
import PropTypes from "prop-types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Pill from "../ui/Pill";
import churchPhoto from "../../assets/pexels-jibarofoto-2019331.jpg";

export function AuthPanel({
  authMode,
  setAuthMode,
  email,
  password,
  churchName,
  churchAddress,
  churchCity,
  churchPhone,
  onEmailChange,
  onPasswordChange,
  onChurchNameChange,
  onChurchAddressChange,
  onChurchCityChange,
  onChurchPhoneChange,
  onSubmit,
  loading,
  errorMessage,
  disableSubmit,
  validationMessage,
  onForgotPassword,
  passwordResetMessage,
  passwordResetError,
  passwordResetLoading,
}) {
  const inlineError = errorMessage || validationMessage;

  return (
    <div className="app-shell auth-gradient" style={{ color: "#0f172a" }}>
      <div aria-hidden className="auth-overlay" />

      <div className="auth-grid">
        <Card variant="frosted" style={{ borderRadius: "20px", padding: "28px" }}>
          <div className="auth-hero-photo" role="img" aria-label="Church community worshipping">
            <div className="auth-hero-photo-overlay" />
            <img src={churchPhoto} alt="Congregation worshipping" loading="lazy" />
            <div className="auth-hero-photo-caption">
              <span aria-hidden>🌅</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Tithes & offerings</p>
                <p style={{ margin: 0, fontSize: "12px" }}>
                  Deliver giving receipts fast with next-day payouts.
                </p>
              </div>
            </div>
          </div>
          <Pill variant="purple">
            <span style={{ fontSize: "18px" }} aria-hidden>
              ⛪
            </span>
            Apzla for Churches
          </Pill>

          <h1
            style={{
              fontSize: "32px",
              margin: "16px 0 8px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Everything your church needs to welcome, track, and grow.
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              color: "#475569",
              fontSize: "15px",
              maxWidth: "540px",
            }}
          >
            Apzla brings overview dashboards, member care, attendance, giving,
            sermons, and bulk messaging into one ministry workspace. Invite
            guests with a link or QR code, capture attendance automatically,
            and deliver tithes to bank accounts or mobile money within 24 hours.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <Card variant="gradient" className="ui-card-compact">
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
            </Card>
            <Card variant="compact">
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
            </Card>
            <Card variant="dark" className="ui-card-compact">
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
            </Card>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {[
              {
                title: "Overview dashboards",
                description: "See attendance, giving, and follow-up health at a glance.",
              },
              {
                title: "Members & guests",
                description: "Add manually or invite with a link or QR code.",
              },
              {
                title: "Attendance tracking",
                description: "Record manually or capture attendance automatically.",
              },
              {
                title: "Tithes & offerings",
                description:
                  "Dedicated sub-accounts with payouts to bank or mobile money in 24 hours.",
              },
              {
                title: "Bulk messaging",
                description: "Send announcements and care reminders in minutes.",
              },
              {
                title: "Sermon sharing",
                description: "Publish a free public URL for every sermon and share everywhere.",
              },
            ].map((item) => (
              <Card
                key={item.title}
                variant="compact"
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
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
                    {item.title}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                    {item.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ marginTop: "20px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: 800 }}>
              Pricing that scales with your ministry
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              {[
                {
                  title: "14-day trial",
                  price: "Free",
                  detail: "Start today and explore every feature for two weeks.",
                },
                {
                  title: "Monthly plan",
                  price: "GHS 120",
                  detail: "Pay monthly and keep giving receipts flowing.",
                },
                {
                  title: "Yearly plan",
                  price: "GHS 1,200",
                  detail: "Subscribe yearly and save two months.",
                },
              ].map((plan) => (
                <Card key={plan.title} variant="compact" className="ui-card-compact">
                  <p style={{ margin: 0, color: "#4338ca", fontSize: "12px" }}>
                    {plan.title}
                  </p>
                  <p style={{ margin: "6px 0 0", fontWeight: 800, fontSize: "18px" }}>
                    {plan.price}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#475569" }}>
                    {plan.detail}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </Card>

        <Card
          style={{
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 25px 60px rgba(15,23,42,0.14)",
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
            <Button
              variant="toggle"
              active={authMode === "login"}
              onClick={() => setAuthMode("login")}
              fullWidth
            >
              Login
            </Button>
            <Button
              variant="toggle"
              active={authMode === "register"}
              onClick={() => setAuthMode("register")}
              fullWidth
            >
              Register
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={onEmailChange}
              style={{ background: "#f8fafc" }}
            />
          <Input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={onPasswordChange}
            style={{ background: "#f8fafc" }}
          />
          {authMode === "login" && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={passwordResetLoading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4f46e5",
                  cursor: passwordResetLoading ? "default" : "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "2px 0",
                }}
              >
                {passwordResetLoading ? "Sending reset email..." : "Forgot password?"}
              </button>
            </div>
          )}
          {authMode === "register" && (
            <>
              <Input
                type="text"
                placeholder="Church name"
                  value={churchName}
                  onChange={onChurchNameChange}
                  style={{ background: "#f8fafc" }}
                />
                <Input
                  type="text"
                  placeholder="Church address"
                  value={churchAddress}
                  onChange={onChurchAddressChange}
                  style={{ background: "#f8fafc" }}
                />
                <Input
                  type="text"
                  placeholder="City"
                  value={churchCity}
                  onChange={onChurchCityChange}
                  style={{ background: "#f8fafc" }}
                />
                <Input
                  type="text"
                  placeholder="Church phone number"
                  value={churchPhone}
                  onChange={onChurchPhoneChange}
                  style={{ background: "#f8fafc" }}
                />
              </>
            )}
          {inlineError && (
            <p
              role="alert"
              style={{
                margin: 0,
                  color: "#b91c1c",
                  fontSize: "13px",
                  background: "#fef2f2",
                  border: "1px solid #fecdd3",
                  borderRadius: "10px",
                  padding: "10px 12px",
                }}
            >
              {inlineError}
            </p>
          )}
          {authMode === "login" && passwordResetMessage && (
            <p
              style={{
                margin: 0,
                color: "#166534",
                fontSize: "13px",
                background: "#ecfdf3",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              {passwordResetMessage}
            </p>
          )}
          {authMode === "login" && passwordResetError && (
            <p
              role="alert"
              style={{
                margin: 0,
                color: "#b91c1c",
                fontSize: "13px",
                background: "#fef2f2",
                border: "1px solid #fecdd3",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              {passwordResetError}
            </p>
          )}
          <Button
            onClick={onSubmit}
            disabled={disableSubmit}
            fullWidth
            style={{ marginTop: "8px" }}
            >
              {loading
                ? "Working..."
                : authMode === "login"
                ? "Login"
                : "Create account"}
            </Button>
          </div>

          <p
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Secure, role-aware access for every ministry leader. Need help?
            Email us at{" "}
            <a href="mailto:sedifexbiz@gmail.com" style={{ color: "#2563eb" }}>
              sedifexbiz@gmail.com
            </a>{" "}
            or message us on{" "}
            <a
              href="https://wa.me/233595054266"
              style={{ color: "#2563eb" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp via WhatsApp API
            </a>
            .
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            <span style={{ fontWeight: 600, color: "#0f172a" }}>
              Follow us:
            </span>
            <a
              href="https://www.instagram.com/sedifexbiz"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb", fontWeight: 600 }}
            >
              Instagram
            </a>
            <a
              href="https://www.tiktok.com/@sedifex"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb", fontWeight: 600 }}
            >
              TikTok
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

AuthPanel.propTypes = {
  authMode: PropTypes.oneOf(["login", "register"]).isRequired,
  setAuthMode: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  churchName: PropTypes.string,
  churchAddress: PropTypes.string,
  churchCity: PropTypes.string,
  churchPhone: PropTypes.string,
  onEmailChange: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
  onChurchNameChange: PropTypes.func,
  onChurchAddressChange: PropTypes.func,
  onChurchCityChange: PropTypes.func,
  onChurchPhoneChange: PropTypes.func,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  disableSubmit: PropTypes.bool,
  validationMessage: PropTypes.string,
  onForgotPassword: PropTypes.func,
  passwordResetMessage: PropTypes.string,
  passwordResetError: PropTypes.string,
  passwordResetLoading: PropTypes.bool,
};

AuthPanel.defaultProps = {
  errorMessage: "",
  disableSubmit: false,
  validationMessage: "",
  churchName: "",
  churchAddress: "",
  churchCity: "",
  churchPhone: "",
  onChurchNameChange: undefined,
  onChurchAddressChange: undefined,
  onChurchCityChange: undefined,
  onChurchPhoneChange: undefined,
  onForgotPassword: undefined,
  passwordResetMessage: "",
  passwordResetError: "",
  passwordResetLoading: false,
};

export default AuthPanel;
