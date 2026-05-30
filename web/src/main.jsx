import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CheckinPage from "./components/checkin/CheckinPage.jsx";
import GivePage from "./components/giving/GivePage.jsx";
import MemberInvitePage from "./components/members/MemberInvitePage.jsx";
import StatusPage from "./components/status/StatusPage.jsx";
import OfflineNotice from "./components/ui/OfflineNotice.jsx";
import PrivacyPage from "./components/legal/PrivacyPage.jsx";
import TermsPage from "./components/legal/TermsPage.jsx";
import PublicSermonDetailPage from "./modules/sermons/PublicSermonDetailPage.jsx";
import PublicSermonsPage from "./modules/sermons/PublicSermonsPage.jsx";
import { registerServiceWorker } from "./serviceWorker";
import { enforcePreferredHost } from "./utils/baseUrl";
import "./index.css";

enforcePreferredHost();

const { pathname } = window.location;

const fallbackOncoContent = {
  services: [
    {
      title: "Germany Nursing Pathway Consultation",
      description:
        "One-on-one guidance for African nurses and applicants who want to understand the best Germany route for their background.",
      category: "Consultation",
      ctaLabel: "Book consultation",
      href: "/contact",
    },
    {
      title: "Nursing Ausbildung Guidance",
      description:
        "Support with requirements, German level, documents, school applications, timelines and realistic preparation steps.",
      category: "Ausbildung",
      ctaLabel: "Learn more",
      href: "/contact",
    },
    {
      title: "FSJ, BFD and Au-Pair Route Support",
      description:
        "Guidance for applicants considering volunteer, care-related or cultural exchange routes before starting nursing in Germany.",
      category: "Pathways",
      ctaLabel: "Ask for guidance",
      href: "/contact",
    },
    {
      title: "Recognition Support for Trained Nurses",
      description:
        "Document review and pathway advice for trained nurses exploring recognition, adaptation and work routes in Germany.",
      category: "Recognition",
      ctaLabel: "Start review",
      href: "/contact",
    },
  ],
  blog: [
    {
      title: "Nursing Ausbildung in Germany: What African Applicants Should Know",
      description:
        "A simple guide to German level, documents, training structure and preparation for nursing Ausbildung applicants.",
      category: "Nursing Ausbildung",
      href: "/blog",
    },
    {
      title: "FSJ and BFD as a Germany Pathway",
      description:
        "Understand how volunteer routes can help applicants gain experience and prepare for future training opportunities.",
      category: "FSJ / BFD",
      href: "/blog",
    },
    {
      title: "Recognition Route for Trained Nurses",
      description:
        "What trained nurses should prepare before starting the German recognition process.",
      category: "Recognition",
      href: "/blog",
    },
  ],
  events: [
    {
      title: "Germany Nursing Pathway Info Session",
      description:
        "Join an online session for African nurses interested in Ausbildung, FSJ, BFD, recognition and student visa pathways.",
      category: "Online Event",
      date: "Coming soon",
      href: "/contact",
      ctaLabel: "Join mailing list",
    },
  ],
};

function getSedifexBaseUrl() {
  const env = import.meta.env || {};
  return String(
    env.VITE_SEDIFEX_PUBLIC_API_BASE_URL ||
      env.VITE_SEDIFEX_CONTENT_BASE_URL ||
      env.VITE_SEDIFEX_API_URL ||
      env.VITE_SEDIFEX_BASE_URL ||
      ""
  ).replace(/\/$/, "");
}

function extractOncoItems(payload, section) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const keys = [
    section,
    "items",
    "data",
    "content",
    "results",
    "posts",
    "articles",
    "services",
    "events",
  ];

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === "object") {
      const nested = extractOncoItems(payload[key], section);
      if (nested.length) return nested;
    }
  }

  return [];
}

