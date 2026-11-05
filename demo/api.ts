// Sample data for the demo build: a fictional "Contoso" project with ten Git
// repositories. The hub reads their dependency files through GitRestClient
// (getRepositories, getItems, getItemText), so each repository below is a set of
// real-looking package.json, csproj, requirements.txt, pom.xml and go.mod text
// that the real parsers read. See demo/kit.ts for the helpers.
import { CommonServiceIds, clientFactory, delay, extensionDataService, projectPageService } from "./kit";

export { CommonServiceIds };

const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();

// The SBOM preview shows a serial number; make it the same on every run.
let uuidCounter = 0;
Object.defineProperty(crypto, "randomUUID", {
  configurable: true,
  value: () => `5b0e7c1a-3d42-4f8e-9a61-${String(++uuidCounter).padStart(12, "0")}`,
});

// --- File builders -------------------------------------------------------------

type Ref = [name: string, version: string];

const csproj = (o: { sdk?: string; packageId?: string; refs: Ref[]; projects?: string[]; test?: boolean }) =>
  [
    `<Project Sdk="${o.sdk ?? "Microsoft.NET.Sdk"}">`,
    "",
    "  <PropertyGroup>",
    "    <TargetFramework>net8.0</TargetFramework>",
    "    <Nullable>enable</Nullable>",
    "    <ImplicitUsings>enable</ImplicitUsings>",
    ...(o.packageId ? [`    <PackageId>${o.packageId}</PackageId>`, "    <VersionPrefix>2.4.1</VersionPrefix>"] : []),
    ...(o.test ? ["    <IsPackable>false</IsPackable>", "    <IsTestProject>true</IsTestProject>"] : []),
    "  </PropertyGroup>",
    "",
    "  <ItemGroup>",
    ...o.refs.map(([n, v]) =>
      /coverlet|runner\.visualstudio/.test(n)
        ? [
            `    <PackageReference Include="${n}" Version="${v}">`,
            "      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>",
            "      <PrivateAssets>all</PrivateAssets>",
            "    </PackageReference>",
          ].join("\n")
        : `    <PackageReference Include="${n}" Version="${v}" />`
    ),
    "  </ItemGroup>",
    ...(o.projects?.length
      ? ["", "  <ItemGroup>", ...o.projects.map((p) => `    <ProjectReference Include="${p}" />`), "  </ItemGroup>"]
      : []),
    "",
    "</Project>",
    "",
  ].join("\n");

const packagesConfig = (refs: Ref[], framework = "net472") =>
  [
    `<?xml version="1.0" encoding="utf-8"?>`,
    "<packages>",
    ...refs.map(([n, v]) => `  <package id="${n}" version="${v}" targetFramework="${framework}" />`),
    "</packages>",
    "",
  ].join("\n");

const nuspec = (id: string, version: string, deps: Ref[]) =>
  [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd">`,
    "  <metadata>",
    `    <id>${id}</id>`,
    `    <version>${version}</version>`,
    "    <authors>Contoso Platform Team</authors>",
    "    <description>Shared message contracts and bus conventions for Contoso services.</description>",
    `    <dependencies>`,
    `      <group targetFramework="net8.0">`,
    ...deps.map(([n, v]) => `        <dependency id="${n}" version="${v}" />`),
    "      </group>",
    "    </dependencies>",
    "  </metadata>",
    "</package>",
    "",
  ].join("\n");

const packageJson = (o: { name: string; deps: Record<string, string>; dev: Record<string, string>; scripts: Record<string, string> }) =>
  JSON.stringify(
    { name: o.name, version: "1.0.0", private: true, scripts: o.scripts, dependencies: o.deps, devDependencies: o.dev },
    null,
    2
  ) + "\n";

