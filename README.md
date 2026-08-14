# BC-Experiments

## What this is

A single repository for Business Central (AL) development. It's used to try
out and build individual BC customizations ("features") without spinning up
a separate repo for each one — everything lives here, isolated by folder,
sharing one build/deploy pipeline.

## Structure

Each feature lives in its own top-level folder using the convention:

```
feature1-src/
feature2-src/
feature3-src/
```

Every folder is an independent AL app (its own `app.json`, own object ID
range, own `.vscode/launch.json`), but they all share one CI/CD pipeline via
[AL-Go for GitHub](https://aka.ms/AL-Go) — Microsoft's official build/deploy
framework for AL projects. AL-Go was vendored into this repo from the
[AL-Go-PTE](https://github.com/microsoft/AL-Go-PTE) template (v9.1) and lives
mostly under `.github/workflows/` and `.AL-Go/`.

There is no example feature yet — see [Features](#features) below, which is
currently empty.

## Adding a new feature

1. **Actions tab → "Create a new app"** (`CreateApp.yaml`, `workflow_dispatch`).
   Fill in `name`, `publisher`, and an unused `idrange` (e.g. `50100..50149`
   for the first feature, `50150..50199` for the next, etc. — each feature
   needs its own non-overlapping AL object ID range). This opens a PR with a
   working, compiling app folder.
2. Rename the generated folder to match the `featureN-src` convention if the
   workflow didn't already name it that way.
3. Add the folder name to `appFolders` in [`.AL-Go/settings.json`](.AL-Go/settings.json).
4. Add the folder to the `folders` list in [`al.code-workspace`](al.code-workspace)
   so the AL Language extension picks it up when you open the workspace file
   in VS Code.
5. Open the workspace, run **AL: Download Symbols**, and start developing.
6. Add a row for it in the [Features](#features) table below.

(You can also create a folder by hand — copy the shape of an existing
`featureN-src` app once one exists — but the workflow guarantees a valid
`app.json`/ID range and is the recommended path.)

## Removing a feature

1. Delete the `featureN-src` folder.
2. Remove it from `appFolders` in `.AL-Go/settings.json`.
3. Remove it from the `folders` list in `al.code-workspace`.
4. Delete its row from the [Features](#features) table below.

## CI — every push and PR

`.github/workflows/CICD.yaml` compiles every folder listed in `appFolders`
against the **current** Business Central Online (cloud) symbols — AL-Go
resolves "latest" automatically, so there's no BC version to hand-pin in this
repo. It runs on push to `main`/`release/*`/`feature/*` and on PRs, and
uploads compiled `.app` files as build artifacts.

## CD — deployed on request, to `SandboxAT`

Deployment is **on-request**, not automatic on every commit: when you ask for
a feature to be implemented and deployed, the change gets built and then
pushed to the `SandboxAT` Business Central environment via **Actions →
"Publish To Environment"** (`PublishToEnvironment.yaml`). AL-Go's `CICD.yaml`
would also auto-deploy on push to `main` since `SandboxAT` is a registered
target, but the intended workflow here is deploy-when-asked, not
deploy-on-every-merge.

### Auth setup (done)

AL-Go authenticates to the tenant via a Microsoft Entra app registration
using the client-credentials (S2S) flow:

- A GitHub **Environment** named `SandboxAT` (Settings → Environments) holds
  the secret `AUTHCONTEXT` — compact JSON of
  `{"TenantID":...,"ClientID":...,"ClientSecret":...}` for the app.
- That app is registered inside the Business Central Admin Center under
  Microsoft Entra applications, currently assigned the `SUPER` permission
  set. (Broader than strictly necessary for just publishing extensions —
  worth narrowing to something like `D365 AUTOMATION` later, but functional
  as-is.)

Reference docs if this ever needs to be redone or extended to a production
environment:
[Register a sandbox environment for Continuous Deployment](https://github.com/microsoft/AL-Go/blob/main/Scenarios/RegisterSandboxEnvironment.md),
[Register a production environment](https://github.com/microsoft/AL-Go/blob/main/Scenarios/RegisterProductionEnvironment.md).

## Repo layout

```
.AL-Go/settings.json       AL-Go settings — appFolders list, country, etc.
.github/workflows/         AL-Go's CI/CD workflows (vendored from AL-Go-PTE)
.github/AL-Go-Settings.json  Points at the upstream template for future updates
al.code-workspace          Multi-root VS Code workspace — add each feature folder here
featureN-src/               One AL app per feature (created via the workflow above)
```

To pull in AL-Go framework updates later, run **Actions → "Update AL-Go
System Files"**.

## Features

This table is the source of truth for what exists in the repo. **Every time
a feature folder is added, add a row here. Every time a feature folder is
removed, delete its row.** Keep it in sync with `appFolders` in
`.AL-Go/settings.json` — same folders, same order is not required, but
nothing should be listed in one place and not the other.

| Folder | Description | ID range | Status |
|---|---|---|---|
| `feature1-src` | Customer Card shows a "Hello World" greeting | 50100..50149 | Deployed to SandboxAT |

## Notes

- `.AL-Go/settings.json` defaults `country` to `us`. Change it if your BC
  tenant's localization differs.
- Each feature needs its own AL object ID range (no overlaps) — tracked in
  the table above.
