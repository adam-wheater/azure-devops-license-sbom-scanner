import * as React from "react";
import { RepoScanResult, LicenseCategory } from "@/models/types";
import { licenseCategoryTone } from "@/utils/tones";
import { Button, Card, EmptyState, IconDownload, Pill } from "./ui";

interface SbomExportProps {
  repos: RepoScanResult[];
  selectedRepo: string | null;
}

function triggerDownload(repo: RepoScanResult): void {
  const json = JSON.stringify(repo.sbom, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${repo.repoName}-sbom-cyclonedx.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const SbomExport: React.FC<SbomExportProps> = ({ repos, selectedRepo }) => {
  const [expandedRepo, setExpandedRepo] = React.useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = React.useState(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const displayRepos = selectedRepo ? repos.filter((r) => r.repoName === selectedRepo) : repos;

  const downloadAllSboms = async () => {
    // Download individual SBOM files sequentially (one per repo)
    setDownloadingAll(true);
    try {
      for (const repo of displayRepos) {
        if (repo.sbom.components.length === 0) continue;
        triggerDownload(repo);
        // Small delay between downloads to avoid browser throttling
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } finally {
      if (mounted.current) setDownloadingAll(false);
    }
  };

  return (
    <Card
      title="CycloneDX SBOM Export"
      hint="One CycloneDX 1.5 JSON document per repository"
      flush
      actions={
        !selectedRepo && displayRepos.length > 1 ? (
          <Button
            onClick={downloadAllSboms}
            disabled={downloadingAll}
            busy={downloadingAll}
            icon={<IconDownload />}
          >
            {downloadingAll ? "Downloading..." : "Download All SBOMs"}
          </Button>
        ) : undefined
      }
    >
      {displayRepos.length === 0 ? (
        <EmptyState title="Nothing to export">No repositories with dependencies found.</EmptyState>
      ) : (
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>Licenses</th>
                <th className="ax-num">Components</th>
                <th className="ax-num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRepos.map((repo) => {
                const isExpanded = expandedRepo === repo.repoName;
                const categoryCounts = new Map<LicenseCategory, number>();
                for (const dep of repo.dependencies) {
                  categoryCounts.set(
                    dep.licenseCategory,
                    (categoryCounts.get(dep.licenseCategory) || 0) + 1
                  );
                }
                const empty = repo.sbom.components.length === 0;

                return (
                  <React.Fragment key={repo.repoName}>
                    <tr>
                      <td>
                        <strong>{repo.repoName}</strong>
                      </td>
                      <td>
                        <div className="ax-row" style={{ gap: 4 }}>
                          {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                            <Pill
                              key={cat}
                              tone={licenseCategoryTone(cat)}
                              title={`${cat}: ${count}`}
                            >
                              {count}
                              <span className="ax-sr-only"> {cat}</span>
                            </Pill>
                          ))}
                        </div>
                      </td>
                      <td className="ax-num ax-muted">{repo.sbom.components.length} components</td>
                      <td className="ax-num">
                        <div className="ax-row" style={{ justifyContent: "flex-end" }}>
                          <Button
                            size="sm"
                            onClick={() => setExpandedRepo(isExpanded ? null : repo.repoName)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? "Hide" : "Preview"}
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<IconDownload />}
                            onClick={() => triggerDownload(repo)}
                            disabled={empty}
                          >
                            Download JSON
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} style={{ padding: 0 }}>
                          <pre
                            className="ax-diag__pre"
                            style={{ margin: 0, padding: 16, maxHeight: 400, overflowY: "auto" }}
                          >
                            {JSON.stringify(repo.sbom, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
