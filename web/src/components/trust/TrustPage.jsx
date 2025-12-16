import React from "react";
import "./trust.css";

const NAV_ITEMS = [
  { key: "privacy", label: "Privacy", href: "/privacy" },
  { key: "terms", label: "Terms", href: "/terms" },
  { key: "contact", label: "Contact", href: "/contact" },
];

const CARD_COPY = {
  privacy: {
    title: "Privacy at Leta",
    subtitle:
      "We protect sensitive giving and ministry data with encryption, restricted access, and transparent retention policies.",
    points: [
      "Personal data includes account details, attendance check-ins, giving records, and contact information shared with Leta.",
      "Payment data is processed by Paystack; Leta only stores non-card details such as transaction reference, amount, and service context for reconciliation.",
      "Access is limited to authorized church admins, with regular monitoring and the ability to export or delete member data upon request.",
      "Data is retained only while a church has an active subscription, after which exports are offered before secure removal from active systems.",
    ],
  },
  terms: {
    title: "Terms & subscriptions",
    subtitle:
      "Leta is a subscription service for church administration and giving. You can cancel anytime from the admin account settings.",
    points: [
      "Subscription options: monthly at 100 GHS or yearly at 1,200 GHS (12 months). Charges renew automatically unless cancelled before the renewal date.",
      "Refunds are handled case-by-case for outages longer than 24 hours or billing mistakes. Contact us within 7 days of the charge so we can investigate.",
      "Online giving requires the church to maintain an active Paystack subaccount and comply with anti-fraud checks. We may pause processing if risks are detected.",
      "You agree not to misuse check-in tokens or invite links. Automated scraping or unauthorized exports are prohibited to protect member privacy.",
    ],
  },
  contact: {
    title: "Talk with our team",
    subtitle:
      "Questions about privacy, terms, or giving? Reach us for help, security concerns, or data requests.",
    contacts: [
      {
        label: "Email",
        value: "hello@apzla.com",
        href: "mailto:hello@apzla.com",
        helper: "Best for support, billing questions, and data requests.",
      },
      {
        label: "Phone",
        value: "+233 (0) 54 123 4567",
        helper: "Weekdays 9am–6pm GMT for urgent account issues.",
      },
      {
        label: "Status",
        value: "Service health",
        href: "/status",
        helper: "Check real-time uptime before reporting an incident.",
      },
    ],
  },
};

function TrustCard({ title, subtitle, children }) {
  return (
    <section className="trust-card">
      <div className="trust-card-header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="trust-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ContactList({ contacts }) {
  return (
    <div className="contact-grid">
      {contacts.map(({ label, value, href, helper }) => (
        <a key={label} className="contact-card" href={href || undefined}>
          <div className="contact-label">{label}</div>
          <div className="contact-value">{value}</div>
          <div className="contact-helper">{helper}</div>
        </a>
      ))}
    </div>
  );
}

export default function TrustPage({ page = "privacy" }) {
  const activePage = CARD_COPY[page] ? page : "privacy";
  const { privacy, terms, contact } = CARD_COPY;

  return (
    <div className="trust-shell">
      <div className="trust-hero">
        <p className="trust-eyebrow">Trust & compliance</p>
        <h1>{CARD_COPY[activePage].title}</h1>
        <p className="trust-subtitle">{CARD_COPY[activePage].subtitle}</p>

        <div className="trust-nav" role="navigation" aria-label="Trust navigation">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              className={`trust-nav-link ${activePage === item.key ? "active" : ""}`}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="trust-grid">
        <TrustCard title="Privacy" subtitle={privacy.subtitle}>
          <BulletList items={privacy.points} />
        </TrustCard>

        <TrustCard title="Terms" subtitle={terms.subtitle}>
          <BulletList items={terms.points} />
        </TrustCard>

        <TrustCard title="Contact" subtitle={contact.subtitle}>
          <ContactList contacts={contact.contacts} />
        </TrustCard>
      </div>

      <div className="trust-footnote">
        We built Leta with stewardship in mind. Giving data stays encrypted, and your
        subscription keeps support responsive—whether you choose the monthly plan at 100
        cedis or the annual plan at 1,200 cedis.
      </div>
    </div>
  );
}
