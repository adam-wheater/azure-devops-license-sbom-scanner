import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  IExtensionDataManager,
} from "azure-devops-extension-api";

/**
 * The Extension Data Service rejects a getDocument() for a missing document
 * with a 404 / DocumentDoesNotExistException. Anything else (network, auth,
 * throttling) must not be mistaken for "no document yet", or the caller would
 * overwrite the user's saved settings with defaults.
 */
export function isDocumentNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    status?: number;
    serverError?: { typeKey?: string };
    typeKey?: string;
    message?: string;
  };
  if (e.status === 404) return true;
  const typeKey = e.serverError?.typeKey ?? e.typeKey ?? "";
  if (/DocumentDoesNotExist/i.test(typeKey)) return true;
  return /DocumentDoesNotExist|does not exist|not found/i.test(e.message ?? "");
}

export class BaseDataService {
  private dataManagerPromise: Promise<IExtensionDataManager> | null = null;

  protected async getDataManager(): Promise<IExtensionDataManager> {
    if (!this.dataManagerPromise) {
      this.dataManagerPromise = (async () => {
        const service = await SDK.getService<IExtensionDataService>(
          CommonServiceIds.ExtensionDataService
        );
        const accessToken = await SDK.getAccessToken();
        return service.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
      })();
    }
    return this.dataManagerPromise;
  }
}
