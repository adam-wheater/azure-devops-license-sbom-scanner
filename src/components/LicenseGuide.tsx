import * as React from "react";
import { LicenseCategory, PolicyAction } from "@/models/types";
import { LICENSE_CATEGORIES } from "@/models/LicenseRegistry";
import { licenseCategoryTone, policyActionTone } from "@/utils/tones";
import { Card, EmptyState, IconSearch, Pill } from "./ui";

interface LicenseInfo {
  name: string;
  summary: string;
}

const LICENSE_INFO: Record<string, LicenseInfo> = {
  MIT: {
    name: "MIT License",
    summary:
      "Very permissive. Allows commercial use, modification, and distribution with minimal restrictions. Just keep the copyright notice.",
  },
  "MIT-CMU": {
    name: "MIT CMU License",
    summary:
      "MIT variant from Carnegie Mellon. Same permissive terms as MIT with minor wording differences.",
  },
  "Apache-2.0": {
    name: "Apache License 2.0",
    summary:
      "Permissive with patent grant. Allows commercial use; requires preserving notices and stating changes. Includes explicit patent license.",
  },
  "BSD-2-Clause": {
    name: "BSD 2-Clause (Simplified)",
    summary:
      "Permissive. Allows commercial use and redistribution with two conditions: retain copyright notice and disclaimer.",
  },
  "BSD-3-Clause": {
    name: "BSD 3-Clause (New/Revised)",
    summary:
      "Permissive. Like BSD-2-Clause plus a clause preventing use of the author's name for endorsement without permission.",
  },
  ISC: {
    name: "ISC License",
    summary:
      "Functionally equivalent to MIT/BSD-2-Clause. Very permissive, allows commercial use with attribution.",
  },
  Unlicense: {
    name: "The Unlicense",
    summary:
      "Public domain dedication. No conditions whatsoever. Code can be used for any purpose.",
  },
  "CC0-1.0": {
    name: "Creative Commons Zero 1.0",
    summary: "Public domain dedication. Waives all copyright worldwide, no conditions for use.",
  },
  "0BSD": {
    name: "Zero-Clause BSD",
    summary: "The most permissive license. No requirements at all, not even attribution.",
  },
  Zlib: {
    name: "zlib License",
    summary:
      "Permissive. Allows commercial use; requires not misrepresenting authorship and marking altered versions.",
  },
  "BSL-1.0": {
    name: "Boost Software License 1.0",
    summary:
      "Permissive. Allows commercial use; attribution required only in source distributions, not binaries.",
  },
  PostgreSQL: {
    name: "PostgreSQL License",
    summary: "Permissive, similar to MIT/BSD. Allows any use with copyright notice retention.",
  },
  "PSF-2.0": {
    name: "Python Software Foundation License 2.0",
    summary:
      "Permissive. Allows commercial use and redistribution with attribution to the Python Software Foundation.",
  },
  "Artistic-2.0": {
    name: "Artistic License 2.0",
    summary:
      "Permissive. Allows commercial use; modified versions must be clearly marked or distributed under different terms.",
  },
  "MS-PL": {
    name: "Microsoft Public License",
    summary:
      "Permissive. Allows commercial use, modification, and redistribution. No copyleft requirement.",
  },
  WTFPL: {
    name: "Do What The F*ck You Want To Public License",
    summary: "Essentially public domain. No restrictions on use, modification, or distribution.",
  },
  "BlueOak-1.0.0": {
    name: "Blue Oak Model License 1.0",
    summary:
      "Modern permissive license. Allows any use with attribution; written in plain language for clarity.",
  },
  "LGPL-2.1-only": {
    name: "GNU Lesser General Public License v2.1",
    summary:
      "Weak copyleft. Linking to the library is allowed in proprietary software, but modifications to the library itself must be shared.",
  },
  "LGPL-2.1-or-later": {
    name: "GNU LGPL v2.1 or later",
    summary:
      "Same as LGPL-2.1 with the option to use any later LGPL version. Modifications to the library must be shared.",
  },
  "LGPL-3.0-only": {
    name: "GNU Lesser General Public License v3.0",
    summary:
      "Weak copyleft. Proprietary software may link to the library, but changes to the library must be released under LGPL.",
  },
  "LGPL-3.0-or-later": {
    name: "GNU LGPL v3.0 or later",
    summary:
      "Same as LGPL-3.0 with the option to adopt any later version. Library modifications must be shared.",
  },
  "MPL-2.0": {
    name: "Mozilla Public License 2.0",
    summary:
      "Weak copyleft at the file level. Modified files must stay MPL-2.0, but you can combine with proprietary code in larger works.",
  },
  "EPL-1.0": {
    name: "Eclipse Public License 1.0",
    summary:
      "Weak copyleft. Modifications must be shared under EPL; can be combined with proprietary code in larger products.",
  },
  "EPL-2.0": {
    name: "Eclipse Public License 2.0",
    summary:
      "Weak copyleft. Like EPL-1.0 with improved compatibility; allows secondary licensing under GPL-2.0.",
  },
  "CDDL-1.0": {
    name: "Common Development and Distribution License 1.0",
    summary:
      "Weak copyleft at the file level. Modified files must stay CDDL; can combine with proprietary code.",
  },
  "CDDL-1.1": {
    name: "Common Development and Distribution License 1.1",
    summary: "Updated CDDL with minor clarifications. Same file-level copyleft as CDDL-1.0.",
  },
  "CPL-1.0": {
    name: "Common Public License 1.0",
    summary:
      "Weak copyleft (predecessor to EPL). Modifications must be shared; includes patent retaliation clause.",
  },
  "MS-RL": {
    name: "Microsoft Reciprocal License",
    summary:
      "Weak copyleft. Source files containing licensed code must remain under MS-RL; other files can be proprietary.",
  },
  "GPL-2.0-only": {
    name: "GNU General Public License v2.0",
    summary:
      "Strong copyleft. Any distributed derivative work must also be licensed under GPL-2.0. Commercial use is allowed but source must be provided.",
  },
  "GPL-2.0-or-later": {
    name: "GNU GPL v2.0 or later",
    summary:
      "Same as GPL-2.0 with the option to use any later GPL version. All derivative works must be open source.",
  },
  "GPL-3.0-only": {
    name: "GNU General Public License v3.0",
    summary:
      "Strong copyleft. Derivative works must be GPL-3.0. Adds patent protection and anti-tivoization clauses over GPL-2.0.",
  },
  "GPL-3.0-or-later": {
    name: "GNU GPL v3.0 or later",
    summary:
      "Same as GPL-3.0 with the option to adopt future versions. All derivative works must remain open source.",
  },
  "AGPL-3.0-only": {
    name: "GNU Affero General Public License v3.0",
    summary:
      "Strongest copyleft. Like GPL-3.0 but also requires sharing source if software is accessed over a network (e.g., SaaS).",
  },
  "AGPL-3.0-or-later": {
    name: "GNU AGPL v3.0 or later",
    summary:
      "Same as AGPL-3.0 with future version option. Network use triggers source-sharing requirement.",
  },
  "SSPL-1.0": {
    name: "Server Side Public License v1.0",
    summary:
      "Strong copyleft for services. If you offer the software as a service, you must release your entire service stack's source code.",
  },
  "OSL-3.0": {
    name: "Open Software License 3.0",
    summary:
      "Strong copyleft with patent grant. All derivative works must be open source; includes network-use trigger similar to AGPL.",
  },
  "EUPL-1.2": {
    name: "European Union Public License 1.2",
    summary:
      "Strong copyleft from the EU. Derivative works must be shared; compatible with GPL, LGPL, AGPL, and other EU licenses.",
  },
  "RPL-1.5": {
    name: "Reciprocal Public License 1.5",
    summary:
      "Restrictive reciprocal license. All derivative works and deployed modifications must be publicly shared, even internal ones.",
  },
  "Polyform-Noncommercial-1.0.0": {
    name: "PolyForm Noncommercial License 1.0.0",
    summary:
      "Proprietary/restrictive. Free for non-commercial use only; commercial use requires a separate license.",
  },
  "BUSL-1.1": {
    name: "Business Source License 1.1",
    summary:
      "Source-available but not open source. Free for non-production use; production use requires a commercial license until the change date.",
  },
};

