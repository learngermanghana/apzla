// functions/api/self-checkin-verify.js
const { admin, db, initError } = require("../lib/firestoreAdmin");
const { verifyJwt } = require("../lib/jwtHelpers");

const jwtSecret = process.env.CHECKIN_JWT_SECRET;

function sanitizeServiceType(serviceType = "Service") {
  return `${serviceType}`.trim().replace(/[^\w-]+/g, "_");
}

// Basic Ghana-friendly normalization (keeps it simple)
function normalizePhone(phoneRaw) {
  const p = `${phoneRaw || ""}`.trim();
  if (!p) return "";

  // remove spaces, dashes, parentheses, etc.
  let digits = p.replace(/[^\d+]/g, "");

  // allow +233XXXXXXXXX -> 0XXXXXXXXX
  if (digits.startsWith("+233")) digits = "0" + digits.slice(4);
  if (digits.startsWith("233")) digits = "0" + digits.slice(3);

  return digits;
}

async function findMemberByPhone(churchId, phoneRaw) {
  const trimmed = `${phoneRaw || ""}`.trim();
  const normalized = normalizePhone(phoneRaw);

  if (!trimmed && !normalized) return null;

  // Try exact match first
  if (trimmed) {
    const snap1 = await db
      .collection("members")
      .where("churchId", "==", churchId)
      .where("phone", "==", trimmed)
      .limit(1)
      .get();

    if (!snap1.empty) return snap1.docs[0];
  }

  // Fallback to normalized match
  if (normalized && normalized !== trimmed) {
    const snap2 = await db
      .collection("members")
      .where("churchId", "==", churchId)
      .where("phone", "==", normalized)
      .limit(1)
      .get();

    if (!snap2.empty) return snap2.docs[0];
  }

  return null;
}

async function upsertAttendance({ memberId, churchId, serviceDate, serviceType }) {
  const safeType = sanitizeServiceType(serviceType);
  const key = `${serviceDate}_${safeType}_${memberId}`;
  const ref = db.collection("memberAttendance").doc(key);
  const now = admin.firestore.Timestamp.now();

  const existing = await ref.get();
  if (existing.exists) {
    const existingData = existing.data() || {};
    const createdAt = existingData.createdAt || existingData.checkinAt;

    return {
      alreadyPresent: true,
      checkinAt: createdAt || now,
    };
  }

  await ref.set({
    memberId,
    churchId,
    serviceDate,
    serviceType,
    status: "PRESENT",
    source: "self-qr",
    createdAt: now,
    checkinAt: now,
  });

  return { alreadyPresent: false, checkinAt: now };
}

async function getNonceDoc(nonce) {
  if (!nonce) return null;

  // Most likely: docId === nonce
  const ref = db.collection("checkinNonces").doc(nonce);
  const docSnap = await ref.get();
  if (docSnap.exists) return docSnap;

  // Fallback: query by field (in case docId differs)
  const qs = await db
    .collection("checkinNonces")
    .where("nonce", "==", nonce)
    .limit(1)
    .get();

  return qs.empty ? null : qs.docs[0];
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Method not allowed. Use POST.",
    });
  }

  if (initError) {
    return res.status(500).json({
      status: "error",
      message: initError.message || "Unable to initialize Firebase.",
    });
  }

  // Accept both phone and phoneNumber (so your old frontend won’t break)
  const { token, phone, phoneNumber, serviceCode } = req.body || {};
  const phoneValue = `${phone || phoneNumber || ""}`.trim();
  const codeValue = `${serviceCode || ""}`.trim();

  if (!token || !phoneValue || !codeValue) {
    return res.status(400).json({
      status: "error",
      message: "token, phone, and serviceCode are required.",
    });
  }

  if (!jwtSecret) {
    return res.status(500).json({
      status: "error",
      message: "CHECKIN_JWT_SECRET environment variable is not configured.",
    });
  }

  let payload;
  try {
    payload = verifyJwt(token, jwtSecret);
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: error.message || "Invalid token.",
    });
  }

  const { churchId, serviceDate, serviceType = "Service", mode, nonce } = payload || {};

  if (!churchId || !serviceDate || !nonce) {
    return res.status(400).json({
      status: "error",
      message: "Token payload missing required fields (churchId, serviceDate, nonce).",
    });
  }

  if (mode && mode !== "SELF") {
    return res.status(400).json({
      status: "error",
      message: "Token mode is not valid for self check-in.",
    });
  }

  // ✅ Make service code matter: validate it against checkinNonces for this nonce
  const nonceDoc = await getNonceDoc(nonce);
  if (!nonceDoc) {
    return res.status(401).json({
      status: "error",
      message: "This check-in token is not recognized (nonce not found).",
    });
  }

  const nonceData = nonceDoc.data() || {};

  // Ensure the nonce belongs to the same service/church as the token claims
  if (nonceData.churchId && nonceData.churchId !== churchId) {
    return res.status(401).json({
      status: "error",
      message: "Token does not match this church.",
    });
  }

  if (nonceData.serviceDate && `${nonceData.serviceDate}` !== `${serviceDate}`) {
    return res.status(401).json({
      status: "error",
      message: "Token does not match this service date.",
    });
  }

  if (nonceData.serviceType && `${nonceData.serviceType}` !== `${serviceType}`) {
    return res.status(401).json({
      status: "error",
      message: "Token does not match this service type.",
    });
  }

  // Expiry check (if expiresAt stored as Firestore Timestamp)
  if (nonceData.expiresAt && typeof nonceData.expiresAt.toDate === "function") {
    const expiresAt = nonceData.expiresAt.toDate();
    if (expiresAt.getTime() < Date.now()) {
      return res.status(401).json({
        status: "error",
        message: "This check-in token has expired.",
      });
    }
  }

  const expectedCode = `${nonceData.serviceCode || ""}`.trim();
  if (!expectedCode || expectedCode !== codeValue) {
    return res.status(401).json({
      status: "error",
      message: "Invalid service code for this check-in token.",
    });
  }

  try {
    // ✅ Make phone matter: must match a member in this church
    const memberDoc = await findMemberByPhone(churchId, phoneValue);

    if (!memberDoc) {
      return res.status(404).json({
        status: "error",
        message: "No member found for that phone number in this church.",
      });
    }

    const memberId = memberDoc.id;
    const memberData = memberDoc.data() || {};

    const churchDoc = await db.collection("churches").doc(churchId).get();
    const churchData = churchDoc.exists ? churchDoc.data() || {} : {};

    const attendanceResult = await upsertAttendance({
      memberId,
      churchId,
      serviceDate,
      serviceType,
    });

    const checkinAtIso = attendanceResult.checkinAt?.toDate
      ? attendanceResult.checkinAt.toDate().toISOString()
      : null;

    const memberName =
      `${memberData.firstName || ""} ${memberData.lastName || ""}`.trim() ||
      memberData.fullName ||
      memberData.displayName ||
      "Member";

    const churchName =
      churchData.name || churchData.churchName || churchData.displayName || "Church";

    return res.status(200).json({
      status: "success",
      data: {
        memberId,
        memberName,
        memberPhone: phoneValue,
        churchId,
        churchName,
        serviceDate,
        serviceType,
        serviceCode: codeValue,
        checkinAt: checkinAtIso,
        ...attendanceResult,
      },
      message: attendanceResult.alreadyPresent
        ? "You are already checked in for this service."
        : "Check-in recorded successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Unable to verify self check-in.",
    });
  }
}

module.exports = handler;
