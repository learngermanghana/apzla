import React from "react";

function CheckinTab({
  memberAttendanceForm,
  setMemberAttendanceForm,
  memberAttendanceLoading,
  hasCheckinSearch,
  checkinSearchResults,
  memberAttendance,
  handleCheckInMember,
  loading,
  issueMemberCheckinLink,
  memberLinkLoadingId,
  members,
  memberCheckinLink,
  buildShareLinks,
  copyMemberCheckinLink,
  setShowCheckinIssuer,
  showCheckinIssuer,
  issueCheckinToken,
  checkinTokenForm,
  setCheckinTokenForm,
  checkinTokenError,
  checkinServiceCode,
  copyServiceCode,
  checkinTokenLoading,
  checkinTokenLink,
  checkinTokenQr,
  downloadCheckinQrImage,
  printCheckinQrImage,
  manualShareLinks,
  copyCheckinLink,
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
        Quick admin/usher check-in. Search a member and mark them present for the selected
        service.
      </p>

      {/* Service info */}
      <div
        className="service-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "8px",
          marginBottom: "12px",
          maxWidth: "620px",
        }}
      >
        <input
          type="date"
          value={memberAttendanceForm.date}
          onChange={(e) =>
            setMemberAttendanceForm((f) => ({
              ...f,
              date: e.target.value,
            }))
          }
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
          value={memberAttendanceForm.serviceType}
          onChange={(e) =>
            setMemberAttendanceForm((f) => ({
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
      </div>

      {/* Search + mark present */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "760px",
        }}
      >
        <input
          type="text"
          placeholder="Search member by name or phone"
          value={memberAttendanceForm.search}
          onChange={(e) =>
            setMemberAttendanceForm((f) => ({
              ...f,
              search: e.target.value,
            }))
          }
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />

        {memberAttendanceLoading ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Loading check-ins…</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {hasCheckinSearch &&
                checkinSearchResults.map((m) => {
                  const isPresent = memberAttendance.some((a) => a.memberId === m.id);
                  return (
                    <div
                      key={m.id}
                      className="checkin-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#111827",
                            }}
                          >
                            {m.firstName} {m.lastName}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                            }}
                          >
                            {m.phone || "No phone"}
                          </div>
                          {m.email && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#4b5563",
                              }}
                            >
                              {m.email}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          {isPresent ? (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#16a34a",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              ✅ Present
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCheckInMember(m.id)}
                              disabled={loading}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "10px",
                                border: "none",
                                background: loading ? "#9ca3af" : "#111827",
                                color: "white",
                                cursor: loading ? "default" : "pointer",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              Mark present
                            </button>
                          )}
                          <button
                            onClick={() => issueMemberCheckinLink(m)}
                            disabled={memberLinkLoadingId === m.id}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "10px",
                              border: "1px solid #d1d5db",
                              background:
                                memberLinkLoadingId === m.id ? "#e5e7eb" : "#ffffff",
                              color: "#111827",
                              cursor: memberLinkLoadingId === m.id ? "default" : "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                            title="Create a self check-in link to share"
                          >
                            {memberLinkLoadingId === m.id ? "Preparing…" : "Get check-in link"}
                          </button>
                        </div>
                      </div>

                      {memberCheckinLink.memberId === m.id &&
                        memberCheckinLink.link &&
                        (() => {
                          const nameParts = `${m.firstName || ""} ${m.lastName || ""}`.trim();
                          const memberName = nameParts || m.fullName || m.displayName;
                          const memberShareLinks = buildShareLinks(memberCheckinLink.link, {
                            serviceType: memberAttendanceForm.serviceType,
                            serviceDate: memberAttendanceForm.date,
                            memberName,
                            serviceCode: memberCheckinLink.serviceCode,
                          });

                          return (
                            <div className="checkin-link-box" style={{ marginTop: "4px" }}>
                              <div>
                                <div className="checkin-link-label">
                                  {memberAttendanceForm.serviceType || "Service"} •{" "}
                                  {memberAttendanceForm.date}
                                </div>
                                <div className="checkin-link-value">
                                  {memberCheckinLink.link}
                                </div>
                                {memberCheckinLink.serviceCode && (
                                  <div className="checkin-link-label">
                                    Service code: {memberCheckinLink.serviceCode}
                                  </div>
                                )}
                              </div>
                              <div className="checkin-link-actions">
                                <button
                                  type="button"
                                  onClick={() => copyMemberCheckinLink(memberCheckinLink.link)}
                                >
                                  Copy
                                </button>
                                {memberShareLinks && (
                                  <>
                                    <a
                                      href={memberShareLinks.whatsapp}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="checkin-link-open"
                                    >
                                      WhatsApp
                                    </a>
                                    <a
                                      href={memberShareLinks.telegram}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="checkin-link-open"
                                    >
                                      Telegram
                                    </a>
                                    <a href={memberShareLinks.email} className="checkin-link-open">
                                      Email
                                    </a>
                                  </>
                                )}
                                <a
                                  href={memberCheckinLink.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="checkin-link-open"
                                  style={{
                                    border: "1px solid #d1d5db",
                                    background: "#f8fafc",
                                    color: "#111827",
                                    borderRadius: "10px",
                                    padding: "8px 10px",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    display: "inline-block",
                                  }}
                                >
                                  Open
                                </a>
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                  );
                })}

              {members.length === 0 && (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No members yet. Add members in the CRM tab to start check-ins.
                </p>
              )}

              {members.length > 0 && !hasCheckinSearch && (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  Search by name or phone to find a member.
                </p>
              )}

              {hasCheckinSearch && members.length > 0 && checkinSearchResults.length === 0 && (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No members match that search.
                </p>
              )}
            </div>

            <div className="checkin-admin-card">
              <div className="checkin-admin-header">
                <div>
                  <div className="checkin-admin-title">Issue self check-in link</div>
                  <p className="checkin-admin-subtitle">
                    Create one shared link for a service. Members will enter their phone number
                    and the announced 6-digit service code to confirm attendance. Details are
                    saved locally for quick re-issuing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckinIssuer((open) => !open)}
                  className="checkin-admin-toggle"
                >
                  {showCheckinIssuer ? "Hide" : "Open"}
                </button>
              </div>

              {showCheckinIssuer && (
                <form onSubmit={issueCheckinToken} className="checkin-admin-form" autoComplete="off">
                  <div className="checkin-admin-grid">
                    <label className="checkin-admin-field">
                      <span>Church ID*</span>
                      <input
                        type="text"
                        value={checkinTokenForm.churchId}
                        onChange={(e) =>
                          setCheckinTokenForm((prev) => ({
                            ...prev,
                            churchId: e.target.value,
                          }))
                        }
                        placeholder="e.g. church document ID"
                      />
                    </label>

                    <label className="checkin-admin-field">
                      <span>Service date*</span>
                      <input
                        type="date"
                        value={checkinTokenForm.serviceDate}
                        onChange={(e) =>
                          setCheckinTokenForm((prev) => ({
                            ...prev,
                            serviceDate: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="checkin-admin-field">
                      <span>Service type (optional)</span>
                      <input
                        type="text"
                        value={checkinTokenForm.serviceType}
                        onChange={(e) =>
                          setCheckinTokenForm((prev) => ({
                            ...prev,
                            serviceType: e.target.value,
                          }))
                        }
                        placeholder="Sunday Service, Midweek, etc."
                      />
                    </label>

                    <label className="checkin-admin-field">
                      <span>Base URL*</span>
                      <input
                        type="text"
                        value={checkinTokenForm.baseUrl}
                        onChange={(e) =>
                          setCheckinTokenForm((prev) => ({
                            ...prev,
                            baseUrl: e.target.value,
                          }))
                        }
                        placeholder="https://app.example.com"
                      />
                    </label>
                  </div>

                  {checkinTokenError && (
                    <div className="checkin-admin-error">{checkinTokenError}</div>
                  )}

                  {checkinServiceCode && (
                    <div className="checkin-service-code-box">
                      <div className="checkin-service-code-title">
                        Announce this 6-digit code for the service
                      </div>
                      <div className="checkin-service-code-value">{checkinServiceCode}</div>
                      <div className="checkin-service-code-note">
                        Share this code with members along with the link. They must enter their
                        phone number and this code to check in.
                      </div>
                      <div className="checkin-service-code-actions">
                        <button type="button" onClick={copyServiceCode}>
                          Copy code
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="checkin-admin-actions">
                    <div className="checkin-admin-note">
                      Fields are stored locally so you can quickly issue multiple links.
                    </div>
                    <button type="submit" className="checkin-admin-submit" disabled={checkinTokenLoading}>
                      {checkinTokenLoading ? "Issuing…" : "Generate check-in link"}
                    </button>
                  </div>

                  {checkinTokenLink && (
                    <div className="checkin-link-box">
                      <div>
                        <div className="checkin-link-label">Issued link</div>
                        <div className="checkin-link-value">{checkinTokenLink}</div>
                        {checkinServiceCode && (
                          <div className="checkin-link-label">
                            Service code to announce: {checkinServiceCode}
                          </div>
                        )}
                        {checkinTokenQr && (
                          <div className="checkin-link-qr">
                            <div className="checkin-link-label">QR code</div>
                            <a
                              href={checkinTokenLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ textDecoration: "none" }}
                              aria-label="Open issued check-in link"
                            >
                              <img
                                src={checkinTokenQr}
                                alt="Check-in QR code"
                                style={{
                                  marginTop: "8px",
                                  width: "140px",
                                  height: "140px",
                                  objectFit: "contain",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  background: "#fff",
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
                            <div className="checkin-link-qr-actions">
                              <button type="button" onClick={downloadCheckinQrImage}>
                                Download QR image
                              </button>
                              <button type="button" onClick={printCheckinQrImage}>
                                Print QR
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="checkin-link-actions">
                        <button type="button" onClick={copyCheckinLink}>
                          Copy
                        </button>
                        {manualShareLinks && (
                          <>
                            <a
                              href={manualShareLinks.whatsapp}
                              target="_blank"
                              rel="noreferrer"
                              className="checkin-link-open"
                            >
                              WhatsApp
                            </a>
                            <a
                              href={manualShareLinks.telegram}
                              target="_blank"
                              rel="noreferrer"
                              className="checkin-link-open"
                            >
                              Telegram
                            </a>
                            <a href={manualShareLinks.email} className="checkin-link-open">
                              Email
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default CheckinTab;
