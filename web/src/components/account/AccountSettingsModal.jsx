import PropTypes from "prop-types";

function AccountSettingsModal({
  visible,
  churchSettings,
  setChurchSettings,
  accountLoading,
  subscriptionInfo,
  paystackLoading,
  onClose,
  onSaveChurchSettings,
  onStartSubscription,
  planOptions,
  selectedPlanId,
  onSelectPlan,
  selectedPlan,
}) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <p className="modal-pill">Account &amp; Billing</p>
            <h2 style={{ margin: "4px 0", fontSize: "20px" }}>
              Manage church profile and subscription
            </h2>
            <p style={{ margin: 0, color: "#4b5563", fontSize: "13px" }}>
              Update how your church appears and renew your subscription (GHS
              100/month or GHS 1,100/year billed through Paystack).
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#e5e7eb",
              color: "#111827",
              borderRadius: "12px",
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>

        <div className="modal-grid">
          <div className="modal-section">
            <div className="modal-section-header">
              <div>
                <p className="modal-label">Church profile</p>
                <h3 className="modal-title">Basics</h3>
              </div>
              <span className="modal-chip">Editable</span>
            </div>

            <div className="modal-form-grid">
              <label className="modal-field">
                <span>Church name</span>
                <input
                  type="text"
                  value={churchSettings.name}
                  onChange={(e) =>
                    setChurchSettings((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. Grace Chapel International"
                />
              </label>
              <label className="modal-field">
                <span>Address</span>
                <input
                  type="text"
                  value={churchSettings.address}
                  onChange={(e) =>
                    setChurchSettings((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Street address"
                />
              </label>
              <label className="modal-field">
                <span>Country</span>
                <input
                  type="text"
                  value={churchSettings.country}
                  onChange={(e) =>
                    setChurchSettings((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                  placeholder="Country"
                />
              </label>
              <label className="modal-field">
                <span>City</span>
                <input
                  type="text"
                  value={churchSettings.city}
                  onChange={(e) =>
                    setChurchSettings((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  placeholder="City"
                />
              </label>
              <label className="modal-field">
                <span>Phone</span>
                <input
                  type="text"
                  value={churchSettings.phone}
                  onChange={(e) =>
                    setChurchSettings((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="Church phone number"
                />
              </label>
            </div>

            <button
              onClick={onSaveChurchSettings}
              disabled={accountLoading}
              style={{
                background: accountLoading ? "#e5e7eb" : "#111827",
                color: accountLoading ? "#6b7280" : "white",
                border: "none",
                padding: "10px 14px",
                borderRadius: "10px",
                cursor: accountLoading ? "not-allowed" : "pointer",
                fontWeight: 600,
                width: "100%",
                marginTop: "10px",
              }}
            >
              {accountLoading ? "Saving..." : "Save changes"}
            </button>
          </div>

          <div className="modal-section">
            <div className="modal-section-header">
              <div>
                <p className="modal-label">Subscription</p>
                <h3 className="modal-title">Plans</h3>
              </div>
              <span className="modal-chip chip-green">From GHS 100/mo</span>
            </div>

            <div className="subscription-card">
              <div>
                <p className="subscription-status">
                  Status: {subscriptionInfo?.status || "INACTIVE"}
                </p>
                <p className="subscription-meta">
                  Plan: {subscriptionInfo?.plan || selectedPlan?.planLabel || "Monthly (GHS 100)"}
                </p>
                <p className="subscription-meta">
                  {subscriptionInfo?.status === "TRIAL"
                    ? "Trial ends:"
                    : "Next renewal:"}
                  {subscriptionInfo?.expiresAt
                    ? ` ${new Date(subscriptionInfo.expiresAt).toLocaleDateString()}`
                    : subscriptionInfo?.trialEndsAt
                      ? ` ${new Date(subscriptionInfo.trialEndsAt).toLocaleDateString()}`
                      : " Not set"}
                </p>
                {subscriptionInfo?.reference && (
                  <p className="subscription-meta">
                    Reference: {subscriptionInfo.reference}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p
                  style={{
                    margin: "0",
                    color: "#4b5563",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Choose a plan
                </p>
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  }}
                >
                  {planOptions.map((planOption) => {
                    const isSelected = planOption.id === selectedPlanId;
                    return (
                      <button
                        key={planOption.id}
                        type="button"
                        onClick={() => onSelectPlan(planOption.id)}
                        style={{
                          textAlign: "left",
                          border: isSelected ? "2px solid #4338ca" : "1px solid #e5e7eb",
                          background: isSelected ? "#eef2ff" : "#fff",
                          borderRadius: "12px",
                          padding: "10px 12px",
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 10px 26px rgba(15, 23, 42, 0.08)" : "none",
                        }}
                        aria-pressed={isSelected}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#111827" }}>
                            {planOption.label}
                          </span>
                          <span className="modal-chip">{planOption.badgeLabel}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#4b5563" }}>
                          {planOption.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => onStartSubscription(selectedPlanId)}
                disabled={paystackLoading}
                style={{
                  background: paystackLoading ? "#e5e7eb" : "#16a34a",
                  color: paystackLoading ? "#6b7280" : "white",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: paystackLoading ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  width: "100%",
                }}
              >
                {paystackLoading
                  ? "Opening Paystack..."
                  : selectedPlan?.ctaLabel || "Start subscription"}
              </button>
              <p className="subscription-footnote">
                Powered by Paystack. Billing renews on the {selectedPlan?.label?.toLowerCase()} plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

AccountSettingsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  churchSettings: PropTypes.shape({
    name: PropTypes.string,
    address: PropTypes.string,
    country: PropTypes.string,
    city: PropTypes.string,
    phone: PropTypes.string,
  }).isRequired,
  setChurchSettings: PropTypes.func.isRequired,
  accountLoading: PropTypes.bool.isRequired,
  subscriptionInfo: PropTypes.shape({
    status: PropTypes.string,
    plan: PropTypes.string,
    expiresAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    trialEndsAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    reference: PropTypes.string,
  }),
  paystackLoading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaveChurchSettings: PropTypes.func.isRequired,
  onStartSubscription: PropTypes.func.isRequired,
  planOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      planLabel: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
      currency: PropTypes.string.isRequired,
      durationMonths: PropTypes.number.isRequired,
      badgeLabel: PropTypes.string,
      ctaLabel: PropTypes.string,
      description: PropTypes.string,
    })
  ).isRequired,
  selectedPlanId: PropTypes.string.isRequired,
  selectedPlan: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    planLabel: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    currency: PropTypes.string.isRequired,
    durationMonths: PropTypes.number.isRequired,
    badgeLabel: PropTypes.string,
    ctaLabel: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  onSelectPlan: PropTypes.func.isRequired,
};

AccountSettingsModal.defaultProps = {
  subscriptionInfo: null,
};

export default AccountSettingsModal;
