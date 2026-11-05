import * as React from "react";
import {
  ResolvedDependency,
  Ecosystem,
  LicenseCategory,
  ApprovedPackagesRegistry,
  ApprovalStatus,
} from "@/models/types";
import { approvalStatusTone } from "@/utils/tones";
import { LicenseBadge } from "./LicenseBadge";
import { buildApprovalMap } from "@/utils/approvalChecker";
import { Button, Card, Pill, SortHeader } from "./ui";

interface DependencyTableProps {
  dependencies: ResolvedDependency[];
  searchTerm: string;
  repoName: string;
  approvalRegistry?: ApprovedPackagesRegistry;
}

type SortKey = "name" | "version" | "ecosystem" | "license" | "scope";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 100;

/** Natural ordering so "10.0.0" sorts after "2.0.0" in the version column. */
const versionCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export const DependencyTable: React.FC<DependencyTableProps> = ({
  dependencies,
  searchTerm,
  repoName,
  approvalRegistry,
}) => {
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [filterEcosystem, setFilterEcosystem] = React.useState<Ecosystem | "all">("all");
  const [filterCategory, setFilterCategory] = React.useState<LicenseCategory | "all">("all");
  const [filterApproval, setFilterApproval] = React.useState<ApprovalStatus | "all">("all");
  const [currentPage, setCurrentPage] = React.useState(0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const approvalMap = React.useMemo(() => {
    if (!approvalRegistry) return null;
    return buildApprovalMap(dependencies, approvalRegistry);
  }, [dependencies, approvalRegistry]);

  const filtered = React.useMemo(() => {
    let result = [...dependencies];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(lower) ||
          d.license.toLowerCase().includes(lower) ||
          d.version.toLowerCase().includes(lower)
      );
    }

    if (filterEcosystem !== "all") {
      result = result.filter((d) => d.ecosystem === filterEcosystem);
    }

    if (filterCategory !== "all") {
      result = result.filter((d) => d.licenseCategory === filterCategory);
    }

    if (filterApproval !== "all" && approvalMap) {
      result = result.filter((d) => {
        const key = `${d.name}::${d.ecosystem}::${d.version}`;
        return approvalMap.get(key) === filterApproval;
      });
    }

    result.sort((a, b) => {
      const aVal = String(a[sortKey] || "");
      const bVal = String(b[sortKey] || "");
      const cmp =
        sortKey === "version" ? versionCollator.compare(aVal, bVal) : aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    dependencies,
    searchTerm,
    filterEcosystem,
    filterCategory,
    filterApproval,
    approvalMap,
    sortKey,
    sortDir,
  ]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, filterEcosystem, filterCategory, filterApproval, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages - 1);
  const paginatedRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // The aggregated "All Repositories" view can hold the same package at the
  // same version from identically named files in different repos, so the
  // natural key is suffixed with an occurrence counter to stay unique.
  const rowKeys = React.useMemo(() => {
    const seen = new Map<string, number>();
    return paginatedRows.map((dep) => {
      const base = `${dep.name}-${dep.ecosystem}-${dep.version}-${dep.sourceFile}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return n === 0 ? base : `${base}#${n}`;
    });
  }, [paginatedRows]);

  const hasApproval = !!approvalMap;
  const colCount = hasApproval ? 7 : 6;

  const header = (label: string, key: SortKey) => (
    <SortHeader
      label={label}
      active={sortKey === key}
      direction={sortDir}
      onClick={() => handleSort(key)}
    />
  );

  return (
    <Card
      title="Dependencies"
      hint={repoName}
      flush
      actions={
        <span className="ax-muted" style={{ fontSize: 12 }}>
          {filtered.length} of {dependencies.length} dependencies
        </span>
      }
    >
      <div className="ax-toolbar" style={{ padding: "12px 16px 0" }}>
        <span className="ax-label">Filter:</span>
        <select
          className="ax-select"
          aria-label="Filter by ecosystem"
          value={filterEcosystem}
          onChange={(e) => setFilterEcosystem(e.target.value as Ecosystem | "all")}
        >
          <option value="all">All ecosystems</option>
          {Object.values(Ecosystem).map((eco) => (
            <option key={eco} value={eco}>
              {eco}
            </option>
          ))}
        </select>
        <select
          className="ax-select"
          aria-label="Filter by license type"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as LicenseCategory | "all")}
        >
          <option value="all">All license types</option>
          {Object.values(LicenseCategory).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {hasApproval && (
          <select
            className="ax-select"
            aria-label="Filter by approval"
            value={filterApproval}
            onChange={(e) => setFilterApproval(e.target.value as ApprovalStatus | "all")}
          >
            <option value="all">All approval</option>
            <option value={ApprovalStatus.Approved}>Approved</option>
            <option value={ApprovalStatus.AutoApproved}>Auto-approved</option>
            <option value={ApprovalStatus.Unapproved}>Unapproved</option>
          </select>
        )}
      </div>

      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              {header("Package", "name")}
              {header("Version", "version")}
              {header("Ecosystem", "ecosystem")}
              {header("License", "license")}
              {header("Scope", "scope")}
              <th>Source File</th>
              {hasApproval && <th>Approval</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((dep, i) => {
              const approvalKey = `${dep.name}::${dep.ecosystem}::${dep.version}`;
              const status = approvalMap?.get(approvalKey) ?? ApprovalStatus.Unapproved;
              return (
                <tr key={rowKeys[i]}>
                  <td className="ax-mono">
                    <strong>{dep.name}</strong>
                  </td>
                  <td className="ax-mono">{dep.version}</td>
                  <td>
                    <Pill tone="neutral">{dep.ecosystem}</Pill>
                  </td>
                  <td>
                    <LicenseBadge license={dep.license} category={dep.licenseCategory} />
                  </td>
                  <td className="ax-muted">{dep.scope}</td>
                  <td className="ax-muted">
                    <div className="ax-truncate" style={{ maxWidth: 200 }} title={dep.sourceFile}>
                      {dep.sourceFile}
                    </div>
                  </td>
                  {hasApproval && (
                    <td>
                      <Pill tone={approvalStatusTone(status)}>{status}</Pill>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={colCount} className="ax-center ax-muted">
                  No dependencies found matching the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="ax-pager" style={{ padding: "12px 16px" }}>
          <Button
            size="sm"
            disabled={page === 0}
            onClick={() => setCurrentPage(Math.max(0, page - 1))}
          >
            Prev
          </Button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setCurrentPage(Math.min(totalPages - 1, page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
};
