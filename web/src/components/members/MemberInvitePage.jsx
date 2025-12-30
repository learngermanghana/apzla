import React, { useEffect, useMemo, useState } from "react";
import "../checkin/checkin.css";
import StatusBanner from "../StatusBanner";
// Import all locales from the separate folder. Each language file defines translations
// for the invite page. This modular structure makes it easier to maintain and
// extend translations across the app.
import translations from "../locales";

const statusOptions = [
  { value: "VISITOR", label: "Visitor" },
  { value: "NEW_CONVERT", label: "New convert" },
  { value: "REGULAR", label: "Regular" },
  { value: "WORKER", label: "Worker" },
  { value: "PASTOR", label: "Pastor" },
  { value: "ELDER", label: "Elder" },
  { value: "OTHER", label: "Other" },
  { value: "INACTIVE", label: "Inactive" },
];

const genderOptions = [
  { value: "", label: "Select" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const maritalStatusOptions = [
  { value: "", label: "Select" },
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED", label: "Married" },
  { value: "SEPARATED", label: "Separated" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "twi", label: "Twi" },
  { value: "ewe", label: "Eʋegbe" },
  { value: "ga", label: "Gã" },
  { value: "de", label: "Deutsch" },
];

export default function MemberInvitePage({ token: initialToken = "" }) {
  const [language, setLanguage] = useState("en");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    baptized: "NOT_YET",
    heardAbout: "",
    ministryInterest: "",
    prayerRequest: "",
    preferredLanguage: "en",
  });
  // Each family member now has a name, relationship, and phone number. Relationship
  // defaults to "OTHER". We initialise with one empty member row.
  const [familyMembers, setFamilyMembers] = useState([
    { name: "", phone: "", relationship: "OTHER" },
  ]);
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

  const updateFamilyMember = (index, key, value) => {
    setFamilyMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addFamilyMember = () => {
    setFamilyMembers((prev) => [...prev, { name: "", phone: "", relationship: "OTHER" }]);
  };

  const removeFamilyMember = (index) => {
    setFamilyMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedLanguage = translations[language] || translations.en;
  const optionalFields = ["heardAbout", "ministryInterest", "prayerRequest"];
  const optionalAnswered = optionalFields.reduce(
    (count, key) => count + (form[key]?.trim() ? 1 : 0),
    0
  );
  const optionalProgress = Math.round(
    (optionalAnswered / optionalFields.length) * 100
  );

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

    // Build the familyTree string from familyMembers for submission. Include the
    // relationship in parentheses when present. Skip empty entries.
    const familyTreeString = familyMembers
      .map((member) => {
        const name = member.name.trim();
        const phone = member.phone.trim();
        const rel = member.relationship;
        if (!name && !phone) return "";
        const relLabel = selectedLanguage.relationshipOptions[rel] || rel;
        const base = name || phone;
        let entry = base;
        if (name && phone) {
          entry = `${name} (${relLabel}): ${phone}`;
        } else if (name && rel) {
          entry = `${name} (${relLabel})`;
        }
        return entry;
      })
      .filter(Boolean)
      .join(", ");

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/member-invite-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirst,
          lastName: trimmedLast,
          phone: trimmedPhone,
          email: trimmedEmail,
          status: form.status,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          maritalStatus: form.maritalStatus,
          baptized: form.baptized,
          familyTree: familyTreeString,
          heardAbout: form.heardAbout,
          ministryInterest: form.ministryInterest,
          prayerRequest: form.prayerRequest,
          preferredLanguage: form.preferredLanguage,
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
      // Reset form fields but preserve phone, email, status, and preferredLanguage
      setForm((prev) => ({
        ...prev,
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        maritalStatus: "",
        baptized: "NOT_YET",
        heardAbout: "",
        ministryInterest: "",
        prayerRequest: "",
      }));
      setFamilyMembers([{ name: "", phone: "", relationship: "OTHER" }]);
    } catch (err) {
      console.error("Invite submit error", err);
      setFeedback({ ok: false, message: err.message || "Unable to submit right now." });
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <div className="checkin-hero">
          <div>
            <h1 className="checkin-title">{selectedLanguage.title}</h1>
            <p className="checkin-subtitle">{selectedLanguage.subtitle}</p>
            <div className="checkin-welcome">
              <span className="checkin-welcome-title">{selectedLanguage.welcome}</span>
              <span className="checkin-welcome-note">{selectedLanguage.note}</span>
            </div>
          </div>
          <div className="checkin-hero-side">
            <div className="checkin-language">
              <label htmlFor="invite-language">{selectedLanguage.language}</label>
              <select
                id="invite-language"
                value={language}
                onChange={(e) => {
                  const nextLanguage = e.target.value;
                  setLanguage(nextLanguage);
                  updateField("preferredLanguage", nextLanguage);
                }}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <StatusBanner />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="checkin-form" autoComplete="on">
          <div className="checkin-section">
            <h2>Personal details</h2>
            <p>Help us create your member profile.</p>
          </div>

          <label className="checkin-field">
            <span>{selectedLanguage.firstName}</span>
            <input
              className="checkin-input"
              type="text"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="e.g. Ama"
            />
          </label>

          <label className="checkin-field">
            <span>{selectedLanguage.lastName}</span>
            <input
              className="checkin-input"
              type="text"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="e.g. Mensah"
            />
          </label>

          <label className="checkin-field">
            <span>{selectedLanguage.phone}*</span>
            <input
              className="checkin-input"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="e.g. 0501234567"
            />
          </label>

          <label className="checkin-field">
            <span>{selectedLanguage.email}</span>
            <input
              className="checkin-input"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="name@example.com"
            />
          </label>

          <label className="checkin-field">
            <span>{selectedLanguage.status}</span>
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
            <span>{selectedLanguage.dob}</span>
            <input
              className="checkin-input"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
            />
            <div className="checkin-help-text">
              We use this to place you in the right age group.
            </div>
          </label>

          <label className="checkin-field">
            <span>{selectedLanguage.gender}</span>
            <select
              className="checkin-input"
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
            >
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="checkin-field">
            <span>{selectedLanguage.maritalStatus}</span>
            <select
              className="checkin-input"
              value={form.maritalStatus}
              onChange={(e) => updateField("maritalStatus", e.target.value)}
            >
              {maritalStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="checkin-field checkin-field-full">
            <span>{selectedLanguage.baptized}</span>
            <div className="checkin-radio-group">
              {[
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "NOT_YET", label: "Not yet" },
              ].map((option) => (
                <label key={option.value} className="checkin-radio">
                  <input
                    type="radio"
                    name="baptized"
                    value={option.value}
                    checked={form.baptized === option.value}
                    onChange={(e) => updateField("baptized", e.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Family members input */}
          <div className="checkin-field checkin-field-full">
            <span>{selectedLanguage.familyTree}</span>
            {familyMembers.map((member, idx) => (
              <div
                key={idx}
                className="checkin-family-member"
                style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}
              >
                <input
                  className="checkin-input"
                  type="text"
                  placeholder={selectedLanguage.familyMemberName}
                  value={member.name}
                  onChange={(e) => updateFamilyMember(idx, "name", e.target.value)}
                />
                <select
                  className="checkin-input"
                  value={member.relationship}
                  onChange={(e) => updateFamilyMember(idx, "relationship", e.target.value)}
                >
                  {Object.keys(selectedLanguage.relationshipOptions).map((key) => (
                    <option key={key} value={key}>
                      {selectedLanguage.relationshipOptions[key]}
                    </option>
                  ))}
                </select>
                <input
                  className="checkin-input"
                  type="text"
                  placeholder={selectedLanguage.familyMemberPhone}
                  value={member.phone}
                  onChange={(e) => updateFamilyMember(idx, "phone", e.target.value)}
                />
                {familyMembers.length > 1 && (
                  <button
                    type="button"
                    className="checkin-photo-remove"
                    onClick={() => removeFamilyMember(idx)}
                  >
                    {selectedLanguage.remove}
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="checkin-button-secondary"
              onClick={addFamilyMember}
            >
              {selectedLanguage.addFamilyMember}
            </button>
            <div className="checkin-help-text">{selectedLanguage.familyTreeHelp}</div>
          </div>

          <div className="checkin-section checkin-section-full">
            <div>
              <h2>{selectedLanguage.optionalTitle}</h2>
              <p>{selectedLanguage.optionalHelp}</p>
            </div>
            <div className="checkin-progress">
              <div className="checkin-progress-bar">
                <span style={{ width: `${optionalProgress}%` }} />
              </div>
              <span>
                {optionalAnswered}/{optionalFields.length}
              </span>
            </div>
          </div>

          <label className="checkin-field">
            <span>{selectedLanguage.heardAbout}</span>
            <input
              className="checkin-input"
              type="text"
              value={form.heardAbout}
              onChange={(e) => updateField("heardAbout", e.target.value)}
              placeholder="Friend, online, outreach..."
            />
          </label>

          <label className="checkin-field">
            <span>{selectedLanguage.ministryInterest}</span>
            <input
              className="checkin-input"
              type="text"
              value={form.ministryInterest}
              onChange={(e) => updateField("ministryInterest", e.target.value)}
              placeholder="Music, ushering, children..."
            />
          </label>

          <label className="checkin-field checkin-field-full">
            <span>{selectedLanguage.prayerRequest}</span>
            <textarea
              className="checkin-textarea"
              value={form.prayerRequest}
              onChange={(e) => updateField("prayerRequest", e.target.value)}
              placeholder="We would love to pray with you."
            />
          </label>

          <label className="checkin-field checkin-field-full">
            <span>{selectedLanguage.inviteToken}*</span>
            <input
              className="checkin-input"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Automatically filled from the link"
              autoComplete="off"
            />
            <div className="checkin-help-text">{selectedLanguage.tokenHelp}</div>
          </label>

          {feedback.message && (
            <div className={`checkin-feedback checkin-feedback-${statusTone}`}>
              {feedback.message}
            </div>
          )}

          <button type="submit" className="checkin-button" disabled={isSubmitting}>
            {isSubmitting ? selectedLanguage.submitting : selectedLanguage.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
