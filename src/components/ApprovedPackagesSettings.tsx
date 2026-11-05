import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
  Ecosystem,
  ApprovedPackagesRegistry,
  ApprovedPackageEntry,
  AutoApprovalRule,
} from "@/models/types";
import { Button, Card, IconTrash, Pill } from "./ui";

interface ApprovedPackagesSettingsProps {
  registry: ApprovedPackagesRegistry;
  onSave: (registry: ApprovedPackagesRegistry) => Promise<void>;
  onReset: () => Promise<void>;
  loading: boolean;
}

let cachedUserName: string | null = null;

function getCurrentUser(): string {
  if (cachedUserName !== null) return cachedUserName;
  try {
    cachedUserName = SDK.getUser().displayName || "Unknown";
    return cachedUserName;
  } catch {
    return "Unknown";
  }
}

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
};

export const ApprovedPackagesSettings: React.FC<ApprovedPackagesSettingsProps> = ({
  registry,
  onSave,
  onReset,
  loading,
}) => {
  const [localRegistry, setLocalRegistry] = React.useState<ApprovedPackagesRegistry>(registry);
  const [saving, setSaving] = React.useState(false);

  // Auto-approval rule form
  const [newRulePattern, setNewRulePattern] = React.useState("");
  const [newRuleEcosystem, setNewRuleEcosystem] = React.useState<Ecosystem>(Ecosystem.NuGet);
  const [newRuleReason, setNewRuleReason] = React.useState("");

  // Approved package form
  const [newPkgName, setNewPkgName] = React.useState("");
  const [newPkgEcosystem, setNewPkgEcosystem] = React.useState<Ecosystem>(Ecosystem.NuGet);
  const [newPkgReason, setNewPkgReason] = React.useState("");

  React.useEffect(() => {
    setLocalRegistry(registry);
  }, [registry]);

  const isDirty = React.useMemo(
    () => JSON.stringify(localRegistry) !== JSON.stringify(registry),
    [localRegistry, registry]
  );

  const addRule = () => {
    const pattern = newRulePattern.trim();
    if (!pattern) return;
    const rule: AutoApprovalRule = {
      pattern,
      ecosystem: newRuleEcosystem,
      approvedBy: getCurrentUser(),
      approvedAt: new Date().toISOString(),
      reason: newRuleReason.trim() || "Auto-approval rule",
    };
    setLocalRegistry((prev) => {
      const duplicate = prev.autoApprovalRules.some(
        (r) => r.ecosystem === rule.ecosystem && r.pattern.toLowerCase() === pattern.toLowerCase()
      );
      return duplicate ? prev : { ...prev, autoApprovalRules: [...prev.autoApprovalRules, rule] };
    });
    setNewRulePattern("");
    setNewRuleReason("");
  };

  const removeRule = (idx: number) => {
    setLocalRegistry((prev) => ({
      ...prev,
      autoApprovalRules: prev.autoApprovalRules.filter((_, i) => i !== idx),
    }));
  };

  const addPackage = () => {
    const name = newPkgName.trim();
    if (!name) return;
    const entry: ApprovedPackageEntry = {
      name,
      ecosystem: newPkgEcosystem,
      approvedBy: getCurrentUser(),
      approvedAt: new Date().toISOString(),
      reason: newPkgReason.trim() || "Approved",
    };
    setLocalRegistry((prev) => {
      const duplicate = prev.packages.some(
        (p) => p.ecosystem === entry.ecosystem && p.name.toLowerCase() === name.toLowerCase()
      );
      return duplicate ? prev : { ...prev, packages: [...prev.packages, entry] };
    });
    setNewPkgName("");
    setNewPkgReason("");
  };

  const removePackage = (idx: number) => {
    setLocalRegistry((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localRegistry);
    } finally {
      setSaving(false);
    }
  };

  const ecosystemOptions = Object.values(Ecosystem).map((eco) => (
    <option key={eco} value={eco}>
      {eco}
    </option>
  ));

  return (
    <div>
      <Card
        title="Approved Packages"
        hint="Packages and patterns that count as approved in the dependency view"
        actions={
          <>
            {isDirty && <Pill tone="warn">Unsaved changes</Pill>}
            <Button variant="danger" onClick={onReset} disabled={saving || loading}>
              Clear All
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || loading}
              busy={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
        flush
      >
        <div className="ax-card__body" style={{ paddingBottom: 0 }}>
          <h3 className="ax-label" style={{ margin: 0 }}>
            Auto-Approval Rules
          </h3>
          <p className="ax-help" style={{ margin: "4px 0 0" }}>
            Use * as wildcard (e.g., Microsoft.*, System.*, @angular/*)
          </p>
        </div>
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Ecosystem</th>
                <th>Reason</th>
                <th>Approved</th>
                <th className="ax-num">
                  <span className="ax-sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {localRegistry.autoApprovalRules.map((rule, idx) => (
                <tr key={`${rule.pattern.toLowerCase()}-${rule.ecosystem}`}>
                  <td className="ax-mono">
                    <strong>{rule.pattern}</strong>
                  </td>
                  <td>
                    <Pill tone="neutral">{rule.ecosystem}</Pill>
                  </td>
                  <td className="ax-muted" title={rule.reason}>
                    {rule.reason}
                  </td>
                  <td className="ax-muted" style={{ whiteSpace: "nowrap" }}>
                    {rule.approvedBy} &middot; {formatDate(rule.approvedAt)}
                  </td>
                  <td className="ax-num">
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<IconTrash />}
                      onClick={() => removeRule(idx)}
                      aria-label={`Remove rule ${rule.pattern}`}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {localRegistry.autoApprovalRules.length === 0 && (
                <tr>
                  <td colSpan={5} className="ax-muted">
                    No auto-approval rules configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form
          className="ax-toolbar"
          style={{ padding: 16, marginBottom: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            addRule();
          }}
        >
          <input
            type="text"
            className="ax-input"
            style={{ flex: "1 1 160px" }}
            placeholder="Pattern (e.g., Microsoft.*)"
            aria-label="Rule pattern"
            value={newRulePattern}
            onChange={(e) => setNewRulePattern(e.target.value)}
          />
          <select
            className="ax-select"
            aria-label="Rule ecosystem"
            value={newRuleEcosystem}
            onChange={(e) => setNewRuleEcosystem(e.target.value as Ecosystem)}
          >
            {ecosystemOptions}
          </select>
          <input
            type="text"
            className="ax-input"
            style={{ flex: "1 1 140px" }}
            placeholder="Reason"
            aria-label="Rule reason"
            value={newRuleReason}
            onChange={(e) => setNewRuleReason(e.target.value)}
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
      </Card>

      <Card title="Individual Approved Packages" flush>
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Ecosystem</th>
                <th>Reason</th>
                <th>Approved</th>
                <th className="ax-num">
                  <span className="ax-sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {localRegistry.packages.map((pkg, idx) => (
                <tr key={`${pkg.name.toLowerCase()}-${pkg.ecosystem}`}>
                  <td className="ax-mono">
                    <strong>{pkg.name}</strong>
                  </td>
                  <td>
                    <Pill tone="neutral">{pkg.ecosystem}</Pill>
                  </td>
                  <td className="ax-muted" title={pkg.reason}>
                    {pkg.reason}
                  </td>
                  <td className="ax-muted" style={{ whiteSpace: "nowrap" }}>
                    {pkg.approvedBy} &middot; {formatDate(pkg.approvedAt)}
                  </td>
                  <td className="ax-num">
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<IconTrash />}
                      onClick={() => removePackage(idx)}
                      aria-label={`Remove approval for ${pkg.name}`}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {localRegistry.packages.length === 0 && (
                <tr>
                  <td colSpan={5} className="ax-muted">
                    No individually approved packages.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form
          className="ax-toolbar"
          style={{ padding: 16, marginBottom: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            addPackage();
          }}
        >
          <input
            type="text"
            className="ax-input"
            style={{ flex: "1 1 160px" }}
            placeholder="Package name"
            aria-label="Package name"
            value={newPkgName}
            onChange={(e) => setNewPkgName(e.target.value)}
          />
          <select
            className="ax-select"
            aria-label="Package ecosystem"
            value={newPkgEcosystem}
            onChange={(e) => setNewPkgEcosystem(e.target.value as Ecosystem)}
          >
            {ecosystemOptions}
          </select>
          <input
            type="text"
            className="ax-input"
            style={{ flex: "1 1 140px" }}
            placeholder="Reason"
            aria-label="Approval reason"
            value={newPkgReason}
            onChange={(e) => setNewPkgReason(e.target.value)}
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
};
