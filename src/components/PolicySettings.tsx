import * as React from "react";
import {
  LicenseCategory,
  PolicyAction,
  LicensePolicy,
  Ecosystem,
  ExcludedPackageEntry,
} from "@/models/types";
import { licenseCategoryTone, policyActionTone } from "@/utils/tones";
import { Button, Card, IconTrash, Pill } from "./ui";

interface PolicySettingsProps {
  policy: LicensePolicy;
  onSave: (policy: LicensePolicy) => Promise<void>;
  onReset: () => Promise<void>;
  loading: boolean;
}

export const PolicySettings: React.FC<PolicySettingsProps> = ({
  policy,
  onSave,
  onReset,
  loading,
}) => {
  const [localPolicy, setLocalPolicy] = React.useState<LicensePolicy>(policy);
  const [saving, setSaving] = React.useState(false);
  const [newOverrideLicense, setNewOverrideLicense] = React.useState("");
  const [newOverrideAction, setNewOverrideAction] = React.useState<PolicyAction>(PolicyAction.Warn);
  const [newExclusion, setNewExclusion] = React.useState("");
  const [newExclusionEcosystem, setNewExclusionEcosystem] = React.useState<Ecosystem | "">("");

  React.useEffect(() => {
    setLocalPolicy(policy);
  }, [policy]);

  const handleCategoryChange = (category: LicenseCategory, action: PolicyAction) => {
    setLocalPolicy((prev) => ({
      ...prev,
      categoryDefaults: { ...prev.categoryDefaults, [category]: action },
    }));
  };

  const addOverride = () => {
    const licenseId = newOverrideLicense.trim();
    if (!licenseId) return;
    setLocalPolicy((prev) => {
      // The policy engine only honours the first override for a license id, so
      // adding the same id again updates that entry instead of shadowing it.
      const existing = prev.specificOverrides.findIndex(
        (o) => o.licenseId.toLowerCase() === licenseId.toLowerCase()
      );
      const specificOverrides =
        existing >= 0
          ? prev.specificOverrides.map((o, i) =>
              i === existing ? { licenseId, action: newOverrideAction } : o
            )
          : [...prev.specificOverrides, { licenseId, action: newOverrideAction }];
      return { ...prev, specificOverrides };
    });
    setNewOverrideLicense("");
  };

  const removeOverride = (idx: number) => {
    setLocalPolicy((prev) => ({
      ...prev,
      specificOverrides: prev.specificOverrides.filter((_, i) => i !== idx),
    }));
  };

  const addExclusion = () => {
    const name = newExclusion.trim();
    if (!name) return;
    const entry: ExcludedPackageEntry = {
      name,
      ecosystem: newExclusionEcosystem || undefined,
    };
    setLocalPolicy((prev) => {
      const duplicate = prev.excludedPackages.some(
        (p) => p.name.toLowerCase() === name.toLowerCase() && p.ecosystem === entry.ecosystem
      );
      return duplicate ? prev : { ...prev, excludedPackages: [...prev.excludedPackages, entry] };
    });
    setNewExclusion("");
    setNewExclusionEcosystem("");
  };

  const removeExclusion = (idx: number) => {
    setLocalPolicy((prev) => ({
      ...prev,
      excludedPackages: prev.excludedPackages.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localPolicy);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = React.useMemo(() => {
    return JSON.stringify(localPolicy) !== JSON.stringify(policy);
  }, [localPolicy, policy]);

  const actionOptions = Object.values(PolicyAction).map((action) => (
    <option key={action} value={action}>
      {action}
    </option>
  ));

  return (
    <div>
      <Card
        title="License Policy"
        hint="Decide how each license category is treated when a scan runs"
        actions={
          <>
            {isDirty && <Pill tone="warn">Unsaved changes</Pill>}
            <Button onClick={onReset} disabled={saving || loading}>
              Reset to Defaults
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || loading}
              busy={saving}
            >
              {saving ? "Saving..." : "Save Policy"}
            </Button>
          </>
        }
        flush
      >
        <div className="ax-card__body" style={{ paddingBottom: 0 }}>
          <h3 className="ax-label" style={{ margin: 0 }}>
            Category Defaults
          </h3>
        </div>
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(LicenseCategory).map((category) => (
                <tr key={category}>
                  <td>
                    <Pill tone={licenseCategoryTone(category)}>{category}</Pill>
                  </td>
                  <td>
                    <select
                      className="ax-select"
                      aria-label={`Action for ${category} licenses`}
                      value={localPolicy.categoryDefaults[category]}
                      onChange={(e) =>
                        handleCategoryChange(category, e.target.value as PolicyAction)
                      }
                    >
                      {actionOptions}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Specific License Overrides"
        hint="Override the category default for individual SPDX license IDs"
        flush
      >
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>SPDX ID</th>
                <th>Action</th>
                <th className="ax-num">
                  <span className="ax-sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {localPolicy.specificOverrides.map((override, idx) => (
                <tr key={override.licenseId.toLowerCase()}>
                  <td className="ax-mono">{override.licenseId}</td>
                  <td>
                    <Pill tone={policyActionTone(override.action)}>{override.action}</Pill>
                  </td>
                  <td className="ax-num">
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<IconTrash />}
                      onClick={() => removeOverride(idx)}
                      aria-label={`Remove override for ${override.licenseId}`}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {localPolicy.specificOverrides.length === 0 && (
                <tr>
                  <td colSpan={3} className="ax-muted">
                    No overrides configured.
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
            addOverride();
          }}
        >
          <input
            type="text"
            className="ax-input"
            style={{ flex: "1 1 220px" }}
            placeholder="SPDX License ID (e.g., GPL-3.0-only)"
            aria-label="SPDX License ID"
            value={newOverrideLicense}
            onChange={(e) => setNewOverrideLicense(e.target.value)}
          />
          <select
            className="ax-select"
            aria-label="Override action"
            value={newOverrideAction}
            onChange={(e) => setNewOverrideAction(e.target.value as PolicyAction)}
          >
            {actionOptions}
          </select>
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
      </Card>

      <Card
        title="Excluded Packages"
        hint="Packages skipped entirely during policy evaluation"
        flush
      >
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Ecosystem</th>
                <th className="ax-num">
                  <span className="ax-sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {localPolicy.excludedPackages.map((pkg, idx) => (
                <tr key={`${pkg.name.toLowerCase()}-${pkg.ecosystem ?? "any"}`}>
                  <td className="ax-mono">{pkg.name}</td>
                  <td>
                    {pkg.ecosystem ? (
                      <Pill tone="neutral">{pkg.ecosystem}</Pill>
                    ) : (
                      <span className="ax-muted">all ecosystems</span>
                    )}
                  </td>
                  <td className="ax-num">
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<IconTrash />}
                      onClick={() => removeExclusion(idx)}
                      aria-label={`Remove exclusion for ${pkg.name}`}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {localPolicy.excludedPackages.length === 0 && (
                <tr>
                  <td colSpan={3} className="ax-muted">
                    No packages excluded.
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
            addExclusion();
          }}
        >
          <input
            type="text"
            className="ax-input"
            style={{ flex: "1 1 220px" }}
            placeholder="Package name to exclude"
            aria-label="Package name to exclude"
            value={newExclusion}
            onChange={(e) => setNewExclusion(e.target.value)}
          />
          <select
            className="ax-select"
            aria-label="Exclusion ecosystem"
            value={newExclusionEcosystem}
            onChange={(e) => setNewExclusionEcosystem(e.target.value as Ecosystem | "")}
          >
            <option value="">All ecosystems</option>
            {Object.values(Ecosystem).map((eco) => (
              <option key={eco} value={eco}>
                {eco}
              </option>
            ))}
          </select>
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
};
