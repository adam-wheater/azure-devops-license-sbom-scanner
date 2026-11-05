import * as React from "react";
import { LicenseCategory } from "@/models/types";
import { licenseCategoryTone } from "@/utils/tones";
import { Pill } from "./ui";

interface LicenseBadgeProps {
  license: string;
  category: LicenseCategory;
}

/**
 * License pill toned by category. The category is also announced as text so
 * the classification never depends on colour alone.
 */
export const LicenseBadge: React.FC<LicenseBadgeProps> = ({ license, category }) => (
  <Pill tone={licenseCategoryTone(category)} title={`${license} (${category})`}>
    {license}
    <span className="ax-sr-only"> ({category})</span>
  </Pill>
);
