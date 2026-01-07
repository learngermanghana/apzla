import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import StatusBanner from "../../components/StatusBanner";
import { db } from "../../firebase";
import { normalizeBaseUrl, PREFERRED_BASE_URL } from "../../utils/baseUrl";
import "./sermons.css";

export default function PublicSermonDetailPage({ churchId, sermonId }) {
  const [church, setChurch] = useState(null);
  const [sermon, setSermon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return PREFERRED_BASE_URL;
    return normalizeBaseUrl(window.location.origin || PREFERRED_BASE_URL);
  }, []);

  useEffect(() => {
    if (!churchId || !sermonId) {
      setError("This sermon link is missing required details.");
      setLoading(false);
      return;
    }

    const loadSermon = async () => {
      try {
        setLoading(true);
        const [churchSnapshot, sermonSnapshot] = await Promise.all([
          getDoc(doc(db, "churches", churchId)),
          getDoc(doc(db, "sermons", sermonId)),
        ]);

        if (!churchSnapshot.exists()) {
          setError("We could not find this church. Please confirm the link.");
          return;
        }

        if (!sermonSnapshot.exists()) {
          setError("We could not find this sermon. Please confirm the link.");
          return;
        }

        const sermonData = { id: sermonSnapshot.id, ...sermonSnapshot.data() };
        if (sermonData.churchId !== churchId) {
          setError("This sermon link is not valid for the selected church.");
          return;
        }

        setChurch({ id: churchSnapshot.id, ...churchSnapshot.data() });
        setSermon(sermonData);
      } catch (err) {
        console.error("Load public sermon error:", err);
        setError("Unable to load this sermon right now. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadSermon();
  }, [churchId, sermonId]);

  if (loading) {
    return (
      <div className="sermon-public-page">
        <div className="sermon-public-card">
          <StatusBanner tone="info" message="Loading sermon…" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sermon-public-page">
        <div className="sermon-public-card">
          <StatusBanner tone="error" message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="sermon-public-page">
      <div className="sermon-public-card">
        <div className="sermon-public-header">
          <div>
            <p className="sermon-public-brand">Apzla Sermons</p>
            <h1>{sermon?.title || "Sermon"}</h1>
            <p className="sermon-public-subtitle">
              {church?.name || "Church sermons"} · {sermon?.date || ""}
            </p>
          </div>
          <a
            className="sermon-public-share"
            href={`${baseUrl.replace(/\/$/, "")}/sermons/${churchId}`}
          >
            Back to sermons
          </a>
        </div>

        <div className="sermon-public-details">
          <p>
            <span>Preacher:</span> {sermon?.preacher || "-"}
          </p>
          <p>
            <span>Series:</span> {sermon?.series || "-"}
          </p>
          <p>
            <span>Scripture:</span> {sermon?.scripture || "-"}
          </p>
          <p>
            <span>Notes:</span> {sermon?.notes || "-"}
          </p>
        </div>

        <div className="sermon-public-actions">
          {sermon?.link ? (
            <a href={sermon.link} target="_blank" rel="noreferrer">
              Watch / Listen
            </a>
          ) : (
            <span className="sermon-public-muted">No media link</span>
          )}
        </div>
      </div>
    </div>
  );
}
