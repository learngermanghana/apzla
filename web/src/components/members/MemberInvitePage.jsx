import React, { useEffect, useMemo, useState } from "react";
import "../checkin/checkin.css";
import StatusBanner from "../StatusBanner";

const statusOptions = [
  { value: "VISITOR", label: "Visitor" },
  { value: "NEW_CONVERT", label: "New convert" },
  { value: "REGULAR", label: "Regular" },
  { value: "WORKER", label: "Worker" },
  { value: "PASTOR", label: "Pastor" },
  { value: "ELDER", label: "Elder" },
  { value: "OTHER", label: "Other" },
];

export default function MemberInvitePage({ token: initialToken = "" }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
    dateOfBirth: "",
  });
  const [token, setToken] = useState(initialToken || "");
  const [feedback, setFeedback] = useState({ ok: false, message: "" });
  const [statusTone, setStatusTone] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenFromUrl = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qToken = params.get("token");
      if (qToken && qToken.trim()) return qToken.trim();

      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && parts[0] === "member-invite") {
        return parts[1].trim();
      }

      return "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!tokenFromUrl) return;
    setToken((prev) => (prev?.trim() ? prev : tokenFromUrl));
  }, [tokenFromUrl]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedToken = token.trim();
    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedToken) {
      setFeedback({ ok: false, message: "This invite link is missing its token." });
      setStatusTone("error");
      return;
    }

    if (!trimmedFirst && !trimmedLast) {
      setFeedback({
        ok: false,
        message: "Please share at least your first or last name so we know who you are.",
      });
      setStatusTone("error");
      return;
    }

    if (!trimmedPhone && !trimmedEmail) {
      setFeedback({
        ok: false,
        message: "Please provide a phone number or email so we can follow up.",
      });
      setStatusTone("error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/member-invite-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: trimmedPhone,
          email: trimmedEmail,
          firstName: trimmedFirst,
          lastName: trimmedLast,
          token: trimmedToken,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const ok = data.ok ?? res.ok;

      if (!ok) {
        setFeedback({ ok: false, message: data.message || "We could not save your details." });
        setStatusTone("error");
        return;
      }

      setFeedback({ ok: true, message: data.message || "You are all set. Thank you!" });
      setStatusTone("success");
      setForm({
        firstName: "",
        lastName: "",
        phone: trimmedPhone,
        email: trimmedEmail,
        status: form.status,
        dateOfBirth: "",
      });
    } catch (err) {
      console.error("Invite submit error", err);
      setFeedback({ ok: false, message: err.message || "Unable to submit right now." });
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkin-shell">
      <div className="checkin-card">
        <div className="checkin-header">
          <div>
            <h1 className="checkin-title">Share your details</h1>
            <p className="checkin-subtitle">
              A leader invited you to join their community list. Fill this form to be added
              automatically.
            </p>
          </div>
          <StatusBanner />
        </div>

        <form onSubmit={handleSubmit} className="checkin-form" autoComplete="on">
          <div className="checkin-grid">
            <label className="checkin-field">
              <span>First name</span>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="e.g. Ama"
              />
            </label>

            <label className="checkin-field">
              <span>Last name</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="e.g. Mensah"
              />
            </label>

            <label className="checkin-field">
              <span>Phone*</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="e.g. 0501234567"
              />
            </label>

            <label className="checkin-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="name@example.com"
              />
            </label>

            <label className="checkin-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkin-field">
              <span>Date of birth</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
              />
              <div className="checkin-help-text">
                We use this to place you in the right age group.
              </div>
            </label>

            <label className="checkin-field">
              <span>Invite token*</span>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Automatically filled from the link"
                autoComplete="off"
              />
              <div className="checkin-help-text">
                The token from your link helps us connect you to the right church.
              </div>
            </label>
          </div>

          {feedback.message && (
            <div className={`checkin-feedback checkin-feedback-${statusTone}`}>
              {feedback.message}
            </div>
          )}

          <button type="submit" className="checkin-submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Send my details"}
          </button>
        </form>
      </div>
    </div>
  );
}
