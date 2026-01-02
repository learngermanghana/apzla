import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import "./dataTransfer.css";

const CSV_FIELD_DEFS = [
  {
    key: "external_id",
    label: "External ID",
    required: false,
    description: "Unique ID from your previous system for matching records.",
    memberKey: "externalId",
  },
  {
    key: "first_name",
    label: "First name",
    required: true,
    description: "Member given name.",
    memberKey: "firstName",
  },
  {
    key: "last_name",
    label: "Last name",
    required: true,
    description: "Member family name.",
    memberKey: "lastName",
  },
  {
    key: "email",
    label: "Email",
    required: false,
    description: "Primary email used for matching on merge.",
    memberKey: "email",
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    description: "Primary phone number used for matching on merge.",
    memberKey: "phone",
  },
  {
    key: "status",
    label: "Status",
    required: false,
    description: "VISITOR, MEMBER, LEADER, or SERVANT.",
    memberKey: "status",
  },
  {
    key: "date_of_birth",
    label: "Date of birth",
    required: false,
    description: "Use YYYY-MM-DD (example: 1990-04-20).",
    memberKey: "dateOfBirth",
  },
  {
    key: "gender",
    label: "Gender",
    required: false,
    description: "FEMALE, MALE, NON_BINARY, or PREFER_NOT_TO_SAY.",
    memberKey: "gender",
  },
  {
    key: "marital_status",
    label: "Marital status",
    required: false,
    description: "SINGLE, MARRIED, SEPARATED, DIVORCED, WIDOWED.",
    memberKey: "maritalStatus",
  },
  {
    key: "baptized",
    label: "Baptized",
    required: false,
    description: "YES, NO, or NOT_YET.",
    memberKey: "baptized",
  },
  {
    key: "preferred_language",
    label: "Preferred language",
    required: false,
    description: "Language code (en, fr, es, twi, ewe, ga, de).",
    memberKey: "preferredLanguage",
  },
  {
    key: "ministry_interest",
    label: "Ministry interest",
    required: false,
    description: "Areas the member is open to serve.",
    memberKey: "ministryInterest",
  },
  {
    key: "heard_about",
    label: "Heard about",
    required: false,
    description: "How they discovered your church.",
    memberKey: "heardAbout",
  },
  {
    key: "prayer_request",
    label: "Prayer request",
    required: false,
    description: "Optional notes or prayer requests.",
    memberKey: "prayerRequest",
  },
];

const SAMPLE_ROW = {
  external_id: "EXT-1024",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  phone: "+233555010024",
  status: "MEMBER",
  date_of_birth: "1990-04-20",
  gender: "FEMALE",
  marital_status: "MARRIED",
  baptized: "YES",
  preferred_language: "en",
  ministry_interest: "Choir",
  heard_about: "Friend invite",
  prayer_request: "",
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (rows) =>
  rows.map((row) => row.map((value) => escapeCsvValue(value)).join(",")).join("\n");

const downloadCsv = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function DataTransferPage({ members }) {
  const [importMode, setImportMode] = useState("merge");
  const [selectedFile, setSelectedFile] = useState(null);

  const headers = useMemo(() => CSV_FIELD_DEFS.map((field) => field.key), []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleDownloadTemplate = () => {
    const csv = buildCsv([headers, headers.map((header) => SAMPLE_ROW[header] || "")]);
    downloadCsv(csv, "apzla-member-import-template.csv");
  };

  const handleDownloadExport = () => {
    const rows = (members || []).map((member) =>
      headers.map((header) => {
        const def = CSV_FIELD_DEFS.find((field) => field.key === header);
        if (!def) {
          return "";
        }
        return member?.[def.memberKey] ?? "";
      })
    );
    const csv = buildCsv([headers, ...rows]);
    downloadCsv(csv, "apzla-member-export.csv");
  };

  return (
    <div className="data-transfer">
      <div className="data-transfer__hero">
        <div>
          <p className="eyebrow">Data transfer</p>
          <h2>Import, merge, or export your member data</h2>
          <p className="data-transfer__subtitle">
            Move data in and out of APZLA with a clean CSV template. Upload from another
            platform, then choose whether to merge new records or override everything in
            your directory.
          </p>
        </div>
        <div className="data-transfer__actions">
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            Download CSV template
          </Button>
          <Button variant="primary" onClick={handleDownloadExport}>
            Export current data
          </Button>
        </div>
      </div>

      <div className="data-transfer__grid">
        <Card className="data-transfer__card">
          <h3>1) Upload your CSV</h3>
          <p>
            Drop in the file from your previous tool. We will read the header row to map
            each column correctly.
          </p>
          <div className="data-transfer__upload">
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <span>
              {selectedFile
                ? `Selected: ${selectedFile.name}`
                : "Choose a .csv file to begin."}
            </span>
          </div>
          <div className="data-transfer__toggle">
            <label>
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              Merge (recommended)
            </label>
            <label>
              <input
                type="radio"
                name="import-mode"
                value="override"
                checked={importMode === "override"}
                onChange={() => setImportMode("override")}
              />
              Override everything
            </label>
          </div>
          <div className="data-transfer__mode-help">
            {importMode === "merge" ? (
              <p>
                Merge keeps existing members and updates matches by <strong>external_id</strong>,
                email, or phone. New rows are added as fresh profiles.
              </p>
            ) : (
              <p>
                Override replaces your entire directory with the uploaded CSV. Use this when
                you trust the file as the single source of truth.
              </p>
            )}
          </div>
          <Button variant="ghost" disabled>
            Import (coming next)
          </Button>
        </Card>

        <Card className="data-transfer__card">
          <h3>2) Name your headers exactly</h3>
          <p>
            The header row must match the names below. Required columns are marked with
            a star. Dates should be formatted as <strong>YYYY-MM-DD</strong>.
          </p>
          <div className="data-transfer__table">
            <div className="data-transfer__table-header">
              <span>CSV header</span>
              <span>Description</span>
              <span>Required</span>
            </div>
            {CSV_FIELD_DEFS.map((field) => (
              <div key={field.key} className="data-transfer__table-row">
                <code>{field.key}</code>
                <span>{field.description}</span>
                <span>{field.required ? "★" : "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="data-transfer__card data-transfer__tips">
        <h3>3) Export anytime</h3>
        <p>
          Use the export button to download your current directory. Exported files keep the
          same header names so you can re-import them later or share with other tools.
        </p>
        <ul>
          <li>Keep only the columns you need—extra columns are ignored.</li>
          <li>Use consistent email or phone values to keep merge results clean.</li>
          <li>Save a copy of your original file before overriding data.</li>
        </ul>
      </Card>
    </div>
  );
}

DataTransferPage.propTypes = {
  members: PropTypes.arrayOf(PropTypes.object),
};

DataTransferPage.defaultProps = {
  members: [],
};
