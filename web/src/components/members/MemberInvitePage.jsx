import React, { useEffect, useMemo, useState } from "react";
import "../checkin/checkin.css";
import StatusBanner from "../StatusBanner";
import { storage } from "../../firebase";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { resizeImageFile } from "../../utils/imageProcessing";


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

const translations = {
  en: {
    title: "Share your details",
    subtitle:
      "A leader invited you to join their community list. Fill this form to be added automatically.",
    language: "Language",
    welcome: "Welcome to your church family",
    note: "We will only use this to stay connected with you.",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    email: "Email",
    status: "Status",
    dob: "Date of birth",
    gender: "Gender",
    maritalStatus: "Marital status",
    baptized: "Have you been baptized?",
    familyTree: "Family members",
    familyTreeHelp:
      "Add each family member's name and phone number. We’ll save them for you.",
    familyMemberName: "Name",
    familyMemberPhone: "Phone",
    photo: "Upload your picture",
    optionalTitle: "Optional questions",
    optionalHelp: "You can skip these for now.",
    heardAbout: "How did you hear about us?",
    ministryInterest: "Ministry interest",
    prayerRequest: "Prayer request",
    inviteToken: "Invite token",
    tokenHelp: "The token from your link helps us connect you to the right church.",
    submit: "Send my details",
    submitting: "Submitting…",
    addFamilyMember: "Add family member",
    remove: "Remove",
  },
  // Other language translations fall back to English for new keys
  fr: {
    title: "Partagez vos informations",
    subtitle:
      "Un responsable vous a invité à rejoindre la liste de la communauté. Remplissez ce formulaire pour être ajouté automatiquement.",
    language: "Langue",
    welcome: "Bienvenue dans votre famille d'église",
    note: "Nous l'utiliserons uniquement pour rester en contact.",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone",
    email: "E-mail",
    status: "Statut",
    dob: "Date de naissance",
    gender: "Genre",
    maritalStatus: "Statut marital",
    baptized: "Avez-vous été baptisé(e) ?",
    familyTree: "Membres de la famille",
    familyTreeHelp: "Ajoutez le nom et le numéro de téléphone de chaque membre de la famille.",
    familyMemberName: "Nom",
    familyMemberPhone: "Téléphone",
    photo: "Télécharger votre photo",
    optionalTitle: "Questions facultatives",
    optionalHelp: "Vous pouvez les ignorer pour l'instant.",
    heardAbout: "Comment nous avez-vous connu ?",
    ministryInterest: "Intérêt pour les ministères",
    prayerRequest: "Sujet de prière",
    inviteToken: "Jeton d'invitation",
    tokenHelp: "Le jeton du lien nous relie à la bonne église.",
    submit: "Envoyer mes informations",
    submitting: "Envoi…",
    addFamilyMember: "Ajouter un membre",
    remove: "Retirer",
  },
  es: {
    title: "Comparte tus datos",
    subtitle:
      "Un líder te invitó a unirte a la lista de la comunidad. Completa este formulario para agregarte automáticamente.",
    language: "Idioma",
    welcome: "Bienvenido a tu familia de iglesia",
    note: "Solo lo usaremos para mantenernos en contacto.",
    firstName: "Nombre",
    lastName: "Apellido",
    phone: "Teléfono",
    email: "Correo",
    status: "Estado",
    dob: "Fecha de nacimiento",
    gender: "Género",
    maritalStatus: "Estado civil",
    baptized: "¿Has sido bautizado?",
    familyTree: "Miembros de la familia",
    familyTreeHelp: "Agregue el nombre y número de cada miembro.",
    familyMemberName: "Nombre",
    familyMemberPhone: "Teléfono",
    photo: "Sube tu foto",
    optionalTitle: "Preguntas opcionales",
    optionalHelp: "Puedes omitirlas por ahora.",
    heardAbout: "¿Cómo supiste de nosotros?",
    ministryInterest: "Interés ministerial",
    prayerRequest: "Petición de oración",
    inviteToken: "Token de invitación",
    tokenHelp: "El token del enlace nos conecta con la iglesia correcta.",
    submit: "Enviar mis datos",
    submitting: "Enviando…",
    addFamilyMember: "Añadir miembro",
    remove: "Eliminar",
  },
  twi: {
    title: "Kyɛ wo ho nsɛm",
    subtitle: "Ɔsɔfo bi frɛɛ wo sɛ wo mmra asafo no mu. Hyɛ krataa yi na yɛmmfa wo ho nka.",
    language: "Kasa",
    welcome: "Akwaaba wo asafo abusua mu",
    note: "Yɛde bɛka wo ho nko ara.",
    firstName: "Dzin a edi kan",
    lastName: "Dzin a edi akyi",
    phone: "Telefon",
    email: "Email",
    status: "Gyinae",
    dob: "Awo da",
    gender: "Gyinta",
    maritalStatus: "Warehom",
    baptized: "Wɔabɔ wo asuo mu?",
    familyTree: "Abusuafo",
    familyTreeHelp: "Fa abusuafo din ne namba to ho.",
    familyMemberName: "Din",
    familyMemberPhone: "Namba",
    photo: "Fa wo mfonini to so",
    optionalTitle: "Nsɛmmisa a ɛyɛ ɔpɛ",
    optionalHelp: "Wubetumi agyae wɔn seesei.",
    heardAbout: "Ɛhe na wotee yɛn ho?",
    ministryInterest: "Som mu anigye",
    prayerRequest: "Mpaebɔ asɛm",
    inviteToken: "Frɛ nkɔmhyɛ",
    tokenHelp: "Link no mu token no boa yɛn sɛ yɛbɛhu asafo no.",
    submit: "Fa me nsɛm mena",
    submitting: "Ɔde rekɔ…",
    addFamilyMember: "Ka abusuafo",
    remove: "Yi",
  },
  ewe: {
    title: "Nɔ wò ŋkɔ",
    subtitle:
      "Leaɖa aɖe ɖe wò ƒe nyagɔ me, kple wò nanɛ ŋutɔ me. Ɖe agbalẽ sia me be wò nyagɔ nakɔ.",
    language: "Gbe",
    welcome: "Wò nɔvi ƒe hame me wò va",
    note: "Míatsɔe aɖe wò ŋu ɖe leɖeɖe ŋu.",
    firstName: "Ŋkɔgbãtɔ",
    lastName: "Ŋkɔgake",
    phone: "Telefon",
    email: "E-mail",
    status: "Nɔƒe",
    dob: "Dzidzɔ ŋkeke",
    gender: "Zowò",
    maritalStatus: "Fomeɖeke sia/meɖeke sia",
    baptized: "Wò ŋɔe dzi wɔ baptizm ɖe?",
    familyTree: "ƒomeʋiwo",
    familyTreeHelp: "Tsɔ ŋkɔ kple telefon ŋu ta aɖe ɖe.",
    familyMemberName: "Ŋkɔ",
    familyMemberPhone: "Telefon",
    photo: "Tsɔ wò foto da ɖe",
    optionalTitle: "Nukpliwo",
    optionalHelp: "Àte ŋu anya asi le wò dzɔdzɔ me.",
    heardAbout: "Aleke wò se míaƒe nya?",
    ministryInterest: "Ŋusẽ dzi hã",
    prayerRequest: "Mawugbe",
    inviteToken: "Dɔmeɖoɖo",
    tokenHelp: "Tokɛn sia ka wò kple hame si gbɔ.",
    submit: "Ɖo wò nyagɔ ɖa",
    submitting: "Wò me…",
    addFamilyMember: "Tsɔ ɖo ŋusẽ",
    remove: "Yi",
  },
  ga: {
    title: "Fa wo ŋkɔ nɛ ɔkɛ",
    subtitle:
      "Ɔsɔfo bi frɛɛ wo sɛ wo mmra asafo no mu. Hye krataa yi na yɛmmfa wo ho nka.",
    language: "Kasa",
    welcome: "Akwaaba wo asafo abusua mu",
    note: "Yɛde bɛka wo ho nko ara.",
    firstName: "Dzin a edi kan",
    lastName: "Dzin a edi akyi",
    phone: "Telefon",
    email: "Email",
    status: "Gyinae",
    dob: "Awo da",
    gender: "Gyinta",
    maritalStatus: "Warehom",
    baptized: "Wɔabɔ wo asuo mu?",
    familyTree: "Abusuafo",
    familyTreeHelp: "Fa abusuafo din ne namba to ho.",
    familyMemberName: "Din",
    familyMemberPhone: "Namba",
    photo: "Fa wo mfonini to so",
    optionalTitle: "Nsɛmmisa a ɛyɛ ɔpɛ",
    optionalHelp: "Wubetumi agyae wɔn seesei.",
    heardAbout: "Ɛhe na wotee yɛn ho?",
    ministryInterest: "Som mu anigye",
    prayerRequest: "Mpaebɔ asɛm",
    inviteToken: "Frɛ nkɔmhyɛ",
    tokenHelp: "Link no mu token no boa yɛn sɛ yɛbɛhu asafo no.",
    submit: "Fa me nsɛm mena",
    submitting: "Ɔde rekɔ…",
    addFamilyMember: "Ka abusuafo",
    remove: "Yi",
  },
  de: {
    title: "Teile deine Angaben",
    subtitle:
      "Eine Leitungsperson hat dich eingeladen, der Gemeindeliste beizutreten. Fülle dieses Formular aus, um automatisch hinzugefügt zu werden.",
    language: "Sprache",
    welcome: "Willkommen in deiner Gemeindefamilie",
    note: "Wir nutzen das nur, um mit dir in Kontakt zu bleiben.",
    firstName: "Vorname",
    lastName: "Nachname",
    phone: "Telefon",
    email: "E-Mail",
    status: "Status",
    dob: "Geburtsdatum",
    gender: "Geschlecht",
    maritalStatus: "Familienstand",
    baptized: "Bist du getauft?",
    familyTree: "Familienmitglieder",
    familyTreeHelp: "Fügen Sie den Namen und die Nummer jedes Familienmitglieds hinzu.",
    familyMemberName: "Name",
    familyMemberPhone: "Telefon",
    photo: "Foto hochladen",
    optionalTitle: "Optionale Fragen",
    optionalHelp: "Du kannst sie vorerst überspringen.",
    heardAbout: "Wie hast du von uns gehört?",
    ministryInterest: "Dienstinteresse",
    prayerRequest: "Gebetsanliegen",
    inviteToken: "Einladungscode",
    tokenHelp: "Der Code aus deinem Link verbindet dich mit der richtigen Gemeinde.",
    submit: "Meine Angaben senden",
    submitting: "Senden…",
    addFamilyMember: "Familienmitglied hinzufügen",
    remove: "Entfernen",
  },
};

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
    // We keep familyTree for backwards compatibility but build it from familyMembers
    familyTree: "",
    photoFile: null,
    photoPreviewUrl: "",
    heardAbout: "",
    ministryInterest: "",
    prayerRequest: "",
    preferredLanguage: "en",
  });
  const [familyMembers, setFamilyMembers] = useState([
    { name: "", phone: "" },
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
    setFamilyMembers((prev) => [...prev, { name: "", phone: "" }]);
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

  // Handle image upload and preview. Wrap the resized blob as a File to preserve MIME type.
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { blob } = await resizeImageFile(file, {
        maxSize: 800,
        quality: 0.82,
      });
      // Create a new File so that file.type remains defined
      const compressedFile = new File([blob], file.name, { type: file.type });
      const previewUrl = URL.createObjectURL(compressedFile);
      setForm((prev) => ({
        ...prev,
        photoFile: compressedFile,
        photoPreviewUrl: previewUrl,
      }));
      setFeedback({ ok: false, message: "" });
      setStatusTone("info");
    } catch (err) {
      console.error("Invite photo load error", err);
      setFeedback({
        ok: false,
        message: err.message || "Unable to load that photo.",
      });
      setStatusTone("error");
    }
  };

  // Revoke object URLs when unmounting or changing the preview
  useEffect(() => {
    return () => {
      if (form.photoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(form.photoPreviewUrl);
      }
    };
  }, [form.photoPreviewUrl]);

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

    // Build the familyTree string from familyMembers for submission
    const familyTreeString = familyMembers
      .map((member) => {
        const name = member.name.trim();
        const phone = member.phone.trim();
        if (!name && !phone) return "";
        if (name && phone) return `${name}: ${phone}`;
        return name || phone;
      })
      .filter(Boolean)
      .join(", ");

    try {
      setIsSubmitting(true);
      let photoUrl = "";
      if (form.photoFile && storage) {
        const timestamp = Date.now();
        const fileRef = storageRef(
          storage,
          `member-invites/${trimmedToken}/${timestamp}_${form.photoFile.name}`
        );
        // Use the preserved MIME type to set contentType metadata. Without this,
        // Firebase defaults to application/octet-stream【987727374089957†L1668-L1674】.
        await uploadBytes(fileRef, form.photoFile, {
          contentType: form.photoFile.type,
        });
        photoUrl = await getDownloadURL(fileRef);
      }
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
          photoUrl,
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
        familyTree: "",
        photoFile: null,
        photoPreviewUrl: "",
        heardAbout: "",
        ministryInterest: "",
        prayerRequest: "",
      }));
      setFamilyMembers([{ name: "", phone: "" }]);
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

          <div className="checkin-field checkin-field-full">
            <span>{selectedLanguage.photo}</span>
            <div className="checkin-photo">
              <div className="checkin-photo-preview">
                {form.photoPreviewUrl ? (
                  <img src={form.photoPreviewUrl} alt="Profile preview" />
                ) : (
                  <div className="checkin-photo-placeholder">Add a photo</div>
                )}
              </div>
              <div className="checkin-photo-controls">
                <input
                  id="invite-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
                {form.photoPreviewUrl && (
                  <button
                    type="button"
                    className="checkin-photo-remove"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        photoFile: null,
                        photoPreviewUrl: "",
                      }))
                    }
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
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