async function loadOncoContent(section) {
  const base = getSedifexBaseUrl();
  const names = section === "blog" ? ["blog", "posts", "articles"] : [section];
  const urls = [];

  names.forEach((name) => {
    if (base) {
      urls.push(`${base}/api/public/onconurse/${name}`);
      urls.push(`${base}/api/onconurse/${name}`);
      urls.push(`${base}/api/public-content?site=onconurse&type=${name}`);
      urls.push(`${base}/api/sedifex-content?site=onconurse&type=${name}`);
    }
    urls.push(`/api/public/onconurse/${name}`);
    urls.push(`/api/onconurse/${name}`);
    urls.push(`/api/public-content?site=onconurse&type=${name}`);
    urls.push(`/api/sedifex-content?site=onconurse&type=${name}`);
  });

  let lastError = "";

  for (const url of [...new Set(urls)]) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      const items = extractOncoItems(payload, section);
      if (items.length) return { items, source: "sedifex", error: "" };
      lastError = `No ${section} records found at ${url}`;
    } catch (error) {
      lastError = error.message;
    }
  }

  return {
    items: fallbackOncoContent[section] || [],
    source: "fallback",
    error: lastError,
  };
}

const pageCopy = {
  services: {
    eyebrow: "Services",
    title: "Germany nursing pathway support for African applicants",
    intro:
      "Explore Onco Nurse services for Ausbildung, FSJ, BFD, Au-Pair, recognition and document preparation.",
    empty: "No services have been published yet.",
  },
  blog: {
    eyebrow: "Blog",
    title: "Latest Germany pathway guides",
    intro:
      "Helpful articles from Onco Nurse. When Sedifex blog content is connected, this page updates automatically.",
    empty: "No blog posts have been published yet.",
  },
  events: {
    eyebrow: "Events",
    title: "Upcoming Onco Nurse sessions and events",
    intro:
      "Workshops, information sessions and consultation events for nurses preparing for Germany.",
    empty: "No events have been published yet.",
  },
};

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function getItemTitle(item) {
  return normalizeText(item.title || item.name || item.heading || item.serviceName || item.eventName, "Untitled");
}

function getItemDescription(item) {
  return normalizeText(item.description || item.summary || item.excerpt || item.body || item.details, "");
}

function PublicOncoPage({ section }) {
  const copy = pageCopy[section] || pageCopy.services;
  const [items, setItems] = useState(fallbackOncoContent[section] || []);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("fallback");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadOncoContent(section).then((result) => {
      if (!isMounted) return;
      setItems(result.items);
      setSource(result.source);
      setError(result.error || "");
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [section]);

  return (
    <main style={styles.pageShell}>
      <nav style={styles.navbar}>
        <a href="/" style={styles.logo}>Onco Nurse</a>
        <div style={styles.navLinks}>
          <a href="/services">Services</a>
          <a href="/blog">Blog</a>
          <a href="/events">Events</a>
          <a href="/contact">Contact</a>
        </div>
      </nav>

      <section style={styles.heroSection}>
        <span style={styles.eyebrow}>🇩🇪 🇬🇭 {copy.eyebrow}</span>
        <h1 style={styles.title}>{copy.title}</h1>
        <p style={styles.intro}>{copy.intro}</p>
        {loading ? <p style={styles.status}>Loading from Sedifex...</p> : null}
        {!loading && source === "fallback" ? (
          <p style={styles.status}>Showing starter content. Connect Sedifex API env variables to publish live content.</p>
        ) : null}
        {error && source === "fallback" ? <p style={styles.debug}>{error}</p> : null}
      </section>

      <section style={styles.gridSection}>
        {items.length ? (
          items.map((item, index) => {
            const href = item.href || item.url || item.link || (section === "blog" ? "/blog" : "/contact");
            const ctaLabel = item.ctaLabel || item.buttonText || (section === "events" ? "View event" : section === "blog" ? "Read article" : "Learn more");
            return (
              <article key={`${getItemTitle(item)}-${index}`} style={styles.card}>
                <span style={styles.category}>{item.category || item.tag || item.type || copy.eyebrow}</span>
                {item.date ? <p style={styles.date}>{item.date}</p> : null}
                <h2 style={styles.cardTitle}>{getItemTitle(item)}</h2>
                <p style={styles.cardText}>{getItemDescription(item)}</p>
                <a href={href} style={styles.cardLink}>{ctaLabel} →</a>
              </article>
            );
          })
        ) : (
          <p style={styles.empty}>{copy.empty}</p>
        )}
      </section>
    </main>
  );
}

const styles = {
  pageShell: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef8ff 0%, #f8fafc 45%, #ecfdf5 100%)",
    color: "#0f172a",
    fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
  },
  navbar: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "22px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  logo: {
    fontWeight: 800,
    fontSize: "22px",
    textDecoration: "none",
  },
  navLinks: {
    display: "flex",
    gap: "18px",
    fontSize: "14px",
    fontWeight: 700,
  },
  heroSection: {
    maxWidth: "920px",
    margin: "0 auto",
    padding: "74px 20px 34px",
    textAlign: "center",
  },
  eyebrow: {
    display: "inline-flex",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#075985",
    fontWeight: 800,
    fontSize: "13px",
  },
  title: {
    margin: "20px auto 14px",
    maxWidth: "820px",
    fontSize: "clamp(34px, 6vw, 64px)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
  },
  intro: {
    maxWidth: "720px",
    margin: "0 auto",
    color: "#475569",
    fontSize: "18px",
  },
  status: {
    marginTop: "18px",
    color: "#0369a1",
    fontWeight: 700,
  },
  debug: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "12px",
  },
  gridSection: {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "28px 20px 80px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    borderRadius: "26px",
    padding: "24px",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
  },
  category: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#ecfeff",
    color: "#0e7490",
    fontSize: "12px",
    fontWeight: 800,
  },
  date: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 700,
  },
  cardTitle: {
    margin: "16px 0 10px",
    fontSize: "22px",
    lineHeight: 1.16,
  },
  cardText: {
    color: "#475569",
    fontSize: "15px",
  },
  cardLink: {
    display: "inline-flex",
    marginTop: "14px",
    color: "#047857",
    fontWeight: 800,
    textDecoration: "none",
  },
  empty: {
    gridColumn: "1 / -1",
    textAlign: "center",
    color: "#64748b",
  },
};

