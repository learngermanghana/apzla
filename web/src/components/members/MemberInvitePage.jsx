import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import StatusBanner from "../StatusBanner";
import {
  db,
  firebaseConfigError,
  isFirebaseConfigured,
} from "../../firebase";
import { PREFERRED_BASE_URL, normalizeBaseUrl } from "../../utils/baseUrl";
import "./memberInvite.css";

const DEFAULT_STATUS = "VISITOR";

const normalizeInviteBase = () => {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : PREFERRED_BASE_URL;
  return normalizeBaseUrl(origin);
};

export default function MemberInvitePage({ churchId: churchIdProp = "" }) {
  const churchId = useMemo(() => {
    if (churchIdProp) return churchIdProp;

    const { pathname, search } = window.location;
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts[0] === "join" && pathParts[1]) {
      return pathParts[1];
    }

    const params = new URLSearchParams(search);
    return params.get("churchId") || "";
  }, [churchIdProp]);

  const [church, setChurch] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [status, setStatus] = useState({ tone: "info", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: DEFAULT_STATUS,
  });

  const inviteLink = useMemo(() => {
    const base = normalizeInviteBase();
    return churchId ? `${base}/join/${churchId}` : "";
  }, [churchId]);

  useEffect(() => {
    if (!churchId) {
      setStatus({
        tone: "error",
        message:
          "This link is missing the church ID. Please request a fresh invite from your church admin.",
      });
      setLoadingChurch(false);
      return;
    }

    if (!isFirebaseConfigured) {
      setStatus({ tone: "error", message: firebaseConfigError });
      setLoadingChurch(false);
      return;
    }

    const loadChurch = async () => {
      try {
        setLoadingChurch(true);
        const snapshot = await getDoc(doc(db, "churches", churchId));
        if (!snapshot.exists()) {
          setStatus({
            tone: "error",
            message:
              "We could not find this church. Please confirm the invite link with your church admin.",
          });
          return;
        }
        setChurch({ id: snapshot.id, ...snapshot.data() });
        setStatus({ tone: "info", message: "Fill your details so the church can stay in touch." });
      } catch (err) {
        console.error("Load church error:", err);
        setStatus({
          tone: "error",
          message: "Unable to load the church information right now. Please try again soon.",
        });
      } finally {
        setLoadingChurch(false);
      }
    };

    loadChurch();
  }, [churchId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedEmail = form.email.trim();
    const normalizedStatus = form.status || DEFAULT_STATUS;

    if (!trimmedFirstName || !trimmedPhone || !churchId) {
      setStatus({
        tone: "error",
        message:
          "Please provide at least your first name and phone number so we can contact you.",
      });
      return;
    }

    if (!isFirebaseConfigured || !db) {
      setStatus({ tone: "error", message: firebaseConfigError || "Firebase is not configured." });
      return;
    }

    try {
      setSubmitting(true);
      await addDoc(collection(db, "members"), {
        churchId,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        phone: trimmedPhone,
        email: trimmedEmail,
        status: normalizedStatus,
        createdAt: new Date().toISOString(),
        submittedViaInvite: true,
      });

      setForm({ firstName: "", lastName: "", phone: "", email: "", status: DEFAULT_STATUS });
      setStatus({
        tone: "success",
        message: "Thanks! Your details were sent to the church team.",
      });
    } catch (err) {
      console.error("Invite submission error:", err);
      setStatus({
        tone: "error",
        message: err.message || "We could not save your details. Please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="member-invite-shell">
      <div className="member-invite-card">
        <div className="member-invite-heading">
          <p className="eyebrow">Member invite</p>
          <h1>
            {loadingChurch ? "Loading church..." : church?.name || "Join this church"}
          </h1>
          <p className="member-invite-subtitle">
            Only your church admins can issue this invite link. Share accurate details so they can welcome you and stay
            connected.
          </p>
        </div>

        <StatusBanner tone={status.tone} message={status.message} />

        <div className="member-invite-link-box">
          <div className="member-invite-link-label">Invite link</div>
          <div className="member-invite-link-row">
            <input type="text" value={inviteLink} readOnly />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink);
                  setStatus({ tone: "success", message: "Invite link copied." });
                } catch {
                  setStatus({ tone: "error", message: "Could not copy the link." });
                }
              }}
              disabled={!inviteLink}
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={() => inviteLink && window.open(inviteLink, "_blank", "noopener,noreferrer")}
              disabled={!inviteLink}
            >
              Open link
            </button>
          </div>
        </div>

        <form className="member-invite-form" onSubmit={handleSubmit}>
          <div className="member-invite-row">
            <label>
              First name*
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </label>
            <label>
              Last name
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </label>
          </div>

          <div className="member-invite-row">
            <label>
              Phone number*
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </label>
            <label>
              Email (optional)
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </label>
          </div>

          <label className="member-invite-status">
            How should we tag you?
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="VISITOR">Visitor</option>
              <option value="NEW_CONVERT">New Convert</option>
              <option value="REGULAR">Regular</option>
              <option value="WORKER">Worker</option>
            </select>
          </label>

          <button type="submit" className="member-invite-submit" disabled={submitting || loadingChurch}>
            {submitting ? "Submitting..." : "Send my details"}
          </button>
        </form>
      </div>
    </div>
  );
}
