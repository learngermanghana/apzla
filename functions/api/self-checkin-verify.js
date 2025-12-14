const { admin, db, initError } = require("../lib/firestoreAdmin");
const { verifyJwt } = require("../lib/jwtHelpers");

const jwtSecret = process.env.CHECKIN_JWT_SECRET;

function normalizePhone(phone) {
  return `${phone || ""}`.trim();
}

function getTimestampMillis(ts) {
  if (!ts) return 0;
  // Firestore Timestamp
  if (typeof ts.toMillis === "function") return ts.toMillis();
  // Date string fallback
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

async function findMemberByPhone(churchId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const snap = await db
    .collection("members")
    .where("churchId", "==", churchId)
    .where("phone", "==", normalizedPhone)
    .limit(1)
    .get();

  return snap.empty ? null : snap.docs[0];
}

async function upsertAttendance({ memberId, churchId, serviceDate, serviceType }) {
  const key = `${serviceDate}_${serviceType}_${memberId}`;
  const ref = db.collection("memberAttendance").doc(key);

  const existing = await ref.get();
  if (existing.exists) return { alreadyPresent: true };

  await ref.set({
    memberId,
    churchId,
    serviceDate,
    serviceType,
    status: "PRESENT",
    source: "self-qr",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { alreadyPresent: false };
}

async function loadNonce(nonce) {
  if (!nonce) return null;
  const docRef = db.collection("checkinNonces").doc(nonce);
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
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

  // Accept both keys so old frontend builds still work
  const { token, phone, phoneNumber, serviceCode } = req.body || {};
  const normalizedPhone = normalizePhone(phone || phoneNumber);
  const normalizedServiceCode = `${serviceCode || ""}`.trim();

  if (!token || !normalizedPhone || !normalizedServiceCode) {
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
      message: "Token payload missing required fields.",
    });
  }

  // Optional: enforce SELF mode if you set it
  if (mode && mode !== "SELF") {
    return res.status(400).json({
      status: "error",
      message: "Token mode is not valid for self check-in.",
    });
  }

  // Validate nonce record + serviceCode
  const nonceRecord = await loadNonce(nonce);
  if (!nonceRecord) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or unknown check-in session (nonce).",
    });
  }

  if (nonceRecord.churchId !== churchId) {
    return res.status(401).json({
      status: "error",
      message: "Check-in session does not match this church.",
    });
  }

  if (`${nonceRecord.serviceDate || ""}` !== `${serviceDate}`) {
    return res.status(401).json({
      status: "error",
      message: "Check-in session does not match this service date.",
    });
  }

  if (nonceRecord.serviceType && `${nonceRecord.serviceType}` !== `${serviceType}`) {
    return res.status(401).json({
      status: "error",
      message: "Check-in session does not match this service type.",
    });
  }

  if (`${nonceRecord.serviceCode || ""}`.trim() !== normalizedServiceCode) {
    return res.status(401).json({
      status: "error",
      message: "Invalid service code.",
    });
  }

  const expiresAtMs = getTimestampMillis(nonceRecord.expiresAt);
  if (expiresAtMs && Date.now() > expiresAtMs) {
    return res.status(401).json({
      status: "error",
      message: "This check-in link has expired.",
    });
  }

  try {
    const memberDoc = await findMemberByPhone(churchId, normalizedPhone);

    if (!memberDoc) {
      return res.status(404).json({
        status: "error",
        message: "No member found for that phone number in this church.",
      });
    }

    const memberId = memberDoc.id;
    const attendanceResult = await upsertAttendance({
      memberId,
      churchId,
      serviceDate,
      serviceType,
    });

    // IMPORTANT: don’t “consume” the nonce for shared QR codes.
    // (Many members must use the same token + serviceCode.)

    return res.status(200).json({
      status: "success",
      data: { memberId, churchId, serviceDate, serviceType, ...attendanceResult },
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
