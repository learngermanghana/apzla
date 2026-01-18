import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase";
import { sendBulkSms } from "../../utils/messageApi";
import { normalizePhone } from "../../utils/phone";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBanner from "../../components/StatusBanner";
import "./bulkSms.css";

const CHAR_LIMIT = 160;

const formatCurrency = (value, currency = "GHS") => {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${value} ${currency}`.trim();
  return `${currency} ${numeric.toFixed(2)}`;
};

const toTitle = (value) =>
  value
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildRatesList = (data) => {
  if (!data) return [];

  const candidate =
    data.rates || data.smsRates || data.prices || data.rateCards || data;

  if (Array.isArray(candidate)) {
    return candidate.map((entry, index) => {
      if (entry && typeof entry === "object") {
        const label =
          entry.label ||
          entry.name ||
          entry.destination ||
          entry.region ||
          `Rate ${index + 1}`;
        const price =
          entry.price ??
          entry.charge ??
          entry.cost ??
          entry.rate ??
          entry.amount ??
          "";
        return {
          label: toTitle(label),
          price,
          currency: entry.currency || data.currency || "GHS",
          description: entry.description || entry.note || "",
        };
      }
      return {
        label: `Rate ${index + 1}`,
        price: entry,
        currency: data.currency || "GHS",
        description: "",
      };
    });
  }

  if (candidate && typeof candidate === "object") {
    return Object.entries(candidate)
      .filter(([, value]) =>
        ["number", "string"].includes(typeof value)
      )
      .map(([key, value]) => ({
        label: toTitle(key),
        price: value,
        currency: data.currency || "GHS",
        description: "",
      }));
  }

  return [];
};

export default function BulkSmsPage({
  members,
  userProfile,
  churchPlan,
  smsCreditsPerMessage,
  showToast,
}) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState({ tone: "info", message: "" });
  const [sending, setSending] = useState(false);
  const [hubtelRates, setHubtelRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");

  useEffect(() => {
    let isActive = true;

    const fetchRates = async () => {
      setRatesLoading(true);
      setRatesError("");
      try {
        const ratesRef = doc(db, "config", "hubtelRates");
        const snapshot = await getDoc(ratesRef);
        if (!isActive) return;
        if (snapshot.exists()) {
          setHubtelRates({ id: snapshot.id, ...snapshot.data() });
        } else {
          setHubtelRates(null);
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Load Hubtel rates error:", err);
        setRatesError(err.message || "Unable to load Hubtel rates.");
      } finally {
        if (isActive) setRatesLoading(false);
      }
    };

    fetchRates();

    return () => {
      isActive = false;
    };
  }, []);

  const recipientStats = useMemo(() => {
    const unique = new Map();
    let missingPhone = 0;

    (members || []).forEach((member) => {
      const rawPhone = member?.phone || "";
      const normalized = normalizePhone(rawPhone) || rawPhone.trim();
      if (!normalized) {
        missingPhone += 1;
        return;
      }
      if (!unique.has(normalized)) {
        unique.set(normalized, {
          id: member.id,
          name: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          phone: normalized,
        });
      }
    });

    return {
      recipients: Array.from(unique.values()),
      missingPhone,
      totalMembers: members?.length || 0,
    };
  }, [members]);

  const recipients = recipientStats.recipients;
  const sampleRecipients = recipients.slice(0, 6);
  const totalRecipients = recipients.length;
  const segmentCount = message
    ? Math.max(1, Math.ceil(message.length / CHAR_LIMIT))
    : 0;
  const creditsRequired = totalRecipients * segmentCount * smsCreditsPerMessage;
  const availableCredits = Number(churchPlan?.smsCredits ?? 0);
  const creditsShortfall =
    availableCredits && creditsRequired
      ? creditsRequired - availableCredits
      : 0;
  const insufficientCredits = creditsRequired > 0 && creditsShortfall > 0;

  const ratesList = useMemo(() => buildRatesList(hubtelRates), [hubtelRates]);
  const ratesUpdatedAt =
    hubtelRates?.updatedAt || hubtelRates?.lastUpdated || "";

  const handleSend = async () => {
    setStatus({ tone: "info", message: "" });

    if (!userProfile?.churchId) {
      setStatus({ tone: "error", message: "Missing church profile." });
      return;
    }

    if (!message.trim()) {
      setStatus({ tone: "error", message: "Write a message to send." });
      return;
    }

    if (totalRecipients === 0) {
      setStatus({
        tone: "error",
        message: "No members with valid phone numbers yet.",
      });
      return;
    }

    if (insufficientCredits) {
      setStatus({
        tone: "error",
        message:
          "Not enough SMS credits to cover this broadcast. Please top up your balance.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Send this message to ${totalRecipients} recipients?`
    );

    if (!confirmed) return;

    try {
      setSending(true);
      setStatus({ tone: "info", message: "Sending bulk SMS..." });
      const idToken = await auth?.currentUser?.getIdToken?.();

      await sendBulkSms({
        churchId: userProfile.churchId,
        message: message.trim(),
        recipients: recipients.map((recipient) => recipient.phone),
        token: idToken,
      });

      setMessage("");
      setStatus({
        tone: "success",
        message: "Bulk SMS sent successfully.",
      });
      showToast("Bulk SMS sent successfully.", "success");
    } catch (err) {
      console.error("Send bulk SMS error:", err);
      setStatus({
        tone: "error",
        message: err.message || "Unable to send bulk SMS.",
      });
      showToast(err.message || "Unable to send bulk SMS.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bulk-sms">
      <div className="bulk-sms__hero">
        <div>
          <p className="eyebrow">Bulk SMS</p>
          <h2>Send updates to every church member</h2>
          <p className="bulk-sms__subtitle">
            Broadcast announcements or reminders using Hubtel. Rates are pulled
            from <strong>/config/hubtelRates</strong> so you can track live pricing.
          </p>
        </div>
        <div className="bulk-sms__hero-cards">
          <Card className="bulk-sms__stat">
            <div className="bulk-sms__stat-label">Total members</div>
            <div className="bulk-sms__stat-value">{recipientStats.totalMembers}</div>
          </Card>
          <Card className="bulk-sms__stat">
            <div className="bulk-sms__stat-label">Reachable by SMS</div>
            <div className="bulk-sms__stat-value">{totalRecipients}</div>
          </Card>
        </div>
      </div>

      <div className="bulk-sms__layout">
        <Card className="bulk-sms__compose">
          <h3>Compose your message</h3>
          <label className="bulk-sms__label" htmlFor="bulk-sms-message">
            Message
          </label>
          <textarea
            id="bulk-sms-message"
            className="bulk-sms__textarea"
            placeholder="Write the announcement you want to send to your members."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
          />
          <div className="bulk-sms__meta">
            <span>{message.length} characters</span>
            <span>
              {segmentCount || 0} SMS segment{segmentCount === 1 ? "" : "s"}
            </span>
          </div>
          {status.message && (
            <StatusBanner tone={status.tone} message={status.message} />
          )}
          {insufficientCredits && (
            <div className="bulk-sms__alert">
              You are short by {creditsShortfall} SMS credits. Top up before sending.
            </div>
          )}
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={sending || !message.trim() || insufficientCredits}
          >
            {sending
              ? "Sending..."
              : `Send to ${totalRecipients || 0} members`}
          </Button>
        </Card>

        <div className="bulk-sms__side">
          <Card className="bulk-sms__card">
            <h4>Recipients</h4>
            <p className="bulk-sms__helper">
              {totalRecipients} members with phone numbers, {recipientStats.missingPhone} missing.
            </p>
            {sampleRecipients.length > 0 ? (
              <ul className="bulk-sms__list">
                {sampleRecipients.map((recipient) => (
                  <li key={recipient.id || recipient.phone}>
                    <span>{recipient.name || "Unnamed member"}</span>
                    <span className="bulk-sms__phone">{recipient.phone}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bulk-sms__empty">No phone numbers on file yet.</p>
            )}
            {totalRecipients > sampleRecipients.length && (
              <p className="bulk-sms__helper">
                Showing {sampleRecipients.length} of {totalRecipients} recipients.
              </p>
            )}
          </Card>

          <Card className="bulk-sms__card">
            <h4>SMS credits</h4>
            <div className="bulk-sms__credit-row">
              <span>Credits per SMS</span>
              <strong>{smsCreditsPerMessage}</strong>
            </div>
            <div className="bulk-sms__credit-row">
              <span>Estimated credits</span>
              <strong>{creditsRequired || 0}</strong>
            </div>
            <div className="bulk-sms__credit-row">
              <span>Available credits</span>
              <strong>{availableCredits}</strong>
            </div>
            <p className="bulk-sms__helper">
              Estimates assume {CHAR_LIMIT} characters per SMS segment.
            </p>
          </Card>

          <Card className="bulk-sms__card">
            <h4>Hubtel pricing</h4>
            {ratesLoading && <p className="bulk-sms__helper">Loading rates...</p>}
            {ratesError && <p className="bulk-sms__error">{ratesError}</p>}
            {!ratesLoading && !ratesError && ratesList.length === 0 && (
              <p className="bulk-sms__helper">
                No pricing details found in /config/hubtelRates.
              </p>
            )}
            {ratesList.length > 0 && (
              <ul className="bulk-sms__rates">
                {ratesList.map((rate) => (
                  <li key={`${rate.label}-${rate.price}`}>
                    <div>
                      <div className="bulk-sms__rate-label">{rate.label}</div>
                      {rate.description && (
                        <div className="bulk-sms__rate-desc">{rate.description}</div>
                      )}
                    </div>
                    <div className="bulk-sms__rate-price">
                      {formatCurrency(rate.price, rate.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {ratesUpdatedAt && (
              <p className="bulk-sms__helper">Last updated: {ratesUpdatedAt}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

BulkSmsPage.propTypes = {
  members: PropTypes.arrayOf(PropTypes.object),
  userProfile: PropTypes.shape({
    churchId: PropTypes.string,
  }),
  churchPlan: PropTypes.shape({
    smsCredits: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  smsCreditsPerMessage: PropTypes.number.isRequired,
  showToast: PropTypes.func.isRequired,
};

BulkSmsPage.defaultProps = {
  members: [],
  userProfile: null,
  churchPlan: null,
};
