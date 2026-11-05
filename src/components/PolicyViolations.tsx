import * as React from "react";
import { PolicyViolation, PolicyAction } from "@/models/types";
import { policyActionTone } from "@/utils/tones";
import { LicenseBadge } from "./LicenseBadge";
import { Card, EmptyState, Pill } from "./ui";

interface PolicyViolationsProps {
  violations: PolicyViolation[];
  searchTerm: string;
}

export const PolicyViolations: React.FC<PolicyViolationsProps> = ({ violations, searchTerm }) => {
  const filtered = React.useMemo(() => {
    if (!searchTerm) return violations;
    const lower = searchTerm.toLowerCase();
    return violations.filter(
      (v) =>
        v.dependency.name.toLowerCase().includes(lower) ||
        v.dependency.license.toLowerCase().includes(lower) ||
        v.repoName.toLowerCase().includes(lower)
    );
  }, [violations, searchTerm]);

  const blocked = filtered.filter((v) => v.action === PolicyAction.Block);
  const warned = filtered.filter((v) => v.action === PolicyAction.Warn);

  const renderGroup = (title: string, items: PolicyViolation[]) => (
    <Card title={`${title} (${items.length})`} flush>
      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Package</th>
              <th>License</th>
              <th>Repository</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr
                key={`${v.repoName}-${v.dependency.ecosystem}-${v.dependency.name}-${v.dependency.version}`}
              >
                <td>
                  <Pill tone={policyActionTone(v.action)}>{v.action.toUpperCase()}</Pill>
                </td>
                <td>
                  <div className="ax-mono">
                    <strong>{v.dependency.name}</strong>
                    <span className="ax-muted">@{v.dependency.version}</span>
                  </div>
                  <div className="ax-help">{v.reason}</div>
                </td>
                <td>
                  <LicenseBadge
                    license={v.dependency.license}
                    category={v.dependency.licenseCategory}
                  />
                </td>
                <td className="ax-muted" style={{ whiteSpace: "nowrap" }}>
                  {v.repoName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  if (filtered.length === 0) {
    return (
      <Card>
        <EmptyState title={violations.length === 0 ? "No policy violations" : "No matches"}>
          {violations.length === 0
            ? "No policy violations found. All dependencies comply with your license policy."
            : "No violations match the current search."}
        </EmptyState>
      </Card>
    );
  }

  return (
    <div>
      {blocked.length > 0 && renderGroup("Blocked", blocked)}
      {warned.length > 0 && renderGroup("Warnings", warned)}
    </div>
  );
};
