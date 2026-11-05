import { ApprovedPackagesRegistry, ApprovedPackagesDocument } from "@/models/types";
import { DEFAULT_APPROVED_PACKAGES_REGISTRY } from "@/models/LicenseRegistry";
import {
  POLICY_SETTINGS_COLLECTION,
  APPROVED_PACKAGES_DOC_ID,
  APPROVED_PACKAGES_VERSION,
} from "@/utils/Constants";
import { BaseDataService, isDocumentNotFound } from "./BaseDataService";

/** Fills in missing arrays from older or hand-edited documents. */
export function normalizeRegistry(
  registry: Partial<ApprovedPackagesRegistry> | undefined
): ApprovedPackagesRegistry {
  return {
    packages: Array.isArray(registry?.packages) ? registry.packages : [],
    autoApprovalRules: Array.isArray(registry?.autoApprovalRules) ? registry.autoApprovalRules : [],
  };
}

export class ApprovedPackagesService extends BaseDataService {
  async getRegistry(): Promise<ApprovedPackagesDocument> {
    const manager = await this.getDataManager();
    try {
      const doc = (await manager.getDocument(
        POLICY_SETTINGS_COLLECTION,
        APPROVED_PACKAGES_DOC_ID
      )) as ApprovedPackagesDocument;
      return { ...doc, registry: normalizeRegistry(doc.registry) };
    } catch (err) {
      if (!isDocumentNotFound(err)) throw err;
      const seed: ApprovedPackagesDocument = {
        id: APPROVED_PACKAGES_DOC_ID,
        registry: DEFAULT_APPROVED_PACKAGES_REGISTRY,
        version: APPROVED_PACKAGES_VERSION,
      };
      await manager.setDocument(POLICY_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async saveRegistry(registry: ApprovedPackagesRegistry): Promise<ApprovedPackagesDocument> {
    const doc = await this.getRegistry();
    doc.registry = registry;
    const manager = await this.getDataManager();
    await manager.setDocument(POLICY_SETTINGS_COLLECTION, doc);
    return doc;
  }
}
