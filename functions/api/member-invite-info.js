const { db, initError } = require("../lib/firestoreAdmin");
const { verifyJwt } = require("../lib/jwtHelpers");

const jwtSecret =
  process.env.MEMBER_INVITE_JWT_SECRET || process.env.CHECKIN_JWT_SECRET || "";

const normalizeServiceTimes = (serviceTimes) => {
  if (Array.isArray(serviceTimes)) {
    return serviceTimes.map((item) => `${item}`.trim()).filter(Boolean);
  }

  if (typeof serviceTimes === "string") {
    return serviceTimes
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const buildMapUrls = (church) => {
  if (church?.mapUrl) {
    return { mapUrl: church.mapUrl, mapLink: church.mapUrl };
  }
  const address = [church?.address, church?.city, church?.country].filter(Boolean).join(", ");
  if (!address) return { mapUrl: "", mapLink: "" };
  const encoded = encodeURIComponent(address);
  return {
    mapUrl: `https://www.google.com/maps?q=${encoded}&output=embed`,
    mapLink: `https://www.google.com/maps?q=${encoded}`,
  };
};

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({
      status: "error",
      message: "Method not allowed. Use GET.",
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

  const token = `${request.query?.token || ""}`.trim();
  if (!token) {
    return response.status(400).json({
      status: "error",
      message: "Invite token is required.",
    });
  }

  let payload;
  try {
    payload = verifyJwt(token, jwtSecret);
  } catch (error) {
    return response.status(401).json({
      status: "error",
      message: error.message || "Invalid token.",
    });
  }

  if (payload.type !== "member-invite") {
    return response.status(400).json({
      status: "error",
      message: "This invite token is not valid for member signup.",
    });
  }

  try {
    const churchId = payload.churchId;
    const doc = await db.collection("churches").doc(churchId).get();
    if (!doc.exists) {
      return response.status(404).json({
        status: "error",
        message: "Church not found for this invite.",
      });
    }

    const data = doc.data() || {};
    const { mapUrl, mapLink } = buildMapUrls(data);
    const church = {
      name: data.name || "",
      address: data.address || "",
      city: data.city || "",
      country: data.country || "",
      phone: data.phone || "",
      pastorName: data.pastorName || "",
      logoUrl: data.logoUrl || "",
      brandColor: data.brandColor || data.primaryColor || "",
      welcomeMessage: data.welcomeMessage || "",
      serviceTimes: normalizeServiceTimes(data.serviceTimes || data.serviceSchedule),
      mapUrl,
      mapLink,
    };

    return response.status(200).json({
      status: "success",
      ok: true,
      church,
    });
  } catch (error) {
    return response.status(500).json({
      status: "error",
      message: error.message || "Unable to load church details.",
    });
  }
};
