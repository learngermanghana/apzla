import React from "react";
import LegalPageLayout from "./LegalPageLayout";

function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" updatedAt="September 15, 2024">
      <p>
        By accessing Apzla, you agree to these Terms of Service. If you do not
        agree, please do not use the platform.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Use of the service</h2>
      <ul>
        <li>Provide accurate account and church information.</li>
        <li>Use Apzla only for lawful ministry and administrative purposes.</li>
        <li>
          Keep credentials secure and ensure only authorized staff access your
          church data.
        </li>
      </ul>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Content ownership</h2>
      <p>
        You retain ownership of the data you upload. Apzla receives a limited
        license to host, store, and display that content in order to provide the
        service.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Payments & subscriptions</h2>
      <p>
        Subscription fees and billing terms are presented during checkout. Trial
        periods, renewals, and cancellations follow the plan selected for your
        church.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted access.
        Planned maintenance and unexpected outages may occur. You can view system
        status at <a href="/status">/status</a>.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Termination</h2>
      <p>
        You may cancel your account at any time. We may suspend or terminate
        accounts for violations of these terms or misuse of the platform.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Contact</h2>
      <p>
        If you have questions about these terms, email{" "}
        <a href="mailto:sedifexbiz@gmail.com">sedifexbiz@gmail.com</a>.
      </p>
      <p style={{ marginTop: "24px", fontSize: "14px", color: "#64748b" }}>
        See also: <a href="/privacy">Privacy Policy</a>
      </p>
    </LegalPageLayout>
  );
}

export default TermsPage;
