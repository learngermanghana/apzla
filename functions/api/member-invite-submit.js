const { admin, db, initError } = require("../lib/firestoreAdmin");
const { verifyJwt } = require("../lib/jwtHelpers");

const jwtSecret =
  process.env.MEMBER_INVITE_JWT_SECRET || process.env.CHECKIN_JWT_SECRET || "";

const MAX_PHOTO_BYTES = 650 * 1024; // keep under Firestore 1 MiB doc limit

function estimateBase64Bytes(base64 = "") {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function sanitizePhotoDataUrl(photoDataUrlRaw) {
  const raw = `${photoDataUrlRaw || ""}`.trim();
  if (!raw) return "";

  // Expect: data:image/<type>;base64,<payload>
  if (!raw.startsWith("data:image/")) {
    throw new Error("Photo must be an image.");
  }
  if (!raw.includes(";base64,")) {
    throw new Error("Photo format is invalid.");
  }

  const base64 = raw.split(",")[1] || "";
  const bytes = estimateBase64Bytes(base64);

  if (!base64 || bytes <= 0) {
    throw new Error("Photo is empty or invalid.");
  }
  if (bytes > MAX_PHOTO_BYTES) {
    throw new Error("Photo is too large. Please use a smaller image.");
  }

  return raw;
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeFamilyMembers(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((member) => ({
      firstName: normalizeText(member?.firstName),
      lastName: normalizeText(member?.lastName),
      relationship: normalizeText(member?.relationship) || "CHILD",
    }))
    .filter((member) => member.firstName || member.lastName);
}

async function findExistingMember({ churchId, phone, email }) {
  if (!churchId) return null;

  const normalizedPhone = phone?.trim();
  const normalizedEmail = email?.trim()?.toLowerCase();

  const queries = [];

  if (normalizedPhone) {
    queries.push(
      db
        .collection("members")
        .where("churchId", "==", churchId)
        .where("phone", "==", normalizedPhone)
        .limit(1)
        .get()
    );
  }

  if (normalizedEmail) {
    queries.push(
      db
        .collection("members")
        .where("churchId", "==", churchId)
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get()
    );
  }

  if (queries.length === 0) return null;

  const snapshots = await Promise.all(queries);

  for (const snap of snapshots) {
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, data: doc.data() };
    }
  }

  return null;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      status: "error",
      message: "Method not allowed. Use POST.",
    });
  }

  if (initError) {
    return response.status(500).json({
      status: "error",
      message: initError.message || "Unable to initialize Firebase.",
    });
  }

  if (!jwtSecret) {
    return response.status(500).json({
      status: "error",
      message:
        "MEMBER_INVITE_JWT_SECRET (or CHECKIN_JWT_SECRET) environment variable is not configured.",
    });
  }

  const {
    token,
    firstName,
    lastName,
    phone,
    email,
    status,
    dateOfBirth,
    photoDataUrl,
    hearAboutUs,
    hearAboutUsOther,
    visitReason,
    visitReasonPrivate,
    wantsLeaderCall,
    preferredCallTime,
    familyMembers,
    journeyStatus,
    journeyNote,
  } = request.body || {};

  if (!token) {
    return response.status(400).json({
      status: "error",
      message: "Invite token is required.",
    });
  }

  const trimmedPhone = (phone || "").trim();
  const trimmedFirst = (firstName || "").trim();
  const trimmedLast = (lastName || "").trim();
  const trimmedEmail = (email || "").trim().toLowerCase();
  const trimmedDob = typeof dateOfBirth === "string" ? dateOfBirth.trim() : "";
  const normalizedHearAbout = normalizeText(hearAboutUs);
  const normalizedHearAboutOther = normalizeText(hearAboutUsOther);
  const normalizedVisitReason = normalizeText(visitReason);
  const normalizedPreferredCallTime = normalizeText(preferredCallTime);
  const normalizedJourneyNote = normalizeText(journeyNote);
  const journeyStatusProvided = normalizeText(journeyStatus);
  const normalizedJourneyStatus = journeyStatusProvided || "VISITOR";
  const normalizedFamilyMembers = sanitizeFamilyMembers(familyMembers);
  const callRequest = Boolean(wantsLeaderCall);

  if (!trimmedFirst && !trimmedLast) {
    return response.status(400).json({
      status: "error",
      message: "Please enter at least a first or last name.",
    });
  }

  if (!trimmedPhone && !trimmedEmail) {
    return response.status(400).json({
      status: "error",
      message: "Please enter a phone number or email so we can contact you.",
    });
  }

  let safePhoto = "";
  try {
    safePhoto = photoDataUrl ? sanitizePhotoDataUrl(photoDataUrl) : "";
  } catch (err) {
    return response.status(400).json({
      status: "error",
      message: err.message || "Photo is invalid.",
    });
  }

  try {
    const payload = verifyJwt(token, jwtSecret);

    if (payload.type !== "member-invite") {
      return response.status(400).json({
        status: "error",
        message: "This invite token is not valid for member signup.",
      });
    }

    const churchId = payload.churchId;

    const existing = await findExistingMember({
      churchId,
      phone: trimmedPhone,
      email: trimmedEmail,
    });

    const followupPayload = {
      ...(normalizedHearAbout ? { hearAboutUs: normalizedHearAbout } : {}),
      ...(normalizedHearAboutOther ? { hearAboutUsOther: normalizedHearAboutOther } : {}),
      ...(normalizedVisitReason ? { visitReason: normalizedVisitReason } : {}),
      ...(typeof visitReasonPrivate === "boolean"
        ? { visitReasonPrivate }
        : {}),
      ...(callRequest ? { wantsLeaderCall: true } : {}),
      ...(callRequest && normalizedPreferredCallTime
        ? { preferredCallTime: normalizedPreferredCallTime }
        : {}),
      ...(normalizedFamilyMembers.length ? { familyMembers: normalizedFamilyMembers } : {}),
    };

    // If they already exist, optionally attach the photo if they didn't have one.
    if (existing) {
      const journeyUpdates = {};
      if (journeyStatusProvided || normalizedJourneyNote) {
        const existingHistory = Array.isArray(existing.data?.journeyHistory)
          ? existing.data.journeyHistory
          : [];
        journeyUpdates.journeyStatus = normalizedJourneyStatus;
        journeyUpdates.journeyStatusAt = admin.firestore.FieldValue.serverTimestamp();
        journeyUpdates.journeyHistory = [
          ...existingHistory,
          {
            status: normalizedJourneyStatus,
            note: normalizedJourneyNote,
            timestamp: new Date().toISOString(),
          },
        ];
      }

      if (safePhoto && !existing.data?.photoDataUrl) {
        await db
          .collection("members")
          .doc(existing.id)
          .set(
            {
              photoDataUrl: safePhoto,
              ...followupPayload,
              ...journeyUpdates,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      } else if (
        Object.keys(followupPayload).length > 0 ||
        Object.keys(journeyUpdates).length > 0
      ) {
        await db
          .collection("members")
          .doc(existing.id)
          .set(
            {
              ...followupPayload,
              ...journeyUpdates,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      }

      return response.status(200).json({
        status: "success",
        ok: true,
        memberId: existing.id,
        message: "You are already on the list. Thank you for staying connected.",
      });
    }

    const payloadToSave = {
      churchId,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      phone: trimmedPhone,
      email: trimmedEmail,
      status: status || "VISITOR",
      journeyStatus: normalizedJourneyStatus,
      journeyStatusAt: admin.firestore.FieldValue.serverTimestamp(),
      journeyHistory: [
        {
          status: normalizedJourneyStatus,
          note: normalizedJourneyNote,
          timestamp: new Date().toISOString(),
        },
      ],
      ...(trimmedDob ? { dateOfBirth: trimmedDob } : {}),
      ...(safePhoto ? { photoDataUrl: safePhoto } : {}),
      ...(normalizedHearAbout ? { hearAboutUs: normalizedHearAbout } : {}),
      ...(normalizedHearAboutOther ? { hearAboutUsOther: normalizedHearAboutOther } : {}),
      ...(normalizedVisitReason ? { visitReason: normalizedVisitReason } : {}),
      ...(typeof visitReasonPrivate === "boolean"
        ? { visitReasonPrivate }
        : {}),
      ...(callRequest ? { wantsLeaderCall: true } : {}),
      ...(callRequest && normalizedPreferredCallTime
        ? { preferredCallTime: normalizedPreferredCallTime }
        : {}),
      ...(normalizedFamilyMembers.length ? { familyMembers: normalizedFamilyMembers } : {}),
      source: "INVITE",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("members").add(payloadToSave);

    return response.status(200).json({
      status: "success",
      ok: true,
      memberId: docRef.id,
      message: "Your details were received. Welcome!",
    });
  } catch (error) {
    const message = error.message || "Unable to process invite.";
    const statusCode = message.includes("expired") ? 410 : 400;
    return response.status(statusCode).json({
      status: "error",
      message,
    });
  }
};
