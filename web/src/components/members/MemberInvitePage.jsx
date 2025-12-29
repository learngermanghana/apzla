import React, { useEffect, useMemo, useState } from "react";
import "../checkin/checkin.css";
import { isValidEmail } from "../../utils/validation";

const statusOptions = [
  { value: "VISITOR", label: "Visitor" },
  { value: "NEW_CONVERT", label: "New convert" },
  { value: "REGULAR", label: "Regular" },
  { value: "WORKER", label: "Worker" },
  { value: "PASTOR", label: "Pastor" },
  { value: "ELDER", label: "Elder" },
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

const languages = [
  { value: "en", label: "English" },
  { value: "twi", label: "Twi" },
  { value: "ewe", label: "Ewe" },
  { value: "ga", label: "Ga" },
  { value: "de", label: "Deutsch" },
];

const translations = {
  en: {
    title: "You’re invited",
    subtitle: "Share your details to stay connected with your church.",
    welcomeFallback: "We’re excited to meet you this week.",
    pastorLabel: "Pastor",
    serviceTimes: "Service times",
    location: "Location",
    aboutYou: "About you",
    contact: "Contact",
    optionalDetails: "Optional details",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    email: "Email",
    status: "Status",
    dob: "Date of birth",
    photo: "Photo (optional)",
    inviteToken: "Invite token",
    next: "Next",
    back: "Back",
    submit: "Send my details",
    submitting: "Submitting…",
    looksGood: "Looks good!",
    language: "Language",
    phoneHelper: "We’ll only use this to follow up.",
    emailHelper: "A confirmation can be sent here.",
    tokenHelper: "We use this token to connect you to the right church.",
    stepIntro: "Step",
    of: "of",
    photoHelper: "Optional profile photo (compressed before uploading).",
    shareNameHelper: "Please share at least a first or last name.",
    shareContactHelper: "Please provide a phone number or email.",
    emailInvalid: "Please enter a valid email address.",
    mapLabel: "View on map",
  },
  twi: {
    title: "Wɔato wo frɛ",
    subtitle: "Fa wo nsɛm hyɛ mu na wo ne asɔre no nni nkitaho.",
    welcomeFallback: "Yɛrehwɛ wo kwan da a ɛbɛba no.",
    pastorLabel: "Sɔfo",
    serviceTimes: "Som bere",
    location: "Beae",
    aboutYou: "Wo ho nsɛm",
    contact: "Nkitaho",
    optionalDetails: "Nsɛm a ɛho nhia",
    firstName: "Din a ɛdi kan",
    lastName: "Abusuadin",
    phone: "Telefon",
    email: "Email",
    status: "Tebea",
    dob: "Wɔwo da",
    photo: "Mfonini (ɛho nhia)",
    inviteToken: "Invite token",
    next: "To so",
    back: "San kɔ",
    submit: "Fa me nsɛm kɔ",
    submitting: "Yɛde rekɔ…",
    looksGood: "Ɛyɛ!",
    language: "Kasa",
    phoneHelper: "Yɛde bɛdi wo akyi nkutoo.",
    emailHelper: "Yɛbɛtumi de nsɛm akɔ ha.",
    tokenHelper: "Token yi boa yɛn ma yɛde wo bɔ asɔre no mu.",
    stepIntro: "Anamɔn",
    of: "mu",
    photoHelper: "Mfonini (yɛbɛkyekyere ansa).",
    shareNameHelper: "Fa wo din biako anaasɛ abusuadin.",
    shareContactHelper: "Fa telefon anaa email bi.",
    emailInvalid: "Fa email a ɛyɛ nokware.",
    mapLabel: "Hwɛ map so",
  },
  ewe: {
    title: "Wòkplɔ wò",
    subtitle: "Ɖe wò nyawo dzi be wòle ɖo wɔnɔna ƒe hã me.",
    welcomeFallback: "Míaɖe wò kple ɖomekpɔ kɔkɔe.",
    pastorLabel: "Pastor",
    serviceTimes: "Subɔsubɔ ŋkeke",
    location: "Tɔdzi",
    aboutYou: "Wò ŋutɔ ƒe nu",
    contact: "Kplɔnyawo",
    optionalDetails: "Nu siwo maɖo o",
    firstName: "Ŋkɔ gãtɔ",
    lastName: "Abusua ŋkɔ",
    phone: "Telefon",
    email: "Email",
    status: "Nɔnɔme",
    dob: "Dzidzɔ ŋkeke",
    photo: "Nɔnɔme (maɖo o)",
    inviteToken: "Invite token",
    next: "Dzo yi",
    back: "Trɔ",
    submit: "Ɖe nyawo",
    submitting: "Le kplɔm…",
    looksGood: "Enyo!",
    language: "Gbegbe",
    phoneHelper: "Míaɖe eŋu be míaŋlɔ ɖe wò ŋu.",
    emailHelper: "Míaɖe dzesi be míaɖo gbɔ.",
    tokenHelper: "Token sia na mía be míaɖo wò kple hã la.",
    stepIntro: "Aƒe",
    of: "me",
    photoHelper: "Nɔnɔme (míaɖe edzi).",
    shareNameHelper: "Míaɖe ŋkɔ gbãtɔ alo abusuadin.",
    shareContactHelper: "Míaɖe telefon alo email.",
    emailInvalid: "Tɔ asẽm email a ɛnyo.",
    mapLabel: "Kpɔ map",
  },
  ga: {
    title: "Wɔakɔ wo",
    subtitle: "Fa wo nsɛm hyɛ mu na wo ne asafo no nni nkitaho.",
    welcomeFallback: "Yɛrehwɛ wo kwan da a ɛbɛba no.",
    pastorLabel: "Pastor",
    serviceTimes: "Som bere",
    location: "Beae",
    aboutYou: "Wo ho nsɛm",
    contact: "Nkitaho",
    optionalDetails: "Nsɛm a ɛho nhia",
    firstName: "Din a ɛdi kan",
    lastName: "Abusuadin",
    phone: "Telefon",
    email: "Email",
    status: "Tebea",
    dob: "Wɔwo da",
    photo: "Mfonini (ɛho nhia)",
    inviteToken: "Invite token",
    next: "To so",
    back: "San kɔ",
    submit: "Fa me nsɛm kɔ",
    submitting: "Yɛde rekɔ…",
    looksGood: "Ɛyɛ!",
    language: "Kasa",
    phoneHelper: "Yɛde bɛdi wo akyi nkutoo.",
    emailHelper: "Yɛbɛtumi de nsɛm akɔ ha.",
    tokenHelper: "Token yi boa yɛn ma yɛde wo bɔ asafo no mu.",
    stepIntro: "Anamɔn",
    of: "mu",
    photoHelper: "Mfonini (yɛbɛkyekyere ansa).",
    shareNameHelper: "Fa wo din biako anaasɛ abusuadin.",
    shareContactHelper: "Fa telefon anaa email bi.",
    emailInvalid: "Fa email a ɛyɛ nokware.",
    mapLabel: "Hwɛ map so",
  },
  de: {
    title: "Du bist eingeladen",
    subtitle: "Teile deine Angaben, um mit deiner Gemeinde verbunden zu bleiben.",
    welcomeFallback: "Wir freuen uns, dich diese Woche zu sehen.",
    pastorLabel: "Pastor",
    serviceTimes: "Gottesdienstzeiten",
    location: "Adresse",
    aboutYou: "Über dich",
    contact: "Kontakt",
    optionalDetails: "Optionale Angaben",
    firstName: "Vorname",
    lastName: "Nachname",
    phone: "Telefon",
    email: "E-Mail",
    status: "Status",
    dob: "Geburtsdatum",
    photo: "Foto (optional)",
    inviteToken: "Einladungscode",
    next: "Weiter",
    back: "Zurück",
    submit: "Daten senden",
    submitting: "Wird gesendet…",
    looksGood: "Sieht gut aus!",
    language: "Sprache",
    phoneHelper: "Wir nutzen das nur für die Rückmeldung.",
    emailHelper: "Eine Bestätigung kann hierhin gesendet werden.",
    tokenHelper: "Damit verbinden wir dich mit der richtigen Gemeinde.",
    stepIntro: "Schritt",
    of: "von",
    photoHelper: "Optionales Profilfoto (vor dem Upload komprimiert).",
    shareNameHelper: "Bitte gib mindestens Vor- oder Nachnamen an.",
    shareContactHelper: "Bitte gib Telefon oder E-Mail an.",
    emailInvalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
    mapLabel: "Auf Karte ansehen",
  },
};

const formatPhone = (value = "") => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";

  if (digits.startsWith("233") && digits.length >= 12) {
    const rest = digits.slice(3);
    return `+233 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 9)}`.trim();
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }

  if (digits.length > 3 && digits.length <= 6) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }

  if (digits.length > 6) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return digits;
};

