import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import StatusBanner from "../../components/StatusBanner";
import { db } from "../../firebase";
import { normalizeBaseUrl, PREFERRED_BASE_URL } from "../../utils/baseUrl";
import "./sermons.css";

function getPublicLink(baseUrl, churchId, sermonId) {
  if (!churchId || !sermonId) return "";
  return `${baseUrl.replace(/\/$/, "")}/sermons/${churchId}/${sermonId}`;
}

export default function PublicSermonsPage({ churchId }) {
  const [church, setChurch] = useState(null);
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return PREFERRED_BASE_URL;
    return normalizeBaseUrl(window.location.origin || PREFERRED_BASE_URL);
  }, []);

  useEffect(() => {
    if (!churchId) {
      setError("No church ID was provided in this link.");
      setLoading(false);
      return;
    }

    const loadPublicSermons = async () => {
      try {
        setLoading(true);
        const churchSnapshot = await getDoc(doc(db, "churches", churchId));

        if (!churchSnapshot.exists()) {
          setError("We could not find this church. Please confirm the link.");
          return;
        }

        const churchData = { id: churchSnapshot.id, ...churchSnapshot.data() };
        setChurch(churchData);

        const sermonQuery = query(
          collection(db, "sermons"),
          where("churchId", "==", churchSnapshot.id)
        );
        const sermonSnapshot = await getDocs(sermonQuery);
        const sermonData = sermonSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

        setSermons(sermonData);
      } catch (err) {
        console.error("Load public sermons error:", err);
        setError("Unable to load sermons right now. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadPublicSermons();
  }, [churchId]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredSermons = sermons.filter((sermon) => {
    if (!normalizedSearch) return true;
    return [
      sermon.date,
      sermon.title,
      sermon.preacher,
      sermon.series,
      sermon.scripture,
      sermon.notes,
    ].some((value) => (value || "").toLowerCase().includes(normalizedSearch));
  });

  if (loading) {
    return (
      <div className="sermon-public-page">
        <div className="sermon-public-card">
          <StatusBanner tone="info" message="Loading sermons…" />
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
            <h1>{church?.name || "Church Sermons"}</h1>
            <p className="sermon-public-subtitle">
              Stay up to date with the latest sermons, notes, and media links.
            </p>
          </div>
          <div className="sermon-public-meta">
            <span>{filteredSermons.length} sermon(s)</span>
          </div>
        </div>

        <div className="sermon-public-search">
          <input
            type="text"
            placeholder="Search sermons by title, preacher, or notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")}
            >
              Clear
            </button>
          )}
        </div>

        {sermons.length === 0 ? (
          <StatusBanner
            tone="info"
            message="No sermons have been published yet. Please check back soon."
          />
        ) : filteredSermons.length === 0 ? (
          <StatusBanner tone="info" message="No sermons match your search." />
        ) : (
          <div className="sermon-public-list">
            {filteredSermons.map((sermon) => (
              <div key={sermon.id} className="sermon-public-item">
                <div className="sermon-public-item-header">
                  <div>
                    <p className="sermon-public-date">{sermon.date || ""}</p>
                    <h3>{sermon.title || "Untitled sermon"}</h3>
                    {sermon.preacher && (
                      <p className="sermon-public-preacher">By {sermon.preacher}</p>
                    )}
                  </div>
                  <a
                    className="sermon-public-share"
                    href={getPublicLink(baseUrl, churchId, sermon.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Share
                  </a>
                </div>
                <div className="sermon-public-details">
                  <p>
                    <span>Series:</span> {sermon.series || "-"}
                  </p>
                  <p>
                    <span>Scripture:</span> {sermon.scripture || "-"}
                  </p>
                  <p>
                    <span>Notes:</span> {sermon.notes || "-"}
                  </p>
                </div>
                <div className="sermon-public-actions">
                  {sermon.link ? (
                    <a href={sermon.link} target="_blank" rel="noreferrer">
                      Watch / Listen
                    </a>
                  ) : (
                    <span className="sermon-public-muted">No media link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
