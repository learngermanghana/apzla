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

const hearAboutOptions = [
  { value: "", label: "Select one" },
  { value: "FRIEND", label: "Friend / family" },
  { value: "SOCIAL_MEDIA", label: "Social media" },
  { value: "STREET_OUTREACH", label: "Street outreach" },
  { value: "ONLINE_SEARCH", label: "Online search" },
  { value: "EVENT", label: "Church event" },
  { value: "OTHER", label: "Other" },
];

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image."));
    img.src = src;
  });

function estimateDataUrlBytes(dataUrl = "") {
  const base64 = `${dataUrl}`.split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

async function compressImageToJpegDataUrl(file, { maxDim = 640, quality = 0.78 } = {}) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, dstW, dstH);

  return canvas.toDataURL("image/jpeg", quality);
}

export default function MemberInvitePage({ token: initialToken = "" }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
    dateOfBirth: "",
    photoDataUrl: "",
    hearAboutUs: "",
    hearAboutUsOther: "",
    visitReason: "",
    visitReasonPrivate: true,
    wantsLeaderCall: "NO",
    preferredCallTime: "",
    familyMembers: [],
  });

  const [token, setToken] = useState(initialToken || "");
  const [feedback, setFeedback] = useState({ ok: false, message: "" });
  const [statusTone, setStatusTone] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Keep this comfortably below Firestore doc limit (1 MiB) and typical serverless body limits.
  // With compression, most photos will land ~40–200 KB.
  const MAX_PHOTO_BYTES = 650 * 1024; // 650 KB

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

  const addFamilyMember = () => {
    setForm((prev) => ({
      ...prev,
      familyMembers: [
        ...(prev.familyMembers || []),
        { firstName: "", lastName: "", relationship: "CHILD" },
      ],
    }));
  };

  const updateFamilyMember = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      familyMembers: (prev.familyMembers || []).map((member, idx) =>
        idx === index ? { ...member, [key]: value } : member
      ),
    }));
  };

  const removeFamilyMember = (index) => {
    setForm((prev) => ({
      ...prev,
      familyMembers: (prev.familyMembers || []).filter((_, idx) => idx !== index),
    }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    setPhotoError("");

    if (!file) {
      updateField("photoDataUrl", "");
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setPhotoError("Please choose an image file (JPG/PNG/WebP).");
      updateField("photoDataUrl", "");
      return;
    }

    // Optional: prevent massive uploads before we compress
    if (file.size > 6 * 1024 * 1024) {
      setPhotoError("That photo is too large. Please choose an image under 6MB.");
      updateField("photoDataUrl", "");
      return;
    }

    try {
      const compressed = await compressImageToJpegDataUrl(file, { maxDim: 640, quality: 0.78 });
      const bytes = estimateDataUrlBytes(compressed);

      if (bytes > MAX_PHOTO_BYTES) {
        setPhotoError(
          "Photo is still too large after compression. Please use a smaller photo."
        );
        updateField("photoDataUrl", "");
        return;
      }

      updateField("photoDataUrl", compressed);
    } catch (err) {
      console.error("Photo processing error:", err);
      setPhotoError(err.message || "Unable to process photo.");
      updateField("photoDataUrl", "");
    }
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

    if (photoError) {
      setFeedback({ ok: false, message: photoError });
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
          wantsLeaderCall: form.wantsLeaderCall === "YES",
          preferredCallTime:
            form.wantsLeaderCall === "YES" ? form.preferredCallTime.trim() : "",
          hearAboutUsOther:
            form.hearAboutUs === "OTHER" ? form.hearAboutUsOther.trim() : "",
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
        photoDataUrl: "",
        hearAboutUs: "",
        hearAboutUsOther: "",
        visitReason: "",
        visitReasonPrivate: true,
        wantsLeaderCall: "NO",
        preferredCallTime: "",
        familyMembers: [],
      });

      // reset input (so selecting same file again triggers onChange)
      const photoInput = document.getElementById("invite-photo-input");
      if (photoInput) photoInput.value = "";
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
              <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
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
              <div className="checkin-help-text">We use this to place you in the right age group.</div>
            </label>

            <label className="checkin-field">
              <span>How did you hear about us?</span>
              <select
                value={form.hearAboutUs}
                onChange={(e) => updateField("hearAboutUs", e.target.value)}
              >
                {hearAboutOptions.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {form.hearAboutUs === "OTHER" && (
                <input
                  type="text"
                  value={form.hearAboutUsOther}
                  onChange={(e) => updateField("hearAboutUsOther", e.target.value)}
                  placeholder="Share details"
                  style={{ marginTop: "8px" }}
                />
              )}
            </label>

            <label className="checkin-field">
              <span>Reason for visit / prayer request</span>
              <textarea
                value={form.visitReason}
                onChange={(e) => updateField("visitReason", e.target.value)}
                placeholder="Share what brought you today or how we can pray."
                rows={3}
              />
              <label style={{ marginTop: "6px", display: "flex", gap: "6px", fontSize: "12px" }}>
                <input
                  type="checkbox"
                  checked={form.visitReasonPrivate}
                  onChange={(e) => updateField("visitReasonPrivate", e.target.checked)}
                />
                Keep this private to leaders only
              </label>
            </label>

            <label className="checkin-field">
              <span>Want a call from a leader?</span>
              <select
                value={form.wantsLeaderCall}
                onChange={(e) => updateField("wantsLeaderCall", e.target.value)}
              >
                <option value="NO">No, thank you</option>
                <option value="YES">Yes, please</option>
              </select>
              {form.wantsLeaderCall === "YES" && (
                <input
                  type="text"
                  value={form.preferredCallTime}
                  onChange={(e) => updateField("preferredCallTime", e.target.value)}
                  placeholder="Best time to reach me"
                  style={{ marginTop: "8px" }}
                />
              )}
            </label>

            <div className="checkin-field">
              <span>Family mode</span>
              <div className="checkin-help-text" style={{ marginBottom: "6px" }}>
                Add spouse or children to share the same invite.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(form.familyMembers || []).map((member, index) => (
                  <div
                    key={`family-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="text"
                      value={member.firstName}
                      onChange={(e) => updateFamilyMember(index, "firstName", e.target.value)}
                      placeholder="First name"
                    />
                    <input
                      type="text"
                      value={member.lastName}
                      onChange={(e) => updateFamilyMember(index, "lastName", e.target.value)}
                      placeholder="Last name"
                    />
                    <select
                      value={member.relationship || "CHILD"}
                      onChange={(e) => updateFamilyMember(index, "relationship", e.target.value)}
                    >
                      <option value="SPOUSE">Spouse</option>
                      <option value="CHILD">Child</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(index)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFamilyMember}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    alignSelf: "flex-start",
                  }}
                >
                  Add family member
                </button>
              </div>
            </div>

            {/* NEW: Photo upload */}
            <label className="checkin-field">
              <span>Photo (optional)</span>
              <input
                id="invite-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <div className="checkin-help-text">
                Optional profile photo (compressed before uploading).
              </div>
              {photoError && (
                <div className="checkin-help-text" style={{ color: "#b91c1c" }}>
                  {photoError}
                </div>
              )}
              {form.photoDataUrl ? (
                <div style={{ marginTop: 10 }}>
                  <img
                    src={form.photoDataUrl}
                    alt="Selected"
                    style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 12 }}
                  />
                  <div>
                    <button
                      type="button"
                      onClick={() => updateField("photoDataUrl", "")}
                      style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : null}
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
