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
  const [sendMode, setSendMode] = useState("FREE");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sendingChannel, setSendingChannel] = useState(null);
  const [bundleId, setBundleId] = useState("sms-100");
  const [bundles, setBundles] = useState([]);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [bundleError, setBundleError] = useState("");
  const bulkLimit = 50;

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
      return;
    }
    setSelectedRecipients(recipientsWithPhone.map((member) => member.id));
  };

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
      showToast("Select at least one recipient with a phone number.", "error");
      return;
    }

    if (selectedPhones.length > bulkLimit) {
      showToast(
        `Bulk send is limited to ${bulkLimit} recipients per request.`,
        "error"
      );
      return;
    }

    const availableCredits = smsCredits;
    const creditsPerMessage = smsCreditsPerMessage;
    const creditsRequired = selectedPhones.length * creditsPerMessage;
    if (availableCredits < creditsRequired) {
      showToast("Not enough credits to send to all selected recipients.", "error");
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
      showToast("Bulk message sent successfully.", "success");
      setSelectedRecipients([]);
    } catch (error) {
      showToast(error.message || "Unable to send bulk message.", "error");
    } finally {
      setSendingChannel(null);
    }
  };

  useEffect(() => {
    if (sendMode !== "BULK") {
      return undefined;
    }

    if (!user) {
      setBundles([]);
      setBundleError("Sign in to view bundles.");
      return undefined;
    }

    let isActive = true;

    const loadBundles = async () => {
      try {
        setIsLoadingBundles(true);
        setBundleError("");
        const token = await user.getIdToken();
        const bundleList = await fetchBundles({ token });
        if (!isActive) return;
        setBundles(bundleList);
        setBundleId((prev) =>
          bundleList.some((bundle) => bundle.id === prev)
            ? prev
            : bundleList[0]?.id || ""
        );
      } catch (error) {
        if (!isActive) return;
        setBundles([]);
        setBundleError(error.message || "Unable to load bundles.");
      } finally {
        if (isActive) {
          setIsLoadingBundles(false);
        }
      }
    };

    loadBundles();

    return () => {
      isActive = false;
    };
  }, [sendMode, user]);

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
      showToast("Select a bundle to continue.", "error");
      return;
    }

    const paymentWindow = window.open("", "_blank", "noopener,noreferrer");

    try {
      setIsPaying(true);
      const token = await user.getIdToken();
      const url = await startTopup({
        churchId,
        channel: "sms",
        bundleId,
        token,
      });
      if (paymentWindow) {
        paymentWindow.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (error) {
      if (paymentWindow) {
        paymentWindow.close();
      }
      showToast(error.message || "Could not start top-up.", "error");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <>
      <p
        style={{
          marginBottom: "16px",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        Apzla shows you who to follow up and gives you a ready message.
        Copy it and send with your own phone via SMS or WhatsApp. No SMS
        cost is handled inside Apzla yet.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#111827",
          }}
        >
          Mode
        </span>
        {[
          { value: "FREE", label: "Send with my phone (Free)" },
          { value: "BULK", label: "Bulk send inside Apzla (Uses credits)" },
        ].map((mode) => {
          const isActive = sendMode === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => {
                setSendMode(mode.value);
                setSelectedRecipients([]);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "20px",
                border: isActive ? "1px solid #111827" : "1px solid #d1d5db",
                background: isActive ? "#111827" : "white",
                color: isActive ? "white" : "#374151",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      {sendMode === "BULK" && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            background: "white",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
            Bulk send inside Apzla
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Uses church credits. Bulk sends are limited to {bulkLimit} recipients
            per request.
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "8px",
              fontSize: "12px",
              color: "#111827",
              fontWeight: 600,
            }}
          >
            <span>SMS credits: {smsCredits}</span>
          </div>
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px dashed #e5e7eb",
              background: "#f9fafb",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Buy credits
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                Bundle
                <select
                  value={bundleId}
                  onChange={(event) => setBundleId(event.target.value)}
                  disabled={isLoadingBundles || bundles.length === 0}
                  style={{
                    marginLeft: "6px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "12px",
                    minWidth: "160px",
                  }}
                >
                  {isLoadingBundles && (
                    <option value="">Loading bundles...</option>
                  )}
                  {!isLoadingBundles && bundles.length === 0 && (
                    <option value="">No bundles available</option>
                  )}
                  {bundles.map((bundle) => (
                    <option key={bundle.id} value={bundle.id}>
                      {bundle.name || bundle.label || bundle.id} · {bundle.credits}{" "}
                      credits · GHS {bundle.priceGhs}
                    </option>
                  ))}
                </select>
              </label>
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
                  borderRadius: "8px",
                  border: "1px solid #111827",
                  background: isPaying ? "#111827" : "#111827",
                  color: "white",
                  cursor:
                    isPaying || isLoadingBundles || !bundleId
                      ? "default"
                      : "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  opacity:
                    isPaying || isLoadingBundles || !bundleId ? 0.7 : 1,
                }}
              >
                {isPaying ? "Starting payment..." : "Buy credits"}
              </button>
            </div>
            {bundleError && (
              <div style={{ fontSize: "12px", color: "#b91c1c" }}>
                {bundleError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pastor name for signature */}
      <div
        style={{
          marginBottom: "16px",
          maxWidth: "320px",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "4px",
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
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#111827",
          }}
        >
          Choose audience
        </span>
        {["VISITOR", "MEMBER"].map((audience) => {
          const isActive = followupAudience === audience;
          return (
            <button
              key={audience}
              onClick={() => setFollowupAudience(audience)}
              style={{
                padding: "6px 10px",
                borderRadius: "20px",
                border: isActive ? "1px solid #111827" : "1px solid #d1d5db",
                background: isActive ? "#111827" : "white",
                color: isActive ? "white" : "#374151",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {audience === "VISITOR" ? "Visitors" : "Members"}
            </button>
          );
        })}
      </div>

      {/* Audience list */}
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "6px",
          }}
        >
          {isVisitorAudience
            ? "Visitors in your members list"
            : "Members you can message"}
        </h2>
        <p
          style={{
            marginBottom: "8px",
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          {isVisitorAudience ? (
            <>
              These are members with status <strong>VISITOR</strong>. Later,
              you can add per-service attendance so this shows
              <em> “visitors this Sunday.”</em>
            </>
          ) : (
            <>Send a quick note of appreciation or care to any member.</>
          )}
        </p>

        {membersLoading ? (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Loading members…
          </p>
        ) : followupTargets.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            {isVisitorAudience
              ? "No visitors found yet. Add members with status “Visitor” in the Members tab."
              : "No members found yet. Add members in the Members tab to start messaging."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {sendMode === "BULK" && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                <button
                  onClick={handleBulkSend}
                  disabled={sendingChannel !== null}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid #6b7280",
                    background:
                      sendingChannel !== null ? "#f3f4f6" : "white",
                    color: "#111827",
                    cursor: sendingChannel !== null ? "default" : "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {sendingChannel === "sms"
                    ? "Sending SMS..."
                    : "Send SMS to selected"}
                </button>
                <span
                  style={{
                    fontSize: "12px",
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
                  {sendMode === "BULK" && (
                    <th style={{ padding: "6px 4px", width: "32px" }}>
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
                  <th style={{ padding: "6px 4px" }}>Email</th>
                  <th style={{ padding: "6px 4px" }}>Message options</th>
                </tr>
              </thead>
              <tbody>
                {followupTargets.map((m) => {
                  const phoneForLink = formatPhoneForLink(m.phone);
                  const whatsappLink = phoneForLink
                    ? `https://wa.me/${phoneForLink}?text=${followupTemplateEncoded}`
                    : `https://wa.me/?text=${followupTemplateEncoded}`;
                  const telegramLink = `https://t.me/share/url?text=${followupTemplateEncoded}`;
                  const smsLink = phoneForLink
                    ? `sms:${phoneForLink}?body=${followupTemplateEncoded}`
                    : `sms:?body=${followupTemplateEncoded}`;
                  const emailLink = `mailto:${m.email || ""}?subject=${followupEmailSubject}&body=${followupTemplateEncoded}`;

                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {sendMode === "BULK" && (
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
                      <td style={{ padding: "6px 4px" }}>{m.phone || "-"}</td>
                      <td style={{ padding: "6px 4px" }}>{m.email || "-"}</td>
                      <td style={{ padding: "6px 4px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid #22c55e",
                              background: "#ecfdf3",
                              color: "#15803d",
                              fontSize: "12px",
                              textDecoration: "none",
                            }}
                          >
                            WhatsApp
                          </a>
                          <a
                            href={telegramLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid #0ea5e9",
                              background: "#e0f2fe",
                              color: "#0369a1",
                              fontSize: "12px",
                              textDecoration: "none",
                            }}
                          >
                            Telegram
                          </a>
                          <a
                            href={smsLink}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid #6b7280",
                              background: "#f3f4f6",
                              color: "#111827",
                              fontSize: "12px",
                              textDecoration: "none",
                            }}
                          >
                            SMS
                          </a>
                          <a
                            href={emailLink}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid #6366f1",
                              background: "#eef2ff",
                              color: "#4338ca",
                              fontSize: "12px",
                              textDecoration: "none",
                            }}
                          >
                            Email
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

      {/* Template area */}
      <div
        style={{
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          padding: "12px 14px",
          maxWidth: "520px",
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#111827",
            }}
          >
            {isVisitorAudience
              ? "Visitor thank-you message"
              : "Member check-in message"}
          </div>
          <button
            onClick={() => {
              if (!navigator.clipboard) {
                showToast(
                  "Clipboard not available. You can select and copy the text manually.",
                  "error"
                );
                return;
              }
              navigator.clipboard
                .writeText(followupTemplate)
                .then(() =>
                  showToast(
                    "Message copied. Paste it into WhatsApp or your SMS app.",
                    "success"
                  )
                )
                .catch(() =>
                  showToast(
                    "Could not copy automatically. Please select and copy the text.",
                    "error"
                  )
                );
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "none",
              background: "#111827",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
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
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "13px",
            resize: "vertical",
            background: "white",
          }}
        />
        <p
          style={{
            marginTop: "6px",
            fontSize: "12px",
            color: "#6b7280",
          }}
        >
          {isVisitorAudience
            ? "Tip: You can also export phone numbers from the Members tab and use this text in any bulk SMS or WhatsApp broadcast tool."
            : "Tip: Export phone numbers from the Members tab to send this to your whole congregation via bulk SMS or WhatsApp."}
        </p>

        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            background: "white",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Share this message
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Send it to yourself or your team chat.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <a
              href={followupWhatsappLink}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #22c55e",
                background: "#ecfdf3",
                color: "#15803d",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              WhatsApp message
            </a>
            <a
              href={followupTelegramLink}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #0ea5e9",
                background: "#e0f2fe",
                color: "#0369a1",
                fontSize: "12px",
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
                borderRadius: "8px",
                border: "1px solid #6366f1",
                background: "#eef2ff",
                color: "#4338ca",
                fontSize: "12px",
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
