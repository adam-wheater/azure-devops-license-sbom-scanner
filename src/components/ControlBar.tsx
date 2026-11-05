import * as React from "react";
import { Button, IconPlay, IconRefresh, IconSearch, IconStop, Tabs } from "./ui";

export type ViewTab =
  | "overview"
  | "dependencies"
  | "violations"
  | "inconsistencies"
  | "sbom"
  | "settings"
  | "licenses";

interface ControlBarProps {
  scanning: boolean;
  onScan: () => void;
  onCancel?: () => void;
  onForceScan?: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  hasResults: boolean;
  totalDeps: number;
  totalViolations: number;
  totalInconsistencies: number;
}

const SEARCHABLE_TABS: ViewTab[] = ["dependencies", "violations", "inconsistencies"];

/**
 * Scan / cancel / full re-scan buttons. Rendered in the page header actions.
 * `ready` is false until the saved policy and approved packages have loaded: a
 * scan started before then would silently judge everything by the defaults.
 */
export const ScanActions: React.FC<
  Pick<ControlBarProps, "scanning" | "onScan" | "onCancel" | "onForceScan" | "hasResults"> & {
    ready?: boolean;
  }
> = ({ scanning, onScan, onCancel, onForceScan, hasResults, ready = true }) => (
  <>
    {!scanning && hasResults && onForceScan && (
      <Button
        onClick={onForceScan}
        disabled={!ready}
        icon={<IconRefresh />}
        title="Ignore cached results"
      >
        Full Re-scan
      </Button>
    )}
    {scanning && onCancel && (
      <Button variant="danger" onClick={onCancel} icon={<IconStop />}>
        Cancel
      </Button>
    )}
    <Button
      variant="primary"
      onClick={onScan}
      disabled={scanning || !ready}
      busy={scanning}
      icon={<IconPlay />}
    >
      {scanning ? "Scanning..." : hasResults ? "Re-scan" : "Scan All Repos"}
    </Button>
  </>
);

export const ControlBar: React.FC<ControlBarProps> = ({
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  hasResults,
  totalDeps,
  totalViolations,
  totalInconsistencies,
}) => {
  const tabs: { id: ViewTab; label: string; count?: number }[] = hasResults
    ? [
        { id: "overview", label: "Overview" },
        { id: "dependencies", label: "Dependencies", count: totalDeps },
        { id: "violations", label: "Violations", count: totalViolations },
        { id: "inconsistencies", label: "Inconsistencies", count: totalInconsistencies },
        { id: "sbom", label: "SBOM" },
      ]
    : [];
  tabs.push({ id: "settings", label: "Settings" }, { id: "licenses", label: "License Guide" });

  return (
    <div className="ax-toolbar">
      <Tabs
        tabs={tabs}
        active={activeTab}
        onChange={(id) => onTabChange(id as ViewTab)}
        aria-label="Views"
      />
      <span className="ax-spacer" />
      {hasResults && SEARCHABLE_TABS.includes(activeTab) && (
        <label className="ax-search">
          <span className="ax-search__icon">
            <IconSearch />
          </span>
          <input
            type="search"
            className="ax-input"
            placeholder="Search packages..."
            aria-label="Search packages"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
      )}
    </div>
  );
};
