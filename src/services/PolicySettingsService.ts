import { LicensePolicy, PolicyDocument } from "@/models/types";
import { DEFAULT_POLICY } from "@/models/LicenseRegistry";
import { POLICY_SETTINGS_COLLECTION, POLICY_DOC_ID, SETTINGS_VERSION } from "@/utils/Constants";
import { BaseDataService, isDocumentNotFound } from "./BaseDataService";

/**
 * Fills in anything a stored document is missing (older shapes, hand edits)
 * so the engine never sees an undefined category action or a missing array.
 */
export function normalizePolicy(policy: Partial<LicensePolicy> | undefined): LicensePolicy {
  return {
    categoryDefaults: { ...DEFAULT_POLICY.categoryDefaults, ...(policy?.categoryDefaults ?? {}) },
    specificOverrides: Array.isArray(policy?.specificOverrides) ? policy.specificOverrides : [],
    excludedPackages: Array.isArray(policy?.excludedPackages) ? policy.excludedPackages : [],
  };
}

export class PolicySettingsService extends BaseDataService {
  async getPolicy(): Promise<PolicyDocument> {
    const manager = await this.getDataManager();
    try {
      const doc = (await manager.getDocument(
        POLICY_SETTINGS_COLLECTION,
        POLICY_DOC_ID
      )) as PolicyDocument;
      return { ...doc, policy: normalizePolicy(doc.policy) };
    } catch (err) {
      if (!isDocumentNotFound(err)) throw err;
      // Document doesn't exist yet — seed with defaults
      const seed: PolicyDocument = {
        id: POLICY_DOC_ID,
        policy: DEFAULT_POLICY,
        version: SETTINGS_VERSION,
      };
      await manager.setDocument(POLICY_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async savePolicy(policy: LicensePolicy): Promise<PolicyDocument> {
    const doc = await this.getPolicy();
    doc.policy = policy;
    const manager = await this.getDataManager();
    await manager.setDocument(POLICY_SETTINGS_COLLECTION, doc);
    return doc;
  }
}
