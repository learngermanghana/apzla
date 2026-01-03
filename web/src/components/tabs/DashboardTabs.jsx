import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";

export const DASHBOARD_TABS = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members (CRM)" },
  { id: "data", label: "Data transfer" },
  { id: "attendance", label: "Attendance" },
  { id: "checkin", label: "Check-in (Per Member)" },
  { id: "giving", label: "Giving (Tithes & Offerings)" },
  { id: "followup", label: "Follow-up" },
  { id: "sermons", label: "Sermons" },
];

function DashboardTabs({ activeTab, onTabChange, tabs = DASHBOARD_TABS }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeLabel = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab)?.label ?? "Menu";
  }, [activeTab, tabs]);

  const handleTabChange = (tabId) => {
    onTabChange(tabId);
    setIsMenuOpen(false);
  };

  return (
    <div className="dashboard-tabs">
      <div className="dashboard-tabs__mobile">
        <button
          type="button"
          className="dashboard-tabs__toggle"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
          aria-controls="dashboard-tabs-menu"
        >
          <span className="dashboard-tabs__toggle-label">{activeLabel}</span>
          <span className="dashboard-tabs__toggle-icon" aria-hidden>
            ☰
          </span>
        </button>
        {isMenuOpen && (
          <div
            id="dashboard-tabs-menu"
            className="dashboard-tabs__menu"
            role="menu"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleTabChange(tab.id)}
                  className={`dashboard-tabs__menu-item${
                    isActive ? " is-active" : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-tabs__scroll" aria-label="Dashboard navigation">
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
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
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
