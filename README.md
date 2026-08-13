# BC-Experiments

A single repository for Business Central (AL) development. Each feature lives in
its own top-level folder using the convention:

```
feature1-src/
feature2-src/
feature3-src/
```

Every folder is an independent AL app (its own `app.json`, own object ID range,
own `.vscode/launch.json`), but they all share one CI/CD pipeline via
[AL-Go for GitHub](https://aka.ms/AL-Go) — Microsoft's official build/deploy
framework for AL projects. AL-Go was vendored into this repo from the
[AL-Go-PTE](https://github.com/microsoft/AL-Go-PTE) template (v9.1) and lives
mostly under `.github/workflows/` and `.AL-Go/`.

There is no example feature yet — this commit only sets up the tooling.

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

(You can also create a folder by hand — copy the shape of an existing
`featureN-src` app once one exists — but the workflow guarantees a valid
`app.json`/ID range and is the recommended path.)

## CI — every push and PR

`.github/workflows/CICD.yaml` compiles every folder listed in `appFolders`
against the **current** Business Central Online (cloud) symbols — AL-Go
resolves "latest" automatically, so there's no BC version to hand-pin in this
repo. It runs on push to `main`/`release/*`/`feature/*` and on PRs, and
uploads compiled `.app` files as build artifacts.

## CD — auto-deploy on push, or on demand

This is the "implement it, then deploy it" loop:

- **Automatic:** once a target environment is registered (see below), every
  push to `main` deploys the newly built apps to it via the `Deploy` job in
  `CICD.yaml`.
- **On demand:** run **Actions → "Publish To Environment"**
  (`PublishToEnvironment.yaml`) any time to push the latest build to a
  specific environment without waiting for a push to `main`.

When you ask for a feature to be implemented **and deployed**, the flow is:
commit the AL changes to a branch → push → merge to `main` (or trigger
`PublishToEnvironment` directly) → AL-Go builds and deploys automatically.

### One-time setup required (tenant admin action — cannot be done from this repo)

AL-Go needs credentials to talk to your Business Central tenant. This has to
be done once, by whoever administers the BC tenant/Entra ID:

1. Register a Microsoft Entra ID app with Business Central Administration API
   permissions (client credentials / S2S flow).
2. Add a GitHub **Environment** (Settings → Environments) named after your BC
   environment (e.g. `Sandbox`), with a secret called `AUTHCONTEXT`:
   ```json
   {"TenantID":"<tenant-id>","ClientID":"<client-id>","ClientSecret":"<client-secret>"}
   ```
   (must be compact JSON, no trailing newline).
3. Confirm the environment shows up as a deploy target the next time
   `CICD.yaml` or `PublishToEnvironment.yaml` runs.

Full walkthrough:
[Register a sandbox environment for Continuous Deployment](https://github.com/microsoft/AL-Go/blob/main/Scenarios/RegisterSandboxEnvironment.md).
For a production environment (manual approval instead of auto-deploy on
every push), see
[Register a production environment](https://github.com/microsoft/AL-Go/blob/main/Scenarios/RegisterProductionEnvironment.md).

Until step 2 is done, CI (build/compile) still works — only the deploy step
is blocked.

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

## Notes

- `.AL-Go/settings.json` defaults `country` to `us`. Change it if your BC
  tenant's localization differs.
- Each feature needs its own AL object ID range (no overlaps) — track ranges
  in this table as you add features:

  | Folder | ID range |
  |---|---|
  | _(none yet)_ | |
