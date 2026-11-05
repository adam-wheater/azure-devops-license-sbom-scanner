import * as React from "react";
import {
  RepoScanResult,
  Ecosystem,
  LicenseCategory,
  ApprovedPackagesRegistry,
} from "@/models/types";
import { useTheme } from "@/utils/theme";
import { ecosystemChartIndex, licenseCategoryTone } from "@/utils/tones";
import { DependencyTable } from "./DependencyTable";
import { PolicyViolations } from "./PolicyViolations";
import { SbomExport } from "./SbomExport";
import { ViewTab } from "./ControlBar";
import { Metric, Pill } from "./ui";

interface RepoDetailProps {
  repo: RepoScanResult;
  activeTab: ViewTab;
  searchTerm: string;
  allRepos: RepoScanResult[];
  approvalRegistry?: ApprovedPackagesRegistry;
}

export const RepoDetail: React.FC<RepoDetailProps> = ({
  repo,
  activeTab,
  searchTerm,
  allRepos,
  approvalRegistry,
}) => {
  const theme = useTheme();

  // Compute stats
  const ecosystemCounts = new Map<Ecosystem, number>();
  const categoryCounts = new Map<LicenseCategory, number>();

  for (const dep of repo.dependencies) {
    ecosystemCounts.set(dep.ecosystem, (ecosystemCounts.get(dep.ecosystem) || 0) + 1);
    categoryCounts.set(dep.licenseCategory, (categoryCounts.get(dep.licenseCategory) || 0) + 1);
  }

  const blockedCount = repo.violations.filter((v) => v.action === "block").length;
  const warnCount = repo.violations.filter((v) => v.action === "warn").length;

  return (
    <div style={{ minWidth: 0 }}>
      <div className="ax-metrics">
        <Metric label="Dependencies" value={repo.dependencies.length} />
        <Metric
          label="Blocked"
          value={blockedCount}
          tone={blockedCount > 0 ? "danger" : "success"}
        />
        <Metric label="Warnings" value={warnCount} tone={warnCount > 0 ? "warn" : "success"} />
        <Metric label="Files Scanned" value={repo.fileCount} />
      </div>

      <div className="ax-row ax-section">
        {Array.from(ecosystemCounts.entries()).map(([eco, count]) => (
          <Pill key={eco} tone="neutral" title={`${eco}: ${count}`}>
            <span
              className="ax-dot"
              style={{ color: theme.chart[ecosystemChartIndex(eco) % theme.chart.length] }}
            />
            {eco}: {count}
          </Pill>
        ))}
        {Array.from(categoryCounts.entries()).map(([cat, count]) => (
          <Pill key={cat} tone={licenseCategoryTone(cat)} title={`${cat}: ${count}`}>
            {cat}: {count}
          </Pill>
        ))}
      </div>

      {activeTab === "dependencies" && (
        <DependencyTable
          dependencies={repo.dependencies}
          searchTerm={searchTerm}
          repoName={repo.repoName}
          approvalRegistry={approvalRegistry}
        />
      )}
      {activeTab === "violations" && (
        <PolicyViolations violations={repo.violations} searchTerm={searchTerm} />
      )}
      {activeTab === "sbom" && <SbomExport repos={allRepos} selectedRepo={repo.repoName} />}
    </div>
  );
};
