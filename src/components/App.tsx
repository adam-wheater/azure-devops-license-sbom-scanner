import * as React from "react";
import {
  FullScanResult,
  ScanProgress as ScanProgressType,
  LicenseCategory,
  Ecosystem,
  ApprovedPackageEntry,
} from "@/models/types";
import { ScanOrchestrator } from "@/scanning/ScanOrchestrator";
import { ScanCache } from "@/scanning/ScanCache";
import { usePolicySettings } from "@/hooks/usePolicySettings";
import { useApprovedPackages } from "@/hooks/useApprovedPackages";
import { useTheme } from "@/utils/theme";
import { ecosystemChartIndex, licenseCategoryTone } from "@/utils/tones";
import { BRAND, BrandGlyph } from "../brand";
import { ControlBar, ScanActions, ViewTab } from "./ControlBar";
import { RepoList } from "./RepoList";
import { RepoDetail } from "./RepoDetail";
import { ScanProgress } from "./ScanProgress";
import { PolicyViolations } from "./PolicyViolations";
import { DependencyTable } from "./DependencyTable";
import { SbomExport } from "./SbomExport";
import { PolicySettings } from "./PolicySettings";
import { LicenseGuide } from "./LicenseGuide";
import { ApprovedPackagesSettings } from "./ApprovedPackagesSettings";
import { InconsistencyView } from "./InconsistencyView";
import { AppShell, Banner, Button, Card, EmptyState, ErrorBoundary, Metric, Pill } from "./ui";

const CANCELLED_MESSAGE = "Scan cancelled.";

