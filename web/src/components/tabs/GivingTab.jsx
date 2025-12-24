import React from "react";

function GivingTab({
  userProfile,
  onlineGivingStatusBadge,
  onlineGivingStatusLabel,
  onlineGivingActive,
  onlineGivingPending,
  onlineGivingFailed,
  onlineGivingAppliedAt,
  paystackSubaccountCode,
  handleSubmitOnlineGivingApplication,
  onlineGivingActionLoading,
  editingPayoutDetails,
  setEditingPayoutDetails,
  startEditingPayoutDetails,
  handleResetOnlineGiving,
  showPayoutForm,
  PAYSTACK_BANK_OPTIONS,
  payoutForm,
  setPayoutForm,
  onlineGivingLink,
  onlineGivingQrUrl,
  copyOnlineGivingLink,
  openOnlineGivingLink,
  downloadOnlineGivingQr,
  printOnlineGivingQr,
  givingForm,
  setGivingForm,
  members,
  handleCreateGiving,
  loading,
  givingMemberFilter,
  setGivingMemberFilter,
  givingLoading,
  giving,
  resolveGivingMember,
  givingHasMore,
  loadMoreGiving,
}) {
  return (
    <>
      <p
        style={{
          marginBottom: "16px",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        Track collections, tithes, and special offerings for{" "}
        <strong>{userProfile.churchName}</strong>.
      </p>

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: "0 0 4px",
              }}
            >
              Online giving (Paystack)
            </p>
            <p style={{ margin: 0, color: "#111827", fontWeight: 600 }}>
              Let members pay tithes and offerings online.
            </p>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: onlineGivingStatusBadge.bg,
              color: onlineGivingStatusBadge.color,
              border: `1px solid ${onlineGivingStatusBadge.border}`,
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {onlineGivingStatusLabel}
          </span>
        </div>

        {onlineGivingActive ? (
          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #bbf7d0",
              background: "#ecfdf3",
              color: "#166534",
            }}
          >
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
              Online giving is active.
            </p>
            <p style={{ margin: "0 0 6px" }}>
              Paystack payments will settle to subaccount
              <strong> {paystackSubaccountCode || "(missing code)"}</strong>.
            </p>
          </div>
        ) : onlineGivingPending ? (
          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #fef08a",
              background: "#fefce8",
              color: "#854d0e",
            }}
          >
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
              Creating your Paystack subaccount...
            </p>
            <p style={{ margin: "0 0 8px" }}>
              We’re sending your payout details to Paystack. This usually takes a few
              seconds.
            </p>
            {onlineGivingAppliedAt && (
              <p style={{ margin: 0, fontSize: "13px" }}>
                Requested on {new Date(onlineGivingAppliedAt).toLocaleString()}.
              </p>
            )}
          </div>
        ) : onlineGivingFailed ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #fecdd3",
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: "14px",
            }}
          >
            We couldn’t create the Paystack subaccount. Double-check the payout details and try
            again.
          </div>
        ) : null}

        {(onlineGivingFailed || onlineGivingActive || onlineGivingPending) && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {onlineGivingFailed && (
              <button
                type="button"
                onClick={handleSubmitOnlineGivingApplication}
                disabled={onlineGivingActionLoading}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #dc2626",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontWeight: 700,
                  cursor: onlineGivingActionLoading ? "not-allowed" : "pointer",
                }}
              >
                {onlineGivingActionLoading ? "Retrying..." : "Try again"}
              </button>
            )}
            {(onlineGivingActive || onlineGivingFailed || onlineGivingPending) && (
              <button
                type="button"
                onClick={() =>
                  editingPayoutDetails ? setEditingPayoutDetails(false) : startEditingPayoutDetails()
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #111827",
                  background: "white",
                  color: "#111827",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {editingPayoutDetails ? "Hide edit form" : "Edit payout details"}
              </button>
            )}
            <button
              type="button"
              onClick={handleResetOnlineGiving}
              disabled={onlineGivingActionLoading}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "#f3f4f6",
                color: "#111827",
                fontWeight: 700,
                cursor: onlineGivingActionLoading ? "not-allowed" : "pointer",
              }}
            >
              {onlineGivingActionLoading ? "Working..." : "Delete payout account"}
            </button>
          </div>
        )}

        {showPayoutForm && (
          <>
            <p style={{ margin: "12px 0 4px", color: "#374151" }}>
              {onlineGivingActive || onlineGivingPending || onlineGivingFailed
                ? "Update the payout details to refresh the Paystack subaccount."
                : "Add payout details to auto-create a Paystack subaccount."}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitOnlineGivingApplication();
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", color: "#374151" }}>Bank / MoMo type</span>
                <input
                  type="text"
                  list="paystack-bank-codes"
                  value={payoutForm.bankType}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      bankType: e.target.value,
                    }))
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                  }}
                  placeholder="e.g. MTN, VOD, CAL"
                />
                <datalist id="paystack-bank-codes">
                  {PAYSTACK_BANK_OPTIONS.map((bank) => (
                    <option
                      key={bank.code}
                      value={bank.code}
                      label={`${bank.name} (${bank.code})`}
                    >{`${bank.name} (${bank.code})`}</option>
                  ))}
                </datalist>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  Select the exact Paystack bank or mobile money code from this list. If your bank
                  isn&apos;t listed, enter the code from Paystack&apos;s bank directory so
                  settlements don&apos;t fail.
                </span>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", color: "#374151" }}>Account name</span>
                <input
                  type="text"
                  value={payoutForm.accountName}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      accountName: e.target.value,
                    }))
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", color: "#374151" }}>Account number / phone</span>
                <input
                  type="text"
                  value={payoutForm.accountNumber}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", color: "#374151" }}>
                  Branch / MoMo network (optional)
                </span>
                <input
                  type="text"
                  value={payoutForm.network}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      network: e.target.value,
                    }))
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                  }}
                />
              </label>

              <label
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "#374151",
                }}
              >
                <input
                  type="checkbox"
                  checked={payoutForm.confirmDetails}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      confirmDetails: e.target.checked,
                    }))
                  }
                />
                <span>I confirm these are the correct details for settlements.</span>
              </label>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  type="submit"
                  disabled={onlineGivingActionLoading}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "white",
                    fontWeight: 700,
                    cursor: onlineGivingActionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {onlineGivingActionLoading
                    ? "Submitting..."
                    : onlineGivingPending
                      ? "Creating Paystack subaccount..."
                      : onlineGivingActive
                        ? "Update payout details"
                        : "Save payout details"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1 1 260px", minWidth: "0" }}>
          <p
            style={{
              fontSize: "12px",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              margin: "0 0 6px",
            }}
          >
            Online giving link
          </p>
          {onlineGivingLink ? (
            <div
              style={{
                wordBreak: "break-all",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              {onlineGivingLink}
            </div>
          ) : (
            <p style={{ color: "#9ca3af", margin: "0 0 8px" }}>
              Link will appear after a church is linked.
            </p>
          )}
          <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 10px" }}>
            {onlineGivingActive
              ? "Share this permanent link on WhatsApp, flyers, projector slides, or your website so members can give online."
              : "Link activates once the Paystack subaccount is ready. You can still share it ahead of time."}
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={copyOnlineGivingLink}
              disabled={!onlineGivingLink}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: onlineGivingLink ? "#111827" : "#f3f4f6",
                color: onlineGivingLink ? "white" : "#9ca3af",
                cursor: onlineGivingLink ? "pointer" : "default",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={openOnlineGivingLink}
              disabled={!onlineGivingLink}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white",
                color: onlineGivingLink ? "#111827" : "#9ca3af",
                cursor: onlineGivingLink ? "pointer" : "default",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open link
            </button>
            <button
              type="button"
              onClick={downloadOnlineGivingQr}
              disabled={!onlineGivingQrUrl}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white",
                color: onlineGivingQrUrl ? "#111827" : "#9ca3af",
                cursor: onlineGivingQrUrl ? "pointer" : "default",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Download QR
            </button>
            <button
              type="button"
              onClick={printOnlineGivingQr}
              disabled={!onlineGivingQrUrl}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white",
                color: onlineGivingQrUrl ? "#111827" : "#9ca3af",
                cursor: onlineGivingQrUrl ? "pointer" : "default",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Print QR
            </button>
          </div>
        </div>

        {onlineGivingQrUrl && (
          <div
            style={{
              width: "200px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <a
              href={onlineGivingLink}
              target="_blank"
              rel="noreferrer"
              aria-label="Open online giving link"
              style={{ width: "100%" }}
            >
              <img
                src={onlineGivingQrUrl}
                alt="Online giving QR code"
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "contain",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  background: "#f9fafb",
                  padding: "8px",
                  boxShadow: "0 0 0 2px transparent",
                  transition: "box-shadow 120ms ease, transform 120ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 2px #11182720";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 2px transparent";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              />
            </a>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
              Members can scan to give online
            </p>
          </div>
        )}
      </div>

      {/* Giving form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
          marginBottom: "12px",
          maxWidth: "620px",
        }}
      >
        <input
          type="date"
          value={givingForm.date}
          onChange={(e) => setGivingForm((f) => ({ ...f, date: e.target.value }))}
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          placeholder="Service type (e.g. Sunday Service)"
          value={givingForm.serviceType}
          onChange={(e) =>
            setGivingForm((f) => ({
              ...f,
              serviceType: e.target.value,
            }))
          }
          style={{
            gridColumn: "span 2",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />

        <select
          value={givingForm.memberId}
          onChange={(e) => setGivingForm((f) => ({ ...f, memberId: e.target.value }))}
          style={{
            gridColumn: "span 3",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        >
          <option value="">Record against a member (optional)</option>
          {members.map((m) => {
            const fullName = `${m.firstName || ""} ${m.lastName || ""}`.trim().replace(/\s+/g, " ");
            return (
              <option key={m.id} value={m.id}>
                {fullName || "Unnamed member"}
              </option>
            );
          })}
        </select>

        <select
          value={givingForm.type}
          onChange={(e) => setGivingForm((f) => ({ ...f, type: e.target.value }))}
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        >
          <option value="Offering">Offering</option>
          <option value="Tithe">Tithe</option>
          <option value="Special">Special</option>
        </select>

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
          value={givingForm.amount}
          onChange={(e) =>
            setGivingForm((f) => ({
              ...f,
              amount: e.target.value,
            }))
          }
          style={{
            gridColumn: "span 2",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />

        <textarea
          placeholder="Notes (e.g. project giving, special guest, currency)"
          value={givingForm.notes}
          onChange={(e) =>
            setGivingForm((f) => ({
              ...f,
              notes: e.target.value,
            }))
          }
          rows={2}
          style={{
            gridColumn: "span 3",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
            resize: "vertical",
          }}
        />
      </div>

      <button
        onClick={handleCreateGiving}
        disabled={loading}
        style={{
          padding: "8px 14px",
          borderRadius: "8px",
          border: "none",
          background: loading ? "#6b7280" : "#111827",
          color: "white",
          cursor: loading ? "default" : "pointer",
          fontSize: "14px",
          fontWeight: 500,
          marginBottom: "16px",
        }}
      >
        {loading ? "Saving..." : "Save giving record"}
      </button>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Giving records
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="giving-member-filter" style={{ fontSize: "12px", color: "#6b7280" }}>
              Filter by member
            </label>
            <select
              id="giving-member-filter"
              value={givingMemberFilter}
              onChange={(e) => setGivingMemberFilter(e.target.value)}
              style={{
                minWidth: "240px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "13px",
              }}
            >
              <option value="">All giving records</option>
              {members.map((m) => {
                const fullName = `${m.firstName || ""} ${m.lastName || ""}`.trim().replace(/\s+/g, " ");
                return (
                  <option key={m.id} value={m.id}>
                    {fullName || "Unnamed member"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {givingLoading ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Loading giving records…</p>
        ) : giving.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            No giving records yet. Save your first one above.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <th style={{ padding: "6px 4px" }}>Date</th>
                  <th style={{ padding: "6px 4px" }}>Service</th>
                  <th style={{ padding: "6px 4px" }}>Type</th>
                  <th style={{ padding: "6px 4px" }}>Member</th>
                  <th style={{ padding: "6px 4px" }}>Amount</th>
                  <th style={{ padding: "6px 4px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {giving.map((g) => (
                  <tr
                    key={g.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <td style={{ padding: "6px 4px" }}>{g.date}</td>
                    <td style={{ padding: "6px 4px" }}>{g.serviceType}</td>
                    <td style={{ padding: "6px 4px" }}>{g.type}</td>
                    <td style={{ padding: "6px 4px" }}>{resolveGivingMember(g)}</td>
                    <td style={{ padding: "6px 4px" }}>{g.amount?.toLocaleString?.() ?? g.amount}</td>
                    <td style={{ padding: "6px 4px" }}>{g.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {givingHasMore && giving.length > 0 && (
          <button
            onClick={loadMoreGiving}
            disabled={givingLoading}
            style={{
              marginTop: "12px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              background: givingLoading ? "#f3f4f6" : "white",
              color: "#111827",
              cursor: givingLoading ? "default" : "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {givingLoading ? "Loading..." : "Load more giving records"}
          </button>
        )}
      </div>
    </>
  );
}

export default GivingTab;
