import * as React from "react";
import { RepoScanResult, LicenseCategory } from "@/models/types";
import { useTheme } from "@/utils/theme";
import { licenseCategoryTone } from "@/utils/tones";
import { Card, Pill } from "./ui";

interface RepoListProps {
  repos: RepoScanResult[];
  selectedRepo: string | null;
  onSelectRepo: (repoName: string | null) => void;
}

export const RepoList: React.FC<RepoListProps> = ({ repos, selectedRepo, onSelectRepo }) => {
  const theme = useTheme();
  const totalDeps = repos.reduce((sum, r) => sum + r.dependencies.length, 0);

  const rowStyle = (selected: boolean): React.CSSProperties | undefined =>
    selected ? { background: theme.accentSoft } : undefined;

  const selectOnKey = (event: React.KeyboardEvent, repoName: string | null) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectRepo(repoName);
    }
  };

  return (
    <Card title={`Repositories (${repos.length})`} flush>
      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              <th>Repository</th>
              <th className="ax-num">Deps</th>
            </tr>
          </thead>
          <tbody>
            <tr
              tabIndex={0}
              role="button"
              aria-pressed={selectedRepo === null}
              style={{ cursor: "pointer", ...rowStyle(selectedRepo === null) }}
              onClick={() => onSelectRepo(null)}
              onKeyDown={(e) => selectOnKey(e, null)}
            >
              <td>
                <strong>All Repositories</strong>
              </td>
              <td className="ax-num">{totalDeps}</td>
            </tr>
            {repos.map((repo) => {
              const isSelected = repo.repoName === selectedRepo;
              const blockedCount = repo.violations.filter((v) => v.action === "block").length;
              const warnCount = repo.violations.filter((v) => v.action === "warn").length;

              // Count license categories for the mini breakdown
              const categoryCounts = new Map<LicenseCategory, number>();
              for (const dep of repo.dependencies) {
                categoryCounts.set(
                  dep.licenseCategory,
                  (categoryCounts.get(dep.licenseCategory) || 0) + 1
                );
              }

              return (
                <tr
                  key={repo.repoName}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  style={{ cursor: "pointer", ...rowStyle(isSelected) }}
                  onClick={() => onSelectRepo(repo.repoName)}
                  onKeyDown={(e) => selectOnKey(e, repo.repoName)}
                >
                  <td>
                    <div className="ax-truncate" title={repo.repoName}>
                      {repo.repoName}
                    </div>
                    <div className="ax-row" style={{ marginTop: 4, gap: 4 }}>
                      {blockedCount > 0 && <Pill tone="danger">{blockedCount} blocked</Pill>}
                      {warnCount > 0 && <Pill tone="warn">{warnCount} warn</Pill>}
                      {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                        <Pill key={cat} tone={licenseCategoryTone(cat)} title={`${cat}: ${count}`}>
                          {count}
                          <span className="ax-sr-only"> {cat}</span>
                        </Pill>
                      ))}
                    </div>
                  </td>
                  <td className="ax-num">{repo.dependencies.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
