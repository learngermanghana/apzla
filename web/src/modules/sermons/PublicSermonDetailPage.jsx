import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import StatusBanner from "../../components/StatusBanner";
import { db } from "../../firebase";
import { normalizeBaseUrl, PREFERRED_BASE_URL } from "../../utils/baseUrl";
import {
  formatChurchSlug,
  normalizeChurchName,
  safeDecodeURIComponent,
} from "../../utils/churchSlug";
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
  const publicChurchKey = useMemo(() => {
    if (!church) return "";
    return church.publicSlug || formatChurchSlug(church.name || "") || church.id;
  }, [church]);

  useEffect(() => {
    if (!churchId || !sermonId) {
      setError("This sermon link is missing required details.");
      setLoading(false);
      return;
    }

    const loadSermon = async () => {
      try {
        setLoading(true);
        const decodedKey = safeDecodeURIComponent(churchId);
        const normalizedSlug = formatChurchSlug(decodedKey);
        const normalizedName = normalizeChurchName(decodedKey);
        let churchData = null;

        const churchSnapshot = await getDoc(doc(db, "churches", churchId));
        if (churchSnapshot.exists()) {
          churchData = { id: churchSnapshot.id, ...churchSnapshot.data() };
        }

        if (!churchData && normalizedSlug) {
          const slugQuery = query(
            collection(db, "churches"),
            where("publicSlug", "==", normalizedSlug),
            limit(1)
          );
          const slugSnapshot = await getDocs(slugQuery);
          if (!slugSnapshot.empty) {
            const slugDoc = slugSnapshot.docs[0];
            churchData = { id: slugDoc.id, ...slugDoc.data() };
          }
        }

        if (!churchData && normalizedName) {
          const nameQuery = query(
            collection(db, "churches"),
            where("nameLower", "==", normalizedName),
            limit(1)
          );
          const nameSnapshot = await getDocs(nameQuery);
          if (!nameSnapshot.empty) {
            const nameDoc = nameSnapshot.docs[0];
            churchData = { id: nameDoc.id, ...nameDoc.data() };
          }
        }

        if (!churchData && decodedKey) {
          const exactNameQuery = query(
            collection(db, "churches"),
            where("name", "==", decodedKey),
            limit(1)
          );
          const exactNameSnapshot = await getDocs(exactNameQuery);
          if (!exactNameSnapshot.empty) {
            const nameDoc = exactNameSnapshot.docs[0];
            churchData = { id: nameDoc.id, ...nameDoc.data() };
          }
        }

        if (!churchData) {
          setError("We could not find this church. Please confirm the link.");
          return;
        }

        let sermonData = null;

        if (sermonId === "latest") {
          const latestQuery = query(
            collection(db, "sermons"),
            where("churchId", "==", churchData.id),
            orderBy("date", "desc"),
            limit(1)
          );
          const latestSnapshot = await getDocs(latestQuery);
          if (latestSnapshot.empty) {
            setError("No sermons have been published yet. Please check back soon.");
            return;
          }
          const latestDoc = latestSnapshot.docs[0];
          sermonData = { id: latestDoc.id, ...latestDoc.data() };
        } else {
          const sermonSnapshot = await getDoc(doc(db, "sermons", sermonId));
          if (!sermonSnapshot.exists()) {
            setError("We could not find this sermon. Please confirm the link.");
            return;
          }
          sermonData = { id: sermonSnapshot.id, ...sermonSnapshot.data() };
          if (sermonData.churchId !== churchData.id) {
            setError("This sermon link is not valid for the selected church.");
            return;
          }
        }

        setChurch(churchData);
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
            href={`${baseUrl.replace(/\/$/, "")}/sermons/${publicChurchKey}`}
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
