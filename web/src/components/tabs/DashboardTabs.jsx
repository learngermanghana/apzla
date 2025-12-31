import React from "react";
import PropTypes from "prop-types";

export const DASHBOARD_TABS = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members (CRM)" },
  { id: "attendance", label: "Attendance" },
  { id: "checkin", label: "Check-in (Per Member)" },
  { id: "giving", label: "Giving (Tithes & Offerings)" },
  { id: "followup", label: "Follow-up" },
  { id: "sermons", label: "Sermons" },
];

function DashboardTabs({ activeTab, onTabChange, tabs = DASHBOARD_TABS }) {
  return (
    <div
      className="dashboard-tabs"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "20px",
        fontSize: "14px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background: isActive ? "#111827" : "#e5e7eb",
              color: isActive ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

DashboardTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
};

export default DashboardTabs;