const pom = (artifact: string, deps: { g: string; a: string; v: string; scope?: string }[]) =>
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<project xmlns="http://maven.apache.org/POM/4.0.0">`,
    "  <modelVersion>4.0.0</modelVersion>",
    "  <groupId>com.contoso.inventory</groupId>",
    `  <artifactId>${artifact}</artifactId>`,
    "  <version>1.14.0</version>",
    "  <packaging>jar</packaging>",
    "  <properties>",
    "    <maven.compiler.release>17</maven.compiler.release>",
    "  </properties>",
    "  <dependencies>",
    ...deps.flatMap((d) => [
      "    <dependency>",
      `      <groupId>${d.g}</groupId>`,
      `      <artifactId>${d.a}</artifactId>`,
      `      <version>${d.v}</version>`,
      ...(d.scope ? [`      <scope>${d.scope}</scope>`] : []),
      "    </dependency>",
    ]),
    "  </dependencies>",
    "</project>",
    "",
  ].join("\n");

const requirements = (title: string, lines: string[]) => [`# ${title}`, ...lines, ""].join("\n");

const goMod = (module: string, direct: string[], indirect: string[]) =>
  [
    `module ${module}`,
    "",
    "go 1.21",
    "",
    "require (",
    ...direct.map((l) => `\t${l}`),
    ")",
    "",
    "require (",
    ...indirect.map((l) => `\t${l} // indirect`),
    ")",
    "",
  ].join("\n");

// --- Repositories --------------------------------------------------------------

const NOISE = ["/README.md", "/.gitignore", "/Dockerfile", "/azure-pipelines.yml"];

interface Repo {
  id: string;
  name: string;
  files: Record<string, string>;
}

