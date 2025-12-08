import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import "./checkin.css";

function StatusBanner({ tone = "info", message }) {
  const palette = {
    success: { bg: "#ecfdf3", text: "#166534" },
    error: { bg: "#fef2f2", text: "#991b1b" },
    info: { bg: "#eff6ff", text: "#1d4ed8" },
  }[tone];

  return (
    <div
      className="checkin-banner"
      style={{ background: palette.bg, color: palette.text }}
    >
      {message}
    </div>
  );
}

export default function CheckinPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Enter your check-in link or token.");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token") || "";
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      handleVerify(tokenFromUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusTone = useMemo(() => {
    if (status === "success") return "success";
    if (status === "error") return "error";
    return "info";
  }, [status]);

  const handleVerify = async (incomingToken) => {
    const value = incomingToken || token;
    if (!value) {
      setMessage("Paste a token to continue.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage("Verifying your check-in link…");

    try {
      const res = await fetch("/api/verify-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });

      const body = await res.json().catch(() => ({ status: "error" }));

      if (!res.ok || body.status !== "success") {
        setStatus("error");
        setMessage(body.message || "Unable to verify token.");
        return;
      }

      const payload = body.data;
      const { memberId, churchId, serviceDate, serviceType } = payload;

      await recordAttendance({ memberId, churchId, serviceDate, serviceType });

      setStatus("success");
      setResult({ memberId, churchId, serviceDate, serviceType });
      setMessage("You are checked in. Enjoy the service!");
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Unexpected verification error.");
    }
  };

  const recordAttendance = async ({
    memberId,
    churchId,
    serviceDate,
    serviceType,
  }) => {
    const normalizedService = serviceType || "Service";
    const colRef = collection(db, "memberAttendance");
    const qExisting = query(
      colRef,
      where("churchId", "==", churchId),
      where("memberId", "==", memberId),
      where("date", "==", serviceDate),
      where("serviceType", "==", normalizedService)
    );

    const existingSnapshot = await getDocs(qExisting);
    if (!existingSnapshot.empty) {
      return;
    }

    await addDoc(colRef, {
      churchId,
      memberId,
      date: serviceDate,
      serviceType: normalizedService,
      checkedInAt: new Date().toISOString(),
      source: "SELF",
    });
  };

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <h1 className="checkin-title">Service check-in</h1>
        <p className="checkin-subtitle">
          Verify your link to mark attendance instantly.
        </p>

        <StatusBanner tone={statusTone} message={message} />

        {result && (
          <div className="checkin-details">
            <div>
              <div className="checkin-label">Member</div>
              <div className="checkin-value">{result.memberId}</div>
            </div>
            <div>
              <div className="checkin-label">Service date</div>
              <div className="checkin-value">{result.serviceDate}</div>
            </div>
            <div>
              <div className="checkin-label">Service</div>
              <div className="checkin-value">{result.serviceType}</div>
            </div>
          </div>
        )}

        <div className="checkin-form">
          <label htmlFor="token" className="checkin-label">
            Token
          </label>
          <textarea
            id="token"
            value={token}
            rows={3}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the ?token=... value from your link"
          />
          <button
            className="checkin-button"
            onClick={() => handleVerify()}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Checking…" : "Verify & check in"}
          </button>
        </div>
      </div>
    </div>
  );
}