const CATEGORY_DESCRIPTIONS: Record<
  LicenseCategory,
  { label: string; description: string; defaultAction: PolicyAction }
> = {
  [LicenseCategory.Permissive]: {
    label: "Permissive",
    description:
      "Allow commercial use, modification, and redistribution with minimal obligations (typically just attribution). Safe for most projects.",
    defaultAction: PolicyAction.Allow,
  },
  [LicenseCategory.WeakCopyleft]: {
    label: "Weak Copyleft",
    description:
      "Allow linking and use in proprietary software, but require changes to the licensed component itself to be shared. Review on a case-by-case basis.",
    defaultAction: PolicyAction.Warn,
  },
  [LicenseCategory.StrongCopyleft]: {
    label: "Strong Copyleft",
    description:
      "Require derivative works to be distributed under the same license. Can force your entire project to become open source if not carefully isolated.",
    defaultAction: PolicyAction.Block,
  },
  [LicenseCategory.Proprietary]: {
    label: "Proprietary / Restrictive",
    description:
      "Impose significant restrictions on commercial use, redistribution, or require separate paid licenses. Require legal review before adoption.",
    defaultAction: PolicyAction.Warn,
  },
  [LicenseCategory.Unknown]: {
    label: "Unknown",
    description:
      "License could not be identified. May indicate a missing license declaration or an unrecognized SPDX identifier. Investigate manually.",
    defaultAction: PolicyAction.Warn,
  },
};

