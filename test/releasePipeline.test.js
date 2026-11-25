// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { getReleaseInfo } = require("../scripts/releasePipeline");

test("publishing follows the selected channel, not the minor version", () => {
  const ga = getReleaseInfo("GA", "refs/tags/v2.19.0", "2.19.0");
  const preview = getReleaseInfo("Preview", "refs/tags/v2.20.0-preview", "2.20.0");
  assert.equal(ga.isPreRelease, false);
  assert.equal(ga.releaseTag, "v2.19.0");
  assert.equal(preview.isPreRelease, true);
  assert.equal(preview.releaseTag, "v2.20.0-preview");
});

test("dry runs build a regular VSIX unless given a matching preview tag", () => {
  assert.equal(getReleaseInfo("Dry run", "refs/heads/master", "2.19.0").isPreRelease, false);
  assert.equal(getReleaseInfo("Dry run", "refs/tags/v2.19.0", "2.19.0").isPreRelease, false);
  assert.equal(getReleaseInfo("Dry run", "refs/tags/v2.20.0-preview", "2.20.0").isPreRelease, true);
  assert.throws(() => getReleaseInfo("Dry run", "refs/tags/v2.19.0-preview", "2.20.0"), /Dry run requires/);
});

test("publishing still requires the exact tag for the version and channel", () => {
  assert.throws(() => getReleaseInfo("GA", "refs/tags/v2.19.0-preview", "2.19.0"), /GA mode requires/);
  assert.throws(() => getReleaseInfo("Preview", "refs/tags/v2.19.0-preview", "2.20.0"), /Preview mode requires/);
  assert.throws(() => getReleaseInfo("GA", "refs/heads/master", "2.19.0"), /GA mode requires/);
});

test("publishing gets the exact verified VSIX path and refuses changed bytes", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iot release-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const mode = "Preview";
  const packageVersion = "2.20.0";
  const sourceRef = `refs/tags/v${packageVersion}-preview`;
  const sourceCommit = "a".repeat(40);
  const info = getReleaseInfo(mode, sourceRef, packageVersion);
  const vsix = path.join(dir, info.vsixFileName);
  const source = path.join(dir, "source-metadata.json");
  fs.writeFileSync(vsix, "candidate");
  fs.writeFileSync(source, JSON.stringify({ mode, packageVersion, sourceRef, sourceCommit, ...info }));
  const run = (...args) => execFileSync(process.execPath, [
    require.resolve("../scripts/releasePipeline"), ...args, "--candidate-directory", dir,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  run("create-candidate", "--source-metadata", source);
  const verify = () => run("verify-candidate", "--mode", mode, "--source-ref", sourceRef, "--source-commit", sourceCommit);
  assert.ok(verify().includes(`##vso[task.setvariable variable=vsixPath;isOutput=true]${vsix}`));
  fs.appendFileSync(vsix, "modified");
  assert.throws(verify, /SHA-256/);
});
