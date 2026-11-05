import * as React from "react";
import { VersionInconsistency } from "@/models/types";
import { Card, EmptyState, IconSearch, Pill } from "./ui";

function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa && !pb) return a.localeCompare(b);
  if (!pa) return 1;
  if (!pb) return -1;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

interface InconsistencyViewProps {
  inconsistencies: VersionInconsistency[];
}

export const InconsistencyView: React.FC<InconsistencyViewProps> = ({ inconsistencies }) => {
  const [searchFilter, setSearchFilter] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!searchFilter) return inconsistencies;
    const lower = searchFilter.toLowerCase();
    return inconsistencies.filter(
      (inc) =>
        inc.packageName.toLowerCase().includes(lower) ||
        inc.ecosystem.toLowerCase().includes(lower) ||
        inc.entries.some(
          (e) => e.repoName.toLowerCase().includes(lower) || e.version.toLowerCase().includes(lower)
        )
    );
  }, [inconsistencies, searchFilter]);

  if (inconsistencies.length === 0) {
    return (
      <Card>
        <EmptyState title="Versions are consistent">
          No version inconsistencies detected across repositories.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div>
      <div className="ax-toolbar">
        <h2 className="ax-card__title" style={{ margin: 0 }}>
          Version Inconsistencies
        </h2>
        <span className="ax-muted" style={{ fontSize: 12 }}>
          {filtered.length} of {inconsistencies.length} packages
        </span>
        <span className="ax-spacer" />
        <label className="ax-search">
          <span className="ax-search__icon">
            <IconSearch />
          </span>
          <input
            type="search"
            className="ax-input"
            placeholder="Filter by package, ecosystem, or repo..."
            aria-label="Filter inconsistencies"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </label>
      </div>

      {filtered.map((inc) => {
        // Group entries by version so we can show which repos share the same version
        const versionToRepos = new Map<string, string[]>();
        for (const entry of inc.entries) {
          if (!versionToRepos.has(entry.version)) {
            versionToRepos.set(entry.version, []);
          }
          versionToRepos.get(entry.version)!.push(entry.repoName);
        }

        return (
          <Card
            key={`${inc.ecosystem}:${inc.packageName}`}
            flush
            title={<span className="ax-mono">{inc.packageName}</span>}
            hint={`${versionToRepos.size} versions across ${inc.entries.length} repos`}
            actions={
              <>
                <Pill tone="neutral">{inc.ecosystem}</Pill>
                <Pill tone={inc.hasMajorDifference ? "danger" : "warn"}>
                  {inc.hasMajorDifference ? "Major diff" : "Minor diff"}
                </Pill>
              </>
            }
          >
            <div className="ax-table-wrap">
              <table className="ax-table">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Version</th>
                    <th>Repositories</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(versionToRepos.entries())
                    .sort(([a], [b]) => compareSemver(a, b))
                    .map(([version, repos]) => (
                      <tr key={version}>
                        <td className="ax-mono" data-testid="inconsistency-version">
                          {version}
                        </td>
                        <td>
                          <div className="ax-row" style={{ gap: 4 }}>
                            {repos.map((repo) => (
                              <Pill key={repo} tone="neutral">
                                {repo}
                              </Pill>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <Card>
          <EmptyState title="No matches">No inconsistencies match the current filter.</EmptyState>
        </Card>
      )}
    </div>
  );
};