const POLICY_ACTION_LABELS: Record<PolicyAction, string> = {
  [PolicyAction.Allow]: "Allow",
  [PolicyAction.Warn]: "Warn",
  [PolicyAction.Block]: "Block",
};

const CATEGORY_ORDER = [
  LicenseCategory.Permissive,
  LicenseCategory.WeakCopyleft,
  LicenseCategory.StrongCopyleft,
  LicenseCategory.Proprietary,
];

const ALL_CATEGORIES = [
  LicenseCategory.Permissive,
  LicenseCategory.WeakCopyleft,
  LicenseCategory.StrongCopyleft,
  LicenseCategory.Proprietary,
  LicenseCategory.Unknown,
];

export const LicenseGuide: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<LicenseCategory | null>(null);

  const licenses = React.useMemo(() => {
    return Object.entries(LICENSE_CATEGORIES).map(([spdx, category]) => ({
      spdx,
      category,
      info: LICENSE_INFO[spdx] || { name: spdx, summary: "No description available." },
    }));
  }, []);

  const filtered = React.useMemo(() => {
    let result = licenses;
    if (selectedCategory !== null) {
      result = result.filter((l) => l.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.spdx.toLowerCase().includes(term) ||
          l.info.name.toLowerCase().includes(term) ||
          l.info.summary.toLowerCase().includes(term)
      );
    }
    return result;
  }, [licenses, searchTerm, selectedCategory]);

  const grouped = React.useMemo(() => {
    const map = new Map<LicenseCategory, typeof filtered>();
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((l) => l.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <Card
        title="License Guide"
        hint="Reference of all recognized open-source licenses, grouped by category. Use this to understand what each license requires and how the default policy treats it."
      >
        <div className="ax-grid-3">
          {ALL_CATEGORIES.map((cat) => {
            const info = CATEGORY_DESCRIPTIONS[cat];
            return (
              <div key={cat} className="ax-stack" style={{ gap: 8 }}>
                <div>
                  <Pill tone={licenseCategoryTone(cat)}>{info.label}</Pill>
                </div>
                <p className="ax-help" style={{ margin: 0 }}>
                  {info.description}
                </p>
                <dl className="ax-kv" style={{ margin: 0 }}>
                  <dt>Default policy</dt>
                  <dd>
                    <Pill tone={policyActionTone(info.defaultAction)}>
                      {POLICY_ACTION_LABELS[info.defaultAction]}
                    </Pill>
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Search and filter bar */}
      <div className="ax-toolbar">
        <label className="ax-search">
          <span className="ax-search__icon">
            <IconSearch />
          </span>
          <input
            type="search"
            className="ax-input"
            placeholder="Search licenses..."
            aria-label="Search licenses"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        <div className="ax-segmented" role="group" aria-label="Filter by category">
          <button
            type="button"
            aria-pressed={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              {CATEGORY_DESCRIPTIONS[cat].label}
            </button>
          ))}
        </div>
        <span className="ax-muted" style={{ fontSize: 12 }}>
          {filtered.length} license{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* License table grouped by category */}
      {Array.from(grouped.entries()).map(([cat, items]) => {
        const catInfo = CATEGORY_DESCRIPTIONS[cat];
        return (
          <Card
            key={cat}
            title={catInfo.label}
            hint={`${items.length} license${items.length !== 1 ? "s" : ""}`}
            actions={<Pill tone={licenseCategoryTone(cat)}>{cat}</Pill>}
            flush
          >
            <div className="ax-table-wrap">
              <table className="ax-table">
                <thead>
                  <tr>
                    <th style={{ width: 180 }}>SPDX ID</th>
                    <th style={{ width: 260 }}>Full Name</th>
                    <th>Key Obligations</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.spdx}>
                      <td>
                        <Pill tone={licenseCategoryTone(l.category)}>{l.spdx}</Pill>
                      </td>
                      <td>{l.info.name}</td>
                      <td className="ax-muted" style={{ whiteSpace: "normal" }}>
                        {l.info.summary}
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
          <EmptyState title="No licenses match your search." />
        </Card>
      )}
    </div>
  );
};
