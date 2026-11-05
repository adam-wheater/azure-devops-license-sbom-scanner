import { ApprovalStatus, Ecosystem, LicenseCategory, PolicyAction } from "@/models/types";
import type { Tone } from "@/components/ui";

/**
 * Maps domain enums onto the design system's semantic tones so badges and
 * metric tiles never carry hard-coded colours.
 */
export function licenseCategoryTone(category: LicenseCategory): Tone {
  switch (category) {
    case LicenseCategory.Permissive:
      return "success";
    case LicenseCategory.WeakCopyleft:
      return "warn";
    case LicenseCategory.StrongCopyleft:
      return "danger";
    case LicenseCategory.Proprietary:
      return "neutral";
    case LicenseCategory.Unknown:
    default:
      return "danger";
  }
}

export function policyActionTone(action: PolicyAction): Tone {
  switch (action) {
    case PolicyAction.Allow:
      return "success";
    case PolicyAction.Warn:
      return "warn";
    case PolicyAction.Block:
    default:
      return "danger";
  }
}

export function approvalStatusTone(status: ApprovalStatus): Tone {
  switch (status) {
    case ApprovalStatus.Approved:
      return "success";
    case ApprovalStatus.AutoApproved:
      return "info";
    case ApprovalStatus.Unapproved:
    default:
      return "neutral";
  }
}

/** Stable ordering used to pick a categorical chart colour per ecosystem. */
export const ECOSYSTEM_ORDER: Ecosystem[] = Object.values(Ecosystem);

/** Index into `theme.chart` for an ecosystem swatch. */
export function ecosystemChartIndex(ecosystem: Ecosystem): number {
  const idx = ECOSYSTEM_ORDER.indexOf(ecosystem);
  return idx < 0 ? 0 : idx;
}
