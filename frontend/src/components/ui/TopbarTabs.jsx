import { Link } from "react-router-dom";

export function TopbarTabs({ tabs, activeTab }) {
  return (
    <div className="proto-topbar">
      <div className="proto-topbar-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.path}
            className={`proto-topbar-tab ${activeTab === tab.label ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