function AppInner() {
  const {
    loading: policyLoading,
    error: policyError,
    policy,
    savePolicy,
    resetToDefaults,
  } = usePolicySettings();
  const {
    loading: approvedLoading,
    error: approvedError,
    registry: approvedRegistry,
    saveRegistry: saveApprovedRegistry,
    resetToDefaults: resetApprovedDefaults,
  } = useApprovedPackages();

  const [scanResult, setScanResult] = React.useState<FullScanResult | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [progress, setProgress] = React.useState<ScanProgressType | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<ViewTab>("overview");
  const [searchTerm, setSearchTerm] = React.useState("");

  const scanGenRef = React.useRef(0);
  const approvedRegistryRef = React.useRef(approvedRegistry);
  React.useEffect(() => {
    approvedRegistryRef.current = approvedRegistry;
  }, [approvedRegistry]);

  const [autoApprovedCount, setAutoApprovedCount] = React.useState<number | null>(null);
  const orchestratorRef = React.useRef<ScanOrchestrator | null>(null);
  const scanCacheRef = React.useRef(new ScanCache());

  // Invalidate any in-flight scan when the hub unmounts so it cannot update state afterwards.
  React.useEffect(
    () => () => {
      scanGenRef.current++;
      orchestratorRef.current?.abort();
    },
    []
  );

  const handleCancel = React.useCallback(() => {
    orchestratorRef.current?.abort();
  }, []);

  const handleScan = React.useCallback(async () => {
    const gen = ++scanGenRef.current;
    setScanning(true);
    setScanError(null);
    setProgress(null);
    setScanResult(null);
    setSelectedRepo(null);
    setActiveTab("overview");
    setAutoApprovedCount(null);

    try {
      const orchestrator = new ScanOrchestrator(
        policy,
        (p) => {
          if (gen === scanGenRef.current) {
            setProgress(p);
          }
        },
        { cache: scanCacheRef.current }
      );
      orchestratorRef.current = orchestrator;
      const result = await orchestrator.scan();

      if (gen === scanGenRef.current) {
        setScanResult(result);
        setActiveTab("overview");

        // Auto-approve internal packages discovered during scan
        if (result.internalPackages.length > 0) {
          const currentRegistry = approvedRegistryRef.current;
          const existingNames = new Set(
            currentRegistry.packages.map((p) => `${p.ecosystem}::${p.name.toLowerCase()}`)
          );
          const newEntries: ApprovedPackageEntry[] = [];
          for (const pkg of result.internalPackages) {
            const key = `${pkg.ecosystem}::${pkg.name.toLowerCase()}`;
            if (!existingNames.has(key)) {
              existingNames.add(key);
              newEntries.push({
                name: pkg.name,
                ecosystem: pkg.ecosystem,
                approvedBy: "Auto-detected",
                approvedAt: new Date().toISOString(),
                reason: `Internal package (produced in ${pkg.repoName})`,
              });
            }
          }
          if (newEntries.length > 0) {
            void saveApprovedRegistry({
              ...currentRegistry,
              packages: [...currentRegistry.packages, ...newEntries],
            });
            setAutoApprovedCount(newEntries.length);
          }
        }
      }
    } catch (err) {
      if (gen === scanGenRef.current) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        if (isAbort) {
          setScanError(CANCELLED_MESSAGE);
        } else {
          setScanError(err instanceof Error ? err.message : String(err));
        }
      }
    } finally {
      if (gen === scanGenRef.current) {
        orchestratorRef.current = null;
        setScanning(false);
      }
    }
  }, [policy, saveApprovedRegistry]);

  const handleForceScan = React.useCallback(() => {
    scanCacheRef.current.clear();
    void handleScan();
  }, [handleScan]);

  const selectedRepoResult = scanResult?.repos.find((r) => r.repoName === selectedRepo) ?? null;

  // Aggregate all violations and dependencies across repos for the "all" views
  const allViolations = React.useMemo(
    () => scanResult?.repos.flatMap((r) => r.violations) ?? [],
    [scanResult]
  );
  const allDependencies = React.useMemo(
    () => scanResult?.repos.flatMap((r) => r.dependencies) ?? [],
    [scanResult]
  );

  const showsRepoSplit =
    !!scanResult &&
    (activeTab === "dependencies" || activeTab === "violations" || activeTab === "sbom");
  const showsEmptyState =
    activeTab !== "licenses" && activeTab !== "settings" && !scanResult && !scanning;

  return (
    <AppShell
      title={BRAND.name}
      subtitle={
        scanResult
          ? `Scanned ${scanResult.repos.length} repos in ${(scanResult.scanDurationMs / 1000).toFixed(1)}s`
          : BRAND.tagline
      }
      mark={<BrandGlyph />}
      actions={
        <ScanActions
          scanning={scanning}
          ready={!policyLoading && !approvedLoading}
          onScan={handleScan}
          onCancel={handleCancel}
          onForceScan={handleForceScan}
          hasResults={!!scanResult}
        />
      }
    >
      <ControlBar
        scanning={scanning}
        onScan={handleScan}
        onCancel={handleCancel}
        onForceScan={handleForceScan}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        hasResults={!!scanResult}
        totalDeps={scanResult?.totalDependencies ?? 0}
        totalViolations={scanResult?.totalViolations ?? 0}
        totalInconsistencies={scanResult?.inconsistencies.length ?? 0}
      />

      <div className="ax-stack" style={{ gap: 12, marginBottom: 16 }}>
        {scanning && progress && <ScanProgress progress={progress} />}

        {scanError === CANCELLED_MESSAGE && (
          <Banner tone="warn" onDismiss={() => setScanError(null)}>
            {CANCELLED_MESSAGE}
          </Banner>
        )}
        {scanError && scanError !== CANCELLED_MESSAGE && (
          <Banner tone="error" title="Scan failed" onDismiss={() => setScanError(null)}>
            {scanError}
          </Banner>
        )}

        {policyError && (
          <Banner tone="error" title="License policy could not be loaded or saved">
            {policyError} Scans use the default policy until this is resolved.
          </Banner>
        )}
        {approvedError && (
          <Banner tone="error" title="Approved packages could not be loaded or saved">
            {approvedError}
          </Banner>
        )}

        {autoApprovedCount !== null && autoApprovedCount > 0 && (
          <Banner tone="success" onDismiss={() => setAutoApprovedCount(null)}>
            {autoApprovedCount} new internal package{autoApprovedCount !== 1 ? "s were" : " was"}{" "}
            auto-approved.
          </Banner>
        )}
      </div>

      {activeTab === "licenses" && <LicenseGuide />}

      {showsEmptyState && (
        <Card>
          <EmptyState
            icon={<BrandGlyph size={26} />}
            title="License & SBOM Compliance Scanner"
            action={
              <Button
                variant="primary"
                onClick={handleScan}
                disabled={policyLoading || approvedLoading}
              >
                Scan All Repos
              </Button>
            }
          >
            Scan all repositories in this project for dependency licenses, policy violations, and
            generate CycloneDX SBOM documents. Click &quot;Scan All Repos&quot; to begin.
          </EmptyState>
        </Card>
      )}

      {activeTab === "settings" && (
        <div>
          <PolicySettings
            policy={policy}
            onSave={savePolicy}
            onReset={resetToDefaults}
            loading={policyLoading}
          />
          <ApprovedPackagesSettings
            registry={approvedRegistry}
            onSave={saveApprovedRegistry}
            onReset={resetApprovedDefaults}
            loading={approvedLoading}
          />
        </div>
      )}

      {scanResult && activeTab === "overview" && <OverviewPanel result={scanResult} />}

      {scanResult && activeTab === "inconsistencies" && (
        <InconsistencyView inconsistencies={scanResult.inconsistencies} />
      )}

      {showsRepoSplit && scanResult && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <RepoList
            repos={scanResult.repos}
            selectedRepo={selectedRepo}
            onSelectRepo={setSelectedRepo}
          />
          {selectedRepoResult ? (
            <RepoDetail
              repo={selectedRepoResult}
              activeTab={activeTab}
              searchTerm={searchTerm}
              allRepos={scanResult.repos}
              approvalRegistry={approvedRegistry}
            />
          ) : (
            <div style={{ minWidth: 0 }}>
              {activeTab === "dependencies" && (
                <DependencyTable
                  dependencies={allDependencies}
                  searchTerm={searchTerm}
                  repoName="All Repositories"
                  approvalRegistry={approvedRegistry}
                />
              )}
              {activeTab === "violations" && (
                <PolicyViolations violations={allViolations} searchTerm={searchTerm} />
              )}
              {activeTab === "sbom" && <SbomExport repos={scanResult.repos} selectedRepo={null} />}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

// Overview panel showing aggregate stats
function OverviewPanel({ result }: { result: FullScanResult }) {
  const theme = useTheme();

  // Aggregate stats
  const ecosystemTotals = new Map<Ecosystem, number>();
  const categoryTotals = new Map<LicenseCategory, number>();
  const blockedTotal = result.repos.reduce(
    (sum, r) => sum + r.violations.filter((v) => v.action === "block").length,
    0
  );
  const warnTotal = result.repos.reduce(
    (sum, r) => sum + r.violations.filter((v) => v.action === "warn").length,
    0
  );

  for (const repo of result.repos) {
    for (const dep of repo.dependencies) {
      ecosystemTotals.set(dep.ecosystem, (ecosystemTotals.get(dep.ecosystem) || 0) + 1);
      categoryTotals.set(dep.licenseCategory, (categoryTotals.get(dep.licenseCategory) || 0) + 1);
    }
  }

  const topRepos = result.repos.filter((r) => r.violations.length > 0).slice(0, 10);

  return (
    <div>
      <div className="ax-metrics">
        <Metric label="Repos Scanned" value={result.repos.length} />
        <Metric label="Total Dependencies" value={result.totalDependencies} />
        <Metric
          label="Policy Blocked"
          value={blockedTotal}
          tone={blockedTotal > 0 ? "danger" : "success"}
        />
        <Metric
          label="Policy Warnings"
          value={warnTotal}
          tone={warnTotal > 0 ? "warn" : "success"}
        />
        <Metric label="Scan Duration" value={`${(result.scanDurationMs / 1000).toFixed(1)}s`} />
      </div>

      <div className="ax-grid-2">
        <Card title="Dependencies by Ecosystem">
          <div className="ax-row">
            {Array.from(ecosystemTotals.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([eco, count]) => (
                <Pill key={eco} tone="neutral">
                  <span
                    className="ax-dot"
                    style={{ color: theme.chart[ecosystemChartIndex(eco) % theme.chart.length] }}
                  />
                  {eco}
                  <span className="ax-muted">{count}</span>
                </Pill>
              ))}
            {ecosystemTotals.size === 0 && <span className="ax-muted">No dependencies found.</span>}
          </div>
        </Card>

        <Card title="Dependencies by License Category">
          <div className="ax-row">
            {Array.from(categoryTotals.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <Pill key={cat} tone={licenseCategoryTone(cat)}>
                  {cat} <span className="ax-muted">{count}</span>
                </Pill>
              ))}
            {categoryTotals.size === 0 && <span className="ax-muted">No dependencies found.</span>}
          </div>
        </Card>
      </div>

      {result.totalViolations > 0 && (
        <Card title="Repos with Most Violations" flush>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th className="ax-num">Blocked</th>
                  <th className="ax-num">Warnings</th>
                  <th className="ax-num">Dependencies</th>
                </tr>
              </thead>
              <tbody>
                {topRepos.map((repo) => {
                  const blocked = repo.violations.filter((v) => v.action === "block").length;
                  const warned = repo.violations.filter((v) => v.action === "warn").length;
                  return (
                    <tr key={repo.repoName}>
                      <td>
                        <strong>{repo.repoName}</strong>
                      </td>
                      <td className="ax-num">
                        {blocked > 0 ? <Pill tone="danger">{blocked} blocked</Pill> : "—"}
                      </td>
                      <td className="ax-num">
                        {warned > 0 ? (
                          <Pill tone="warn">
                            {warned} {warned === 1 ? "warning" : "warnings"}
                          </Pill>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="ax-num ax-muted">{repo.dependencies.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <AppInner />
    </ErrorBoundary>
  );
}
