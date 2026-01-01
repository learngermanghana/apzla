import React from "react";
import LegalPageLayout from "./LegalPageLayout";

function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updatedAt="September 15, 2024">
      <p>
        Apzla respects the privacy of every ministry and member using our
        platform. This policy explains what data we collect, how we use it, and
        the choices available to you.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> names, email addresses, and church
          contact information provided during signup.
        </li>
        <li>
          <strong>Church records:</strong> member profiles, attendance logs,
          giving records, and follow-up notes that you enter into Apzla.
        </li>
        <li>
          <strong>Usage data:</strong> device, browser, and log details used to
          maintain security and improve service reliability.
        </li>
      </ul>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>How we use data</h2>
      <ul>
        <li>Provide access to dashboards, records, and communication tools.</li>
        <li>Deliver receipts, giving links, and congregation follow-ups.</li>
        <li>Maintain system security, monitor uptime, and resolve support issues.</li>
      </ul>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Data sharing</h2>
      <p>
        We do not sell personal information. Data is only shared with trusted
        service providers (such as email or payment partners) to deliver
        Apzla’s features. We may also disclose information if legally required.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Security & retention</h2>
      <p>
        We use modern security practices and role-based access controls to
        protect church records. Data is retained while your account is active,
        or as required to meet legal obligations. You can request deletion or
        export at any time.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Your choices</h2>
      <p>
        You can update profile information, manage user access, and request
        exports by emailing{" "}
        <a href="mailto:sedifexbiz@gmail.com">sedifexbiz@gmail.com</a>.
      </p>

      <h2 style={{ marginTop: "24px", fontSize: "20px" }}>Contact us</h2>
      <p>
        Questions about this policy? Reach out to{" "}
        <a href="mailto:sedifexbiz@gmail.com">sedifexbiz@gmail.com</a>.
      </p>
      <p style={{ marginTop: "24px", fontSize: "14px", color: "#64748b" }}>
        See also: <a href="/terms">Terms of Service</a>
      </p>
    </LegalPageLayout>
  );
}

export default PrivacyPage;