// Accept both /checkin/... and /attendance/...
const isCheckinRoute =
  pathname === "/checkin" ||
  pathname.startsWith("/checkin/") ||
  pathname === "/attendance" ||
  pathname.startsWith("/attendance/");

const isStatusRoute = pathname === "/status" || pathname.startsWith("/status/");
const isGiveRoute = pathname === "/give" || pathname.startsWith("/give/");
const isMemberInviteRoute =
  pathname === "/member-invite" || pathname.startsWith("/member-invite/");
const isSermonsRoute = pathname === "/sermons" || pathname.startsWith("/sermons/");
const isPrivacyRoute = pathname === "/privacy" || pathname.startsWith("/privacy/");
const isTermsRoute = pathname === "/terms" || pathname.startsWith("/terms/");
const isServicesRoute = pathname === "/services" || pathname.startsWith("/services/");
const isBlogRoute = pathname === "/blog" || pathname.startsWith("/blog/");
const isEventsRoute = pathname === "/events" || pathname.startsWith("/events/");

function getSecondSegment(path) {
  // "/checkin/<token>" => "<token>"
  const parts = path.split("/").filter(Boolean); // removes empty
  return parts.length >= 2 ? parts[1] : null;
}

function getSermonSegments(path) {
  // "/sermons/<churchId>/<sermonId>" => { churchId, sermonId }
  const parts = path.split("/").filter(Boolean);
  return {
    churchId: parts.length >= 2 ? parts[1] : null,
    sermonId: parts.length >= 3 ? parts[2] : null,
  };
}

const checkinToken = isCheckinRoute ? getSecondSegment(pathname) : null;
const giveId = isGiveRoute ? getSecondSegment(pathname) : null;
const inviteToken = isMemberInviteRoute ? getSecondSegment(pathname) : null;
const { churchId: sermonsChurchId, sermonId } = isSermonsRoute
  ? getSermonSegments(pathname)
  : { churchId: null, sermonId: null };

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineNotice />
    {isServicesRoute ? (
      <PublicOncoPage section="services" />
    ) : isBlogRoute ? (
      <PublicOncoPage section="blog" />
    ) : isEventsRoute ? (
      <PublicOncoPage section="events" />
    ) : isCheckinRoute ? (
      <CheckinPage token={checkinToken} />
    ) : isGiveRoute ? (
      <GivePage id={giveId} />
    ) : isMemberInviteRoute ? (
      <MemberInvitePage token={inviteToken} />
    ) : isSermonsRoute ? (
      sermonId ? (
        <PublicSermonDetailPage churchId={sermonsChurchId} sermonId={sermonId} />
      ) : (
        <PublicSermonsPage churchId={sermonsChurchId} />
      )
    ) : isPrivacyRoute ? (
      <PrivacyPage />
    ) : isTermsRoute ? (
      <TermsPage />
    ) : isStatusRoute ? (
      <StatusPage />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

registerServiceWorker();
