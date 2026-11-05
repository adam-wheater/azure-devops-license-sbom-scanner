import { __setMockService, __resetMockServices } from "../__mocks__/azure-devops-extension-sdk";
import { CommonServiceIds } from "azure-devops-extension-api";
import { PolicySettingsService, normalizePolicy } from "@/services/PolicySettingsService";
import { ApprovedPackagesService, normalizeRegistry } from "@/services/ApprovedPackagesService";
import { isDocumentNotFound } from "@/services/BaseDataService";
import { DEFAULT_POLICY } from "@/models/LicenseRegistry";
import { LicenseCategory, PolicyAction } from "@/models/types";

function installManager(getDocument: jest.Mock, setDocument = jest.fn(async (_c, d) => d)) {
  __setMockService(CommonServiceIds.ExtensionDataService, {
    getExtensionDataManager: async () => ({ getDocument, setDocument }),
  });
  return setDocument;
}

afterEach(() => __resetMockServices());

describe("isDocumentNotFound", () => {
  test("recognises the data service's missing-document errors", () => {
    expect(isDocumentNotFound({ status: 404 })).toBe(true);
    expect(isDocumentNotFound({ serverError: { typeKey: "DocumentDoesNotExistException" } })).toBe(
      true
    );
    expect(isDocumentNotFound(new Error("Document does not exist"))).toBe(true);
  });

  test("does not treat other failures as missing documents", () => {
    expect(isDocumentNotFound({ status: 503, message: "Service unavailable" })).toBe(false);
    expect(isDocumentNotFound(new Error("Network error"))).toBe(false);
    expect(isDocumentNotFound(undefined)).toBe(false);
  });
});

describe("PolicySettingsService", () => {
  test("seeds defaults when no document exists", async () => {
    const setDocument = installManager(jest.fn().mockRejectedValue({ status: 404 }));
    const doc = await new PolicySettingsService().getPolicy();
    expect(doc.policy).toEqual(DEFAULT_POLICY);
    expect(setDocument).toHaveBeenCalledTimes(1);
  });

  test("does not overwrite saved settings on a transient read failure", async () => {
    const setDocument = installManager(jest.fn().mockRejectedValue(new Error("Network error")));
    await expect(new PolicySettingsService().getPolicy()).rejects.toThrow("Network error");
    expect(setDocument).not.toHaveBeenCalled();
  });

  test("fills in missing parts of an older stored policy", async () => {
    installManager(
      jest.fn().mockResolvedValue({
        id: "license-policy",
        version: 1,
        policy: { categoryDefaults: { [LicenseCategory.Unknown]: PolicyAction.Block } },
      })
    );
    const doc = await new PolicySettingsService().getPolicy();
    expect(doc.policy.categoryDefaults[LicenseCategory.Unknown]).toBe(PolicyAction.Block);
    expect(doc.policy.categoryDefaults[LicenseCategory.Permissive]).toBe(PolicyAction.Allow);
    expect(doc.policy.specificOverrides).toEqual([]);
    expect(doc.policy.excludedPackages).toEqual([]);
  });

  test("normalizePolicy tolerates undefined", () => {
    expect(normalizePolicy(undefined)).toEqual(DEFAULT_POLICY);
  });
});

describe("ApprovedPackagesService", () => {
  test("rethrows non-404 errors instead of seeding", async () => {
    const setDocument = installManager(jest.fn().mockRejectedValue({ status: 401 }));
    await expect(new ApprovedPackagesService().getRegistry()).rejects.toEqual({ status: 401 });
    expect(setDocument).not.toHaveBeenCalled();
  });

  test("normalizes a registry missing its arrays", () => {
    expect(normalizeRegistry({ packages: undefined as any })).toEqual({
      packages: [],
      autoApprovalRules: [],
    });
  });
});