const repos: Repo[] = [
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c01",
    name: "billing-api",
    files: {
      "/src/Contoso.Billing.Api/Contoso.Billing.Api.csproj": csproj({
        sdk: "Microsoft.NET.Sdk.Web",
        refs: [
          ["Microsoft.AspNetCore.Authentication.JwtBearer", "8.0.1"],
          ["Swashbuckle.AspNetCore", "6.5.0"],
          ["Serilog.AspNetCore", "8.0.1"],
          ["Serilog.Sinks.Seq", "6.0.0"],
          ["Hangfire.AspNetCore", "1.8.9"],
          ["Hangfire.SqlServer", "1.8.9"],
          ["FluentValidation.DependencyInjectionExtensions", "11.9.0"],
          ["MediatR", "12.2.0"],
          ["AspNetCore.HealthChecks.SqlServer", "8.0.0"],
          ["Contoso.Contracts", "2.4.1"],
        ],
        projects: ["..\\Contoso.Billing.Core\\Contoso.Billing.Core.csproj"],
      }),
      "/src/Contoso.Billing.Core/Contoso.Billing.Core.csproj": csproj({
        refs: [
          ["Dapper", "2.1.35"],
          ["Microsoft.Data.SqlClient", "5.1.5"],
          ["Microsoft.EntityFrameworkCore", "8.0.1"],
          ["Microsoft.EntityFrameworkCore.SqlServer", "8.0.1"],
          ["Microsoft.Extensions.Http.Polly", "8.0.1"],
          ["Polly", "8.2.1"],
          ["Newtonsoft.Json", "13.0.3"],
          ["StackExchange.Redis", "2.7.17"],
          ["Stripe.net", "43.8.0"],
          ["Humanizer.Core", "2.14.1"],
          ["EPPlus", "7.0.5"],
        ],
      }),
      "/tests/Contoso.Billing.Tests/Contoso.Billing.Tests.csproj": csproj({
        test: true,
        refs: [
          ["Microsoft.NET.Test.Sdk", "17.9.0"],
          ["xunit", "2.6.6"],
          ["xunit.runner.visualstudio", "2.5.6"],
          ["coverlet.collector", "6.0.0"],
          ["Moq", "4.20.70"],
          ["FluentAssertions", "6.12.0"],
          ["Bogus", "35.4.0"],
        ],
        projects: ["..\\..\\src\\Contoso.Billing.Api\\Contoso.Billing.Api.csproj"],
      }),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c02",
    name: "payments-worker",
    files: {
      "/src/Contoso.Payments.Worker/Contoso.Payments.Worker.csproj": csproj({
        sdk: "Microsoft.NET.Sdk.Worker",
        refs: [
          ["Microsoft.Extensions.Hosting", "8.0.0"],
          ["Serilog.AspNetCore", "8.0.1"],
          ["MassTransit", "8.1.3"],
          ["MassTransit.RabbitMQ", "8.1.3"],
          ["Azure.Messaging.ServiceBus", "7.17.4"],
          ["Azure.Identity", "1.10.4"],
          ["Azure.Security.KeyVault.Secrets", "4.6.0"],
          ["Newtonsoft.Json", "13.0.3"],
          ["Polly", "8.2.1"],
          ["Dapper", "2.1.28"],
          ["Microsoft.Data.SqlClient", "5.1.5"],
          ["Quartz", "3.8.0"],
          ["Braintree", "5.25.0"],
          ["Serilog.Sinks.Console", "5.0.1"],
          ["Contoso.Messaging", "1.8.0"],
        ],
      }),
      "/tests/Contoso.Payments.Tests/Contoso.Payments.Tests.csproj": csproj({
        test: true,
        refs: [
          ["Microsoft.NET.Test.Sdk", "17.9.0"],
          ["xunit", "2.6.6"],
          ["xunit.runner.visualstudio", "2.5.6"],
          ["NSubstitute", "5.1.0"],
          ["FluentAssertions", "6.12.0"],
        ],
      }),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c03",
    name: "shared-contracts",
    files: {
      "/src/Contoso.Contracts/Contoso.Contracts.csproj": csproj({
        packageId: "Contoso.Contracts",
        refs: [
          ["System.Text.Json", "8.0.1"],
          ["FluentValidation", "11.9.0"],
        ],
      }),
      "/src/Contoso.Messaging/Contoso.Messaging.nuspec": nuspec("Contoso.Messaging", "1.8.0", [
        ["MassTransit", "8.1.3"],
        ["Newtonsoft.Json", "13.0.3"],
        ["Microsoft.Extensions.DependencyInjection.Abstractions", "8.0.0"],
      ]),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c04",
    name: "ledger-legacy",
    files: {
      "/Contoso.Ledger.Web/packages.config": packagesConfig([
        ["Newtonsoft.Json", "12.0.3"],
        ["log4net", "2.0.15"],
        ["NLog", "4.7.15"],
        ["Dapper", "2.0.123"],
        ["EntityFramework", "6.4.4"],
        ["Microsoft.AspNet.Mvc", "5.2.9"],
        ["Microsoft.AspNet.WebApi.Client", "5.2.9"],
        ["AutoMapper", "10.1.1"],
        ["Autofac", "6.5.0"],
        ["NUnit", "3.13.3"],
        ["NUnit3TestAdapter", "4.2.1"],
        ["Moq", "4.18.4"],
      ]),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c05",
    name: "web-portal",
    files: {
      "/package.json": packageJson({
        name: "web-portal",
        scripts: { dev: "vite", build: "tsc && vite build", test: "vitest run", lint: "eslint src" },
        deps: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "react-router-dom": "^6.22.0",
          "@tanstack/react-query": "^5.18.1",
          "@mui/material": "^5.15.7",
          axios: "^1.6.7",
          zod: "^3.22.4",
          "date-fns": "^3.3.1",
          zustand: "^4.5.0",
          nanoid: "^5.0.5",
        },
        dev: {
          typescript: "^5.3.3",
          vite: "^5.1.0",
          vitest: "^1.2.2",
          eslint: "^8.56.0",
          prettier: "^3.2.5",
          tailwindcss: "^3.4.1",
          "@types/react": "^18.2.55",
          "@types/react-dom": "^18.2.19",
        },
      }),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c06",
    name: "admin-portal",
    files: {
      "/package.json": packageJson({
        name: "admin-portal",
        scripts: { start: "webpack serve", build: "webpack --mode production", test: "jest", lint: "eslint src" },
        deps: {
          react: "^17.0.2",
          "react-dom": "^17.0.2",
          "react-router-dom": "^5.3.4",
          antd: "^5.12.8",
          "@reduxjs/toolkit": "^1.9.7",
          axios: "^1.6.2",
          lodash: "^4.17.21",
          moment: "^2.30.1",
          dayjs: "^1.11.10",
          "chart.js": "^4.4.1",
          uuid: "^9.0.1",
        },
        dev: {
          typescript: "^4.9.5",
          webpack: "^5.90.1",
          jest: "^29.7.0",
          eslint: "^8.56.0",
          prettier: "^2.8.8",
          "@types/node": "^18.19.10",
        },
      }),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c07",
    name: "inventory-service",
    files: {
      "/pom.xml": pom("inventory-service", [
        { g: "org.springframework.boot", a: "spring-boot-starter-web", v: "3.2.2" },
        { g: "com.fasterxml.jackson.core", a: "jackson-databind", v: "2.16.1" },
        { g: "com.google.guava", a: "guava", v: "33.0.0-jre" },
        { g: "org.apache.commons", a: "commons-lang3", v: "3.14.0" },
        { g: "mysql", a: "mysql-connector-java", v: "8.0.33" },
        { g: "org.hibernate", a: "hibernate-core", v: "6.4.1.Final" },
        { g: "org.slf4j", a: "slf4j-api", v: "2.0.11" },
        { g: "ch.qos.logback", a: "logback-classic", v: "1.4.14" },
        { g: "org.apache.kafka", a: "kafka-clients", v: "3.6.1" },
        { g: "redis.clients", a: "jedis", v: "5.1.0" },
        { g: "com.squareup.okhttp3", a: "okhttp", v: "4.12.0" },
        { g: "org.apache.commons", a: "commons-io", v: "2.15.1" },
        { g: "org.projectlombok", a: "lombok", v: "1.18.30", scope: "provided" },
        { g: "org.junit.jupiter", a: "junit-jupiter", v: "5.10.1", scope: "test" },
        { g: "org.mockito", a: "mockito-core", v: "5.8.0", scope: "test" },
        { g: "org.assertj", a: "assertj-core", v: "3.25.1", scope: "test" },
      ]),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c08",
    name: "reporting-service",
    files: {
      "/requirements.txt": requirements("Contoso reporting service", [
        "fastapi==0.109.2",
        "uvicorn==0.27.1",
        "pydantic==2.6.1",
        "SQLAlchemy==2.0.25",
        "alembic==1.13.1",
        "psycopg2-binary==2.9.9",
        "pandas==2.2.0",
        "numpy==1.26.4",
        "httpx==0.26.0",
        "boto3==1.34.34",
        "celery==5.3.6",
        "redis==5.0.1",
        "PyJWT==2.8.0",
        "structlog==24.1.0",
      ]),
      "/requirements-dev.txt": requirements("Development and test tools", [
        "-r requirements.txt",
        "pytest==8.0.0",
        "pytest-cov==4.1.0",
        "black==24.1.1",
        "ruff==0.2.0",
        "mypy==1.8.0",
      ]),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c09",
    name: "data-exports",
    files: {
      "/requirements.txt": requirements("Nightly export jobs", [
        "pandas==2.1.4",
        "numpy==1.26.4",
        "boto3==1.34.34",
        "requests==2.31.0",
        "click==8.1.7",
        "SQLAlchemy==2.0.25",
      ]),
    },
  },
  {
    id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c10",
    name: "gateway-proxy",
    files: {
      "/go.mod": goMod(
        "github.com/contoso/gateway-proxy",
        [
          "github.com/gin-gonic/gin v1.9.1",
          "github.com/spf13/viper v1.18.2",
          "go.uber.org/zap v1.26.0",
          "google.golang.org/grpc v1.61.0",
          "google.golang.org/protobuf v1.32.0",
          "github.com/prometheus/client_golang v1.18.0",
          "github.com/go-redis/redis v8.11.5+incompatible",
          "github.com/golang-jwt/jwt v3.2.2+incompatible",
          "github.com/google/uuid v1.6.0",
          "github.com/go-sql-driver/mysql v1.7.1",
          "github.com/stretchr/testify v1.8.4",
        ],
        ["golang.org/x/net v0.20.0"]
      ),
    },
  },
  // Two repositories with no dependency files: scanned, but not counted.
  { id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c11", name: "docs-portal", files: {} },
  { id: "0b7c1d52-4a31-4c6e-8f20-1a9e5d3b7c12", name: "infra-templates", files: {} },
];

const byId = new Map(repos.map((r) => [r.id, r]));

const folderPaths = (paths: string[]) => {
  const folders = new Set<string>(["/"]);
  for (const p of paths) {
    const parts = p.split("/").slice(1, -1);
    parts.forEach((_, i) => folders.add("/" + parts.slice(0, i + 1).join("/")));
  }
  return [...folders];
};

// --- Settings the organisation has already saved -------------------------------

const approved = (daysAgo: number, by = "Priya Shah") => ({ approvedBy: by, approvedAt: iso(daysAgo) });

const policy = {
  categoryDefaults: {
    permissive: "allow",
    "weak-copyleft": "warn",
    "strong-copyleft": "block",
    proprietary: "warn",
    unknown: "warn",
  },
  specificOverrides: [
    { licenseId: "EPL-1.0", action: "allow" },
    { licenseId: "EPL-2.0", action: "allow" },
    { licenseId: "Polyform-Noncommercial-1.0.0", action: "block" },
  ],
  excludedPackages: [
    { name: "Contoso.Contracts", ecosystem: "nuget" },
    { name: "Contoso.Messaging", ecosystem: "nuget" },
    { name: "@types/react", ecosystem: "npm" },
    { name: "@types/react-dom", ecosystem: "npm" },
    { name: "@types/node", ecosystem: "npm" },
  ],
};

const registry = {
  packages: [
    { name: "Contoso.Contracts", ecosystem: "nuget", approvedBy: "Auto-detected", approvedAt: iso(61), reason: "Internal package (produced in shared-contracts)" },
    { name: "Contoso.Messaging", ecosystem: "nuget", approvedBy: "Auto-detected", approvedAt: iso(61), reason: "Internal package (produced in shared-contracts)" },
    { name: "Hangfire.AspNetCore", ecosystem: "nuget", ...approved(34), reason: "LGPL, used unmodified as a dependency; cleared with legal" },
    { name: "Hangfire.SqlServer", ecosystem: "nuget", ...approved(34), reason: "LGPL, used unmodified as a dependency; cleared with legal" },
    { name: "psycopg2-binary", ecosystem: "python", ...approved(18, "Tom Ellis"), reason: "LGPL driver, not modified" },
  ],
  autoApprovalRules: [
    { pattern: "Microsoft.*", ecosystem: "nuget", ...approved(120), reason: "First-party Microsoft packages" },
    { pattern: "System.*", ecosystem: "nuget", ...approved(120), reason: "First-party Microsoft packages" },
    { pattern: "Azure.*", ecosystem: "nuget", ...approved(120), reason: "First-party Microsoft packages" },
    { pattern: "@types/*", ecosystem: "npm", ...approved(96, "Maria Lopez"), reason: "Type definitions only" },
    { pattern: "golang.org/x/*", ecosystem: "go", ...approved(75, "Sam Okafor"), reason: "Go extended library" },
  ],
};

export const services: Record<string, unknown> = {
  [CommonServiceIds.ProjectPageService]: projectPageService("Contoso"),
  [CommonServiceIds.ExtensionDataService]: extensionDataService({
    ComplianceScannerSettings: {
      "license-policy": { policy, version: 1 },
      "approved-packages": { registry, version: 1 },
    },
  }),
};

export const getClient = clientFactory({
  GitRestClient: {
    getRepositories: () =>
      delay(
        repos.map((r) => ({ id: r.id, name: r.name, defaultBranch: "refs/heads/main", project: { name: "Contoso" } })),
        350
      ),
    getItems: (repoId: string) => {
      const repo = byId.get(repoId);
      const files = [...Object.keys(repo?.files ?? {}), ...(repo ? NOISE : [])];
      const items = [
        ...folderPaths(files).map((path) => ({ path, isFolder: true })),
        ...files.map((path) => ({ path, isFolder: false })),
      ];
      return delay(items, 450);
    },
    getItemText: (repoId: string, path: string) => {
      const text = byId.get(repoId)?.files[path];
      return text === undefined ? Promise.reject(new Error(`No sample file ${path}`)) : delay(text, 400);
    },
  },
});
