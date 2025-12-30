import React, { useEffect, useMemo, useState } from "react";
import "../checkin/checkin.css";
import StatusBanner from "../StatusBanner";

const statusOptions = [
  { value: "VISITOR", label: "Visitor" },
  { value: "NEW_CONVERT", label: "New convert" },
  { value: "REGULAR", label: "Regular" },
  { value: "WORKER", label: "Worker" },
  { value: "PASTOR", label: "Pastor" },
];

export default function MemberInvitePage({ token: initialToken = "" }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
    baptizedStatus: "",
    heardFrom: "",
    ministryInterest: "",
    smallGroupInterest: "",
    prayerRequest: "",
  });
  const [token, setToken] = useState(initialToken || "");
  const [feedback, setFeedback] = useState({ ok: false, message: "" });
  const [statusTone, setStatusTone] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [churchMeta, setChurchMeta] = useState({
    loading: false,
    data: null,
    error: "",
  });

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

  useEffect(() => {
    if (!token?.trim()) return;
    let isActive = true;
    setChurchMeta({ loading: true, data: null, error: "" });
    fetch(`/api/member-invite-meta?token=${encodeURIComponent(token.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isActive) return;
        if (data?.ok && data?.church) {
          setChurchMeta({ loading: false, data: data.church, error: "" });
        } else {
          setChurchMeta({
            loading: false,
            data: null,
            error: data?.message || "Unable to load church details.",
          });
        }
      })
      .catch((err) => {
        if (!isActive) return;
        setChurchMeta({
          loading: false,
          data: null,
          error: err.message || "Unable to load church details.",
        });
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addFamilyMember = () => {
    setFamilyMembers((prev) => [...prev, { name: "", relationship: "" }]);
  };

  const updateFamilyMember = (index, key, value) => {
    setFamilyMembers((prev) =>
      prev.map((member, idx) => (idx === index ? { ...member, [key]: value } : member))
    );
  };

  const removeFamilyMember = (index) => {
    setFamilyMembers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const optionalProgress = useMemo(() => {
    const keys = ["heardFrom", "ministryInterest", "smallGroupInterest", "prayerRequest"];
    const answered = keys.filter((key) => String(form[key] || "").trim()).length;
    const total = keys.length;
    return {
      answered,
      total,
      percent: total === 0 ? 0 : Math.round((answered / total) * 100),
    };
  }, [form]);

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
          familyMembers,
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
        baptizedStatus: "",
        heardFrom: "",
        ministryInterest: "",
        smallGroupInterest: "",
        prayerRequest: "",
      });
      setFamilyMembers([]);
    } catch (err) {
      console.error("Invite submit error", err);
      setFeedback({ ok: false, message: err.message || "Unable to submit right now." });
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const churchName = churchMeta.data?.name || "Your church";
  const churchLocation = churchMeta.data?.city || churchMeta.data?.country || "Local community";
  const churchInitial = (churchName || "A").charAt(0).toUpperCase();

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <div className="checkin-header">
          <div>
            <h1 className="checkin-title">Share your details</h1>
            <p className="checkin-subtitle">
              A leader invited you to join <strong>{churchName}</strong>. Fill this form to be
              added automatically.
            </p>
            <div className="invite-church-card">
              <div className="invite-church-avatar">{churchInitial}</div>
              <div>
                <p className="invite-church-name">{churchName}</p>
                <p className="invite-church-location">{churchLocation}</p>
              </div>
            </div>
            {churchMeta.loading && (
              <p className="invite-church-loading">Loading church details…</p>
            )}
            {churchMeta.error && !churchMeta.loading && (
              <p className="invite-church-error">{churchMeta.error}</p>
            )}
          </div>
          <StatusBanner />
        </div>

        <form onSubmit={handleSubmit} className="checkin-form" autoComplete="on">
          <div className="invite-section">
            <div>
              <p className="invite-section-eyebrow">Step 1</p>
              <h2 className="invite-section-title">Contact details</h2>
              <p className="invite-section-subtitle">
                Tell us who you are and how we can reach you.
              </p>
            </div>

            <div className="invite-section-grid">
              <label className="checkin-field">
                <span>First name</span>
                <input
                  className="checkin-input"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="e.g. Ama"
                />
              </label>

              <label className="checkin-field">
                <span>Last name</span>
                <input
                  className="checkin-input"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="e.g. Mensah"
                />
              </label>

              <label className="checkin-field">
                <span>Phone*</span>
                <input
                  className="checkin-input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="e.g. 0501234567"
                />
              </label>

              <label className="checkin-field">
                <span>Email</span>
                <input
                  className="checkin-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="name@example.com"
                />
              </label>

              <label className="checkin-field">
                <span>Status</span>
                <select
                  className="checkin-input"
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
                <span>Invite token*</span>
                <input
                  className="checkin-input"
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
          </div>

          <div className="invite-section">
            <div>
              <p className="invite-section-eyebrow">Step 2</p>
              <h2 className="invite-section-title">Family & faith</h2>
              <p className="invite-section-subtitle">
                Share your household details and baptism status if available.
              </p>
            </div>

            <div className="invite-section-grid">
              <label className="checkin-field">
                <span>Baptized?</span>
                <select
                  className="checkin-input"
                  value={form.baptizedStatus}
                  onChange={(e) => updateField("baptizedStatus", e.target.value)}
                >
                  <option value="">Select an option</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="NOT_SURE">Not sure</option>
                </select>
              </label>
            </div>

            <div className="invite-family-list">
              <div className="invite-family-header">
                <div>
                  <p className="invite-family-title">Family tree</p>
                  <p className="invite-family-subtitle">
                    Add household members who should be connected to this church.
                  </p>
                </div>
                <button
                  type="button"
                  className="invite-secondary-button"
                  onClick={addFamilyMember}
                >
                  Add family member
                </button>
              </div>

              {familyMembers.length === 0 && (
                <p className="invite-family-empty">
                  No family members added yet. Use the button to include spouse or children.
                </p>
              )}

              {familyMembers.map((member, index) => (
                <div key={`family-${index}`} className="invite-family-row">
                  <label className="checkin-field">
                    <span>Name</span>
                    <input
                      className="checkin-input"
                      type="text"
                      value={member.name}
                      onChange={(e) => updateFamilyMember(index, "name", e.target.value)}
                      placeholder="Full name"
                    />
                  </label>
                  <label className="checkin-field">
                    <span>Relationship</span>
                    <input
                      className="checkin-input"
                      type="text"
                      value={member.relationship}
                      onChange={(e) =>
                        updateFamilyMember(index, "relationship", e.target.value)
                      }
                      placeholder="e.g. Spouse, Child"
                    />
                  </label>
                  <button
                    type="button"
                    className="invite-remove-button"
                    onClick={() => removeFamilyMember(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="invite-section">
            <div className="invite-section-header">
              <div>
                <p className="invite-section-eyebrow">Optional questions</p>
                <h2 className="invite-section-title">Help us serve you better</h2>
                <p className="invite-section-subtitle">
                  Answer any of these and we will tailor follow-up to your needs.
                </p>
              </div>
              <div className="invite-progress">
                <div
                  className="invite-progress-bar"
                  style={{ width: `${optionalProgress.percent}%` }}
                />
              </div>
              <div className="invite-progress-label">
                {optionalProgress.answered} of {optionalProgress.total} answered
              </div>
            </div>

            <div className="invite-section-grid">
              <label className="checkin-field">
                <span>How did you hear about us?</span>
                <input
                  className="checkin-input"
                  type="text"
                  value={form.heardFrom}
                  onChange={(e) => updateField("heardFrom", e.target.value)}
                  placeholder="Friend, online, outreach, etc."
                />
              </label>

              <label className="checkin-field">
                <span>Interested in serving?</span>
                <select
                  className="checkin-input"
                  value={form.ministryInterest}
                  onChange={(e) => updateField("ministryInterest", e.target.value)}
                >
                  <option value="">Select an option</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="MAYBE">Maybe</option>
                </select>
              </label>

              <label className="checkin-field">
                <span>Interested in a small group?</span>
                <select
                  className="checkin-input"
                  value={form.smallGroupInterest}
                  onChange={(e) => updateField("smallGroupInterest", e.target.value)}
                >
                  <option value="">Select an option</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="MAYBE">Maybe</option>
                </select>
              </label>

              <label className="checkin-field invite-textarea-span">
                <span>Prayer requests (optional)</span>
                <textarea
                  className="checkin-textarea"
                  value={form.prayerRequest}
                  onChange={(e) => updateField("prayerRequest", e.target.value)}
                  placeholder="Share anything we should pray about."
                />
              </label>
            </div>
          </div>

          {feedback.message && (
            <div className={`checkin-feedback checkin-feedback-${statusTone}`}>
              {feedback.message}
            </div>
          )}

          <button type="submit" className="checkin-button" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Send my details"}
          </button>
        </form>
      </div>
    </div>
  );
}
