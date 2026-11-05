// File patterns for dependency file discovery
export const DEPENDENCY_FILE_PATTERNS: RegExp[] = [
  // NuGet
  /\.csproj$/i,
  /packages\.config$/i,
  /Directory\.Packages\.props$/i,
  /\.nuspec$/i,
  // npm
  /package\.json$/i,
  /package-lock\.json$/i,
  // Go
  /go\.mod$/i,
  // Python
  /requirements.*\.txt$/i,
  /pyproject\.toml$/i,
  /setup\.py$/i,
  /setup\.cfg$/i,
  /Pipfile$/i,
  // Maven
  /pom\.xml$/i,
];

// Paths to skip during file discovery
export const SKIP_PATTERNS: RegExp[] = [
  /node_modules\//i,
  /vendor\//i,
  /\.git\//i,
  /dist\//i,
  /bin\//i,
  /obj\//i,
  /\.vs\//i,
  /packages\//i,
  /TestResults\//i,
];

// Concurrency limits
export const MAX_CONCURRENT_REPOS = 15;
export const MAX_CONCURRENT_FILES = 20;

// Max file size to process (1 MB)
export const MAX_FILE_SIZE = 1024 * 1024;

// Settings persistence
export const POLICY_SETTINGS_COLLECTION = "ComplianceScannerSettings";
export const POLICY_DOC_ID = "license-policy";
export const SETTINGS_VERSION = 1;
export const APPROVED_PACKAGES_DOC_ID = "approved-packages";
export const APPROVED_PACKAGES_VERSION = 1;
