import React from "react";

function FollowupTab({
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
        Apzla shows you who to follow up and gives you a ready message.
        Copy it and send with your own phone via SMS or WhatsApp. No SMS
        cost is handled inside Apzla yet.
      </p>

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

export default FollowupTab;