const normalizePhone = (value = "") => value.replace(/[^\d+]/g, "").trim();

const isValidPhone = (value = "") => {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 7;
};

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
  const [language, setLanguage] = useState("en");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
    dateOfBirth: "",
    photoDataUrl: "",
  });

  const [token, setToken] = useState(initialToken || "");
  const [currentStep, setCurrentStep] = useState(0);
  const [feedback, setFeedback] = useState({ ok: false, message: "" });
  const [statusTone, setStatusTone] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [churchInfo, setChurchInfo] = useState({
    name: "",
    pastorName: "",
    welcomeMessage: "",
    serviceTimes: [],
    address: "",
    city: "",
    country: "",
    mapUrl: "",
    mapLink: "",
    logoUrl: "",
    brandColor: "",
  });
  const [churchLoading, setChurchLoading] = useState(false);
  const [churchError, setChurchError] = useState("");

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

  useEffect(() => {
    setFeedback({ ok: false, message: "" });
    setStatusTone("info");
  }, [currentStep]);

  useEffect(() => {
    const trimmedToken = token.trim();
    if (!trimmedToken) return;

    let ignore = false;

    const loadChurchInfo = async () => {
      setChurchLoading(true);
      setChurchError("");

      try {
        const res = await fetch(`/api/member-invite-info?token=${encodeURIComponent(trimmedToken)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "Unable to load church details.");
        }

        if (!ignore) {
          setChurchInfo({
            name: data.church?.name || "",
            pastorName: data.church?.pastorName || "",
            welcomeMessage: data.church?.welcomeMessage || "",
            serviceTimes: data.church?.serviceTimes || [],
            address: data.church?.address || "",
            city: data.church?.city || "",
            country: data.church?.country || "",
            mapUrl: data.church?.mapUrl || "",
            mapLink: data.church?.mapLink || "",
            logoUrl: data.church?.logoUrl || "",
            brandColor: data.church?.brandColor || "",
          });
        }
      } catch (err) {
        if (!ignore) {
          setChurchError(err.message || "Unable to load church details.");
        }
      } finally {
        if (!ignore) {
          setChurchLoading(false);
        }
      }
    };

    loadChurchInfo();

    return () => {
      ignore = true;
    };
  }, [token]);

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePhoneChange = (value) => {
    updateField("phone", normalizePhone(value));
  };

  const handlePhoneBlur = () => {
    updateField("phone", formatPhone(form.phone));
  };

  const handleEmailBlur = () => {
    updateField("email", form.email.trim().toLowerCase());
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

    if (currentStep < 2) {
      if (currentStep === 0 && !(form.firstName.trim() || form.lastName.trim())) {
        setFeedback({ ok: false, message: t("shareNameHelper") });
        setStatusTone("error");
        return;
      }

      if (
        currentStep === 1 &&
        !(
          (form.phone.trim() && isValidPhone(form.phone)) ||
          (form.email.trim() && isValidEmail(form.email))
        )
      ) {
        setFeedback({ ok: false, message: t("shareContactHelper") });
        setStatusTone("error");
        return;
      }

      handleNext();
      return;
    }

    const trimmedToken = token.trim();
    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();
    const trimmedPhone = normalizePhone(form.phone);
    const trimmedEmail = form.email.trim();

    if (!trimmedToken) {
      setFeedback({ ok: false, message: "This invite link is missing its token." });
      setStatusTone("error");
      return;
    }

    if (!trimmedFirst && !trimmedLast) {
      setFeedback({
        ok: false,
        message: t("shareNameHelper"),
      });
      setStatusTone("error");
      return;
    }

    if (!trimmedPhone && !trimmedEmail) {
      setFeedback({
        ok: false,
        message: t("shareContactHelper"),
      });
      setStatusTone("error");
      return;
    }

    if (photoError) {
      setFeedback({ ok: false, message: photoError });
      setStatusTone("error");
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setFeedback({ ok: false, message: t("emailInvalid") });
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
        photoDataUrl: "",
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

  const steps = [
    { id: 0, label: t("aboutYou") },
    { id: 1, label: t("contact") },
    { id: 2, label: t("optionalDetails") },
  ];

  const aboutYouReady = form.firstName.trim() || form.lastName.trim();
  const contactReady =
    (form.phone.trim() && isValidPhone(form.phone)) ||
    (form.email.trim() && isValidEmail(form.email));
  const phoneLooksGood = form.phone.trim() && isValidPhone(form.phone);
  const emailLooksGood = form.email.trim() && isValidEmail(form.email);
  const inviteHeroName = churchInfo.name || "Your church";
  const inviteHeroMessage = churchInfo.welcomeMessage || t("welcomeFallback");
  const inviteAccent = churchInfo.brandColor || "#4f46e5";
  const locationLine = [churchInfo.address, churchInfo.city, churchInfo.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="checkin-page invite-page" style={{ "--invite-accent": inviteAccent }}>
      <div className="invite-card">
        <div className="invite-hero">
          <div className="invite-hero-top">
            <div className="invite-brand">
              {churchInfo.logoUrl ? (
                <img src={churchInfo.logoUrl} alt={`${inviteHeroName} logo`} />
              ) : (
                <div className="invite-brand-fallback">{inviteHeroName.slice(0, 2)}</div>
              )}
              <div>
                <p className="invite-brand-label">{inviteHeroName}</p>
                {churchInfo.pastorName ? (
                  <p className="invite-brand-subtitle">
                    {t("pastorLabel")}: {churchInfo.pastorName}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="invite-language">
              <label htmlFor="invite-language">{t("language")}</label>
              <select
                id="invite-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h1 className="invite-title">{t("title")}</h1>
          <p className="invite-subtitle">{t("subtitle")}</p>
          <p className="invite-welcome">{inviteHeroMessage}</p>

          <div className="invite-meta">
            <div className="invite-meta-card">
              <h3>{t("serviceTimes")}</h3>
              {churchInfo.serviceTimes?.length ? (
                <ul>
                  {churchInfo.serviceTimes.map((time) => (
                    <li key={time}>{time}</li>
                  ))}
                </ul>
              ) : (
                <p>Sunday 9:00 AM · Midweek 6:30 PM</p>
              )}
            </div>
            <div className="invite-meta-card">
              <h3>{t("location")}</h3>
              <p>{locationLine || "Near you"}</p>
              {churchInfo.mapLink ? (
                <a href={churchInfo.mapLink} target="_blank" rel="noreferrer">
                  {t("mapLabel")}
                </a>
              ) : null}
            </div>
          </div>

          <div className="invite-map">
            {churchLoading ? (
              <div className="invite-map-loading">Loading map…</div>
            ) : churchInfo.mapUrl ? (
              <iframe
                title="Church map"
                src={churchInfo.mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="invite-map-placeholder">
                {churchError || "Map preview will appear here once location details are set."}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="invite-form" autoComplete="on">
          <div className="invite-progress">
            <div className="invite-progress-header">
              <span>
                {t("stepIntro")} {currentStep + 1} {t("of")} {steps.length}
              </span>
              <span>{steps[currentStep].label}</span>
            </div>
            <div className="invite-progress-bar">
              <span style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
            </div>
            <div className="invite-progress-steps">
              {steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  className={`invite-step ${currentStep === step.id ? "active" : ""} ${
                    currentStep > step.id ? "done" : ""
                  }`}
                  onClick={() => setCurrentStep(step.id)}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          {currentStep === 0 && (
            <div className="invite-step-body">
              <label className="checkin-field">
                <span>{t("firstName")}</span>
                <input
                  className="checkin-input"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="e.g. Ama"
                  autoComplete="given-name"
                />
              </label>

              <label className="checkin-field">
                <span>{t("lastName")}</span>
                <input
                  className="checkin-input"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="e.g. Mensah"
                  autoComplete="family-name"
                />
              </label>
            </div>
          )}

          {currentStep === 1 && (
            <div className="invite-step-body">
              <label className="checkin-field">
                <span>{t("phone")}*</span>
                <input
                  className="checkin-input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="e.g. 050 123 4567"
                  autoComplete="tel"
                  inputMode="tel"
                />
                <div className={`invite-feedback ${phoneLooksGood ? "invite-feedback-good" : ""}`}>
                  {phoneLooksGood ? t("looksGood") : t("phoneHelper")}
                </div>
              </label>

              <label className="checkin-field">
                <span>{t("email")}</span>
                <input
                  className="checkin-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
                <div className={`invite-feedback ${emailLooksGood ? "invite-feedback-good" : ""}`}>
                  {emailLooksGood ? t("looksGood") : t("emailHelper")}
                </div>
              </label>
            </div>
          )}

          {currentStep === 2 && (
            <div className="invite-step-body">
              <label className="checkin-field">
                <span>{t("status")}</span>
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
                <span>{t("dob")}</span>
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
                <span>{t("photo")}</span>
                <input
                  id="invite-photo-input"
                  className="checkin-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <div className="checkin-help-text">{t("photoHelper")}</div>
                {photoError && (
                  <div className="checkin-help-text" style={{ color: "#b91c1c" }}>
                    {photoError}
                  </div>
                )}
                {form.photoDataUrl ? (
                  <div className="invite-photo-preview">
                    <img src={form.photoDataUrl} alt="Selected" />
                    <button type="button" onClick={() => updateField("photoDataUrl", "")}>
                      Remove photo
                    </button>
                  </div>
                ) : null}
              </label>

              <label className="checkin-field">
                <span>{t("inviteToken")}*</span>
                <input
                  className="checkin-input"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Automatically filled from the link"
                  autoComplete="off"
                />
                <div className="checkin-help-text">{t("tokenHelper")}</div>
              </label>
            </div>
          )}

          {feedback.message && (
            <div className={`checkin-feedback checkin-feedback-${statusTone}`}>
              {feedback.message}
            </div>
          )}

          <div className="invite-actions">
            <button
              type="button"
              className="invite-secondary"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              {t("back")}
            </button>
            <button
              type="submit"
              className="invite-primary"
              disabled={
                isSubmitting ||
                (currentStep === 0 && !aboutYouReady) ||
                (currentStep === 1 && !contactReady)
              }
            >
              {currentStep === steps.length - 1
                ? isSubmitting
                  ? t("submitting")
                  : t("submit")
                : t("next")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
