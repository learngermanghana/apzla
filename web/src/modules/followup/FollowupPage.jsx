import React, { useEffect, useMemo, useState } from "react";
import {
  fetchBundles,
  sendBulkSms,
  startTopup,
} from "../../utils/messageApi";

function FollowupPage({
  followupPastorName,
  setFollowupPastorName,
  followupAudience,
  setFollowupAudience,
  isVisitorAudience,
  membersLoading,
  followupTargets,
  formatPhoneForLink,
  followupTemplateEncoded,
  followupEmailSubject,
  followupTemplate,
  followupWhatsappLink,
  followupTelegramLink,
  followupEmailLink,
  showToast,
  churchId,
  smsCredits,
  smsCreditsPerMessage,
  user,
}) {
  const [sendMode, setSendMode] = useState("FREE"); // FREE | BULK
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sendingChannel, setSendingChannel] = useState(null);
  const [bundleId, setBundleId] = useState("");
  const [bundles, setBundles] = useState([]);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [bundleError, setBundleError] = useState("");
  const bulkLimit = 50;

  // --- Derived data ----------------------------------------------------------

  const recipientsWithPhone = useMemo(
    () =>
      followupTargets.filter((member) => {
        const normalized = (member.phone || "").trim();
        return normalized.length > 0;
      }),
    [followupTargets]
  );

  const selectedMembers = useMemo(
    () =>
      recipientsWithPhone.filter((member) =>
        selectedRecipients.includes(member.id)
      ),
    [recipientsWithPhone, selectedRecipients]
  );

  const selectedPhones = useMemo(
    () => selectedMembers.map((member) => member.phone).filter(Boolean),
    [selectedMembers]
  );

  const isBulkMode = sendMode === "BULK";

  // --- Selection helpers -----------------------------------------------------

  const toggleRecipient = (memberId) => {
    setSelectedRecipients((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleAllRecipients = () => {
    if (selectedRecipients.length === recipientsWithPhone.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(recipientsWithPhone.map((m) => m.id));
    }
  };

  // --- Bulk send -------------------------------------------------------------

  const handleBulkSend = async () => {
    if (!churchId) {
      showToast("Church ID missing. Please reload and try again.", "error");
      return;
    }

    if (!user) {
      showToast("Please sign in again to send bulk messages.", "error");
      return;
    }

    if (selectedPhones.length === 0) {
      showToast("Select at least one recipient.", "error");
      return;
    }

    if (selectedPhones.length > bulkLimit) {
      showToast(
        `Bulk send is limited to ${bulkLimit} recipients per request.`,
        "error"
      );
      return;
    }

    const creditsRequired = selectedPhones.length * smsCreditsPerMessage;
    if (smsCredits < creditsRequired) {
      showToast(
        "Not enough SMS credits for all selected recipients.",
        "error"
      );
      return;
    }

    try {
      setSendingChannel("sms");
      const token = await user.getIdToken();
      await sendBulkSms({
        churchId,
        message: followupTemplate,
        recipients: selectedPhones,
        token,
      });
      showToast("Bulk SMS sent.", "success");
      setSelectedRecipients([]);
    } catch (error) {
      showToast(error.message || "Unable to send bulk message.", "error");
    } finally {
      setSendingChannel(null);
    }
  };

  // --- Load bundles when switching to BULK ----------------------------------

  useEffect(() => {
    if (!isBulkMode) return;

    if (!user) {
      setBundles([]);
      setBundleError("Sign in to view SMS bundles.");
      return;
    }

    let isActive = true;

    const loadBundles = async () => {
      try {
        setIsLoadingBundles(true);
        setBundleError("");
        const bundleList = await fetchBundles();
        if (!isActive) return;

        setBundles(bundleList);
        setBundleId(
          (prev) =>
            (prev && bundleList.some((b) => b.id === prev) && prev) ||
            bundleList[0]?.id ||
            ""
        );
      } catch (error) {
        if (!isActive) return;
        setBundles([]);
        setBundleError(error.message || "Unable to load bundles.");
      } finally {
        if (isActive) setIsLoadingBundles(false);
      }
    };

    loadBundles();
    return () => {
      isActive = false;
    };
  }, [isBulkMode, user]);

  // --- Buy credits -----------------------------------------------------------

  const handleBuyCredits = async () => {
    if (!churchId) {
      showToast("Church ID missing. Please reload and try again.", "error");
      return;
    }

    if (!user) {
      showToast("Please sign in again to buy credits.", "error");
      return;
    }

    if (!bundleId) {
      showToast("Select a bundle first.", "error");
      return;
    }

    try {
      setIsPaying(true);
      const paymentWindow = window.open("", "_blank", "noopener,noreferrer");
      const token = await user.getIdToken();
      const authorizationUrl = await startTopup({
        churchId,
        channel: "sms",
        bundleId,
        token,
      });
      if (paymentWindow && !paymentWindow.closed) {
        paymentWindow.location.assign(authorizationUrl);
        paymentWindow.focus?.();
      } else {
        showToast(
          "Popup blocked. Redirecting this tab to the payment page.",
          "info"
        );
        window.location.assign(authorizationUrl);
      }
    } catch (error) {
      showToast(error.message || "Could not start top-up.", "error");
    } finally {
      setIsPaying(false);
    }
  };

  // --- Render ---------------------------------------------------------------

  return (
    <>
      {/* Short description */}
      <p
        style={{
          marginBottom: 12,
          color: "#6b7280",
          fontSize: 13,
        }}
      >
        Choose who to follow up, copy the message, and send via WhatsApp, SMS,
        or email. You can also send directly from Apzla with SMS credits.
      </p>

      {/* Mode toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#111827",
          }}
        >
          Sending mode
        </span>
        {[
          { value: "FREE", label: "Use my phone (Free)" },
          { value: "BULK", label: "Bulk SMS (uses credits)" },
        ].map((mode) => {
          const active = sendMode === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => {
                setSendMode(mode.value);
                setSelectedRecipients([]);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: active ? "1px solid #111827" : "1px solid #d1d5db",
                background: active ? "#111827" : "white",
                color: active ? "white" : "#374151",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Bulk section (only when BULK is active) */}
      {isBulkMode && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            marginBottom: 12,
          }}
        >
          <div
            style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
          >
            Bulk SMS in Apzla
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 4,
            }}
          >
            Uses church SMS credits. Up to {bulkLimit} recipients per send.
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#111827",
              fontWeight: 600,
            }}
          >
            SMS credits: {smsCredits}
          </div>

          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              border: "1px dashed #e5e7eb",
              background: "#f9fafb",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Buy credits
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <select
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                disabled={isLoadingBundles || bundles.length === 0}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                  minWidth: 180,
                }}
              >
                {isLoadingBundles && (
                  <option value="">Loading bundles…</option>
                )}
                {!isLoadingBundles && bundles.length === 0 && (
                  <option value="">No bundles available</option>
                )}
                {bundles.map((bundle) => (
                  <option key={bundle.id} value={bundle.id}>
                    {bundle.name || bundle.label || bundle.id} ·{" "}
                    {bundle.credits} credits · GHS {bundle.priceGhs}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBuyCredits}
                disabled={
                  isPaying ||
                  isLoadingBundles ||
                  !bundleId ||
                  bundles.length === 0
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "white",
                  cursor:
                    isPaying || isLoadingBundles || !bundleId
                      ? "default"
                      : "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  opacity:
                    isPaying || isLoadingBundles || !bundleId ? 0.7 : 1,
                }}
              >
                {isPaying ? "Starting payment…" : "Buy credits"}
              </button>
            </div>
            {bundleError && (
              <div style={{ fontSize: 12, color: "#b91c1c" }}>
                {bundleError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pastor name */}
      <div style={{ marginBottom: 12, maxWidth: 320 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 4,
          }}
        >
          Pastor / sender name (optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Pastor James"
          value={followupPastorName}
          onChange={(e) => setFollowupPastorName(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />
      </div>

      {/* Audience selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#111827",
          }}
        >
          Audience
        </span>
        {["VISITOR", "MEMBER"].map((audience) => {
          const active = followupAudience === audience;
          return (
            <button
              key={audience}
              onClick={() => setFollowupAudience(audience)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: active ? "1px solid #111827" : "1px solid #d1d5db",
                background: active ? "#111827" : "white",
                color: active ? "white" : "#374151",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {audience === "VISITOR" ? "Visitors" : "Members"}
            </button>
          );
        })}
      </div>

      {/* Member list + bulk send button */}
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          {isVisitorAudience
            ? "People you can follow up"
            : "Members you can message"}
        </h2>

        {membersLoading ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading…</p>
        ) : followupTargets.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            Add members in the Members tab to start messaging.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {isBulkMode && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <button
                  onClick={handleBulkSend}
                  disabled={sendingChannel !== null}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #6b7280",
                    background:
                      sendingChannel !== null ? "#f3f4f6" : "white",
                    color: "#111827",
                    cursor:
                      sendingChannel !== null ? "default" : "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {sendingChannel === "sms"
                    ? "Sending SMS…"
                    : "Send SMS to selected"}
                </button>
                <span
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    alignSelf: "center",
                  }}
                >
                  Selected: {selectedPhones.length}
                </span>
              </div>
            )}

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {isBulkMode && (
                    <th style={{ padding: "6px 4px", width: 32 }}>
                      <input
                        type="checkbox"
                        checked={
                          recipientsWithPhone.length > 0 &&
                          selectedRecipients.length ===
                            recipientsWithPhone.length
                        }
                        onChange={toggleAllRecipients}
                      />
                    </th>
                  )}
                  <th style={{ padding: "6px 4px" }}>Name</th>
                  <th style={{ padding: "6px 4px" }}>Phone</th>
                  <th style={{ padding: "6px 4px" }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {followupTargets.map((m) => {
                  const phoneForLink = formatPhoneForLink(m.phone);
                  const whatsappLink = phoneForLink
                    ? `https://wa.me/${phoneForLink}?text=${followupTemplateEncoded}`
                    : `https://wa.me/?text=${followupTemplateEncoded}`;
                  const smsLink = phoneForLink
                    ? `sms:${phoneForLink}?body=${followupTemplateEncoded}`
                    : `sms:?body=${followupTemplateEncoded}`;

                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {isBulkMode && (
                        <td style={{ padding: "6px 4px" }}>
                          <input
                            type="checkbox"
                            disabled={!m.phone}
                            checked={selectedRecipients.includes(m.id)}
                            onChange={() => toggleRecipient(m.id)}
                          />
                        </td>
                      )}
                      <td style={{ padding: "6px 4px" }}>
                        {m.firstName} {m.lastName}
                      </td>
                      <td style={{ padding: "6px 4px" }}>
                        {m.phone || "-"}
                      </td>
                      <td style={{ padding: "6px 4px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid #22c55e",
                              background: "#ecfdf3",
                              color: "#15803d",
                              fontSize: 12,
                              textDecoration: "none",
                            }}
                          >
                            WhatsApp
                          </a>
                          <a
                            href={smsLink}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid #6b7280",
                              background: "#f3f4f6",
                              color: "#111827",
                              fontSize: 12,
                              textDecoration: "none",
                            }}
                          >
                            SMS
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Template + share */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          padding: 12,
          maxWidth: 520,
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#111827",
            }}
          >
            {isVisitorAudience
              ? "Visitor follow-up message"
              : "Member check-in message"}
          </div>
          <button
            onClick={() => {
              if (!navigator.clipboard) {
                showToast(
                  "Clipboard not available. Please copy the text manually.",
                  "error"
                );
                return;
              }
              navigator.clipboard
                .writeText(followupTemplate)
                .then(() =>
                  showToast(
                    "Message copied. Paste it in WhatsApp or your SMS app.",
                    "success"
                  )
                )
                .catch(() =>
                  showToast(
                    "Could not copy automatically. Please select and copy.",
                    "error"
                  )
                );
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "none",
              background: "#111827",
              color: "white",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Copy message
          </button>
        </div>

        <textarea
          readOnly
          value={followupTemplate}
          rows={3}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 13,
            resize: "vertical",
            background: "white",
          }}
        />
        <p
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          Tip: You can export phone numbers from the Members tab and use this
          text in any bulk SMS or WhatsApp tool.
        </p>

        <div
          style={{
            marginTop: 10,
            padding: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "white",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
            }}
          >
            Send to yourself / your team
          </span>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <a
              href={followupWhatsappLink}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #22c55e",
                background: "#ecfdf3",
                color: "#15803d",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              WhatsApp
            </a>
            <a
              href={followupTelegramLink}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #0ea5e9",
                background: "#e0f2fe",
                color: "#0369a1",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Telegram
            </a>
            <a
              href={followupEmailLink}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #6366f1",
                background: "#eef2ff",
                color: "#4338ca",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default FollowupPage;
