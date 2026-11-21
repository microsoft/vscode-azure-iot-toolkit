const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { parseArgs } = require("util");

const releaseModes = new Set(["Dry run", "Preview", "GA"]);

function fail(message) {
  throw new Error(message);
}

function parseOptions(names) {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: Object.fromEntries(names.map((name) => [name, { type: "string" }])),
  });

  for (const name of names) {
    if (!values[name]) {
      fail(`Option --${name} is required.`);
    }
  }

  return values;
}

function run(command, args, capture = false) {
  return childProcess.execFileSync(command, args, {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function setOutputVariable(name, value) {
  console.log(`##vso[task.setvariable variable=${name};isOutput=true]${value}`);
}

function getReleaseInfo(mode, sourceRef, version) {
  if (!releaseModes.has(mode)) {
    fail(`Unsupported release mode ${mode}.`);
  }

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`Package version ${version} must use major.minor.patch.`);
  }

  const gaTag = `refs/tags/v${version}`;
  const previewTag = `${gaTag}-preview`;
  const isPreRelease = mode === "Dry run" ? sourceRef === previewTag : mode === "Preview";

  if (mode === "Dry run") {
    if (!sourceRef.startsWith("refs/heads/") && sourceRef !== gaTag && sourceRef !== previewTag) {
      fail(`Dry run requires a branch, ${gaTag}, or ${previewTag}; received ${sourceRef}.`);
    }
  } else {
    const expectedTag = isPreRelease ? previewTag : gaTag;
    if (sourceRef !== expectedTag) {
      fail(`${mode} mode requires source ref ${expectedTag}, received ${sourceRef}.`);
    }
  }

  return {
    isPreRelease,
    releaseTag: `v${version}${isPreRelease ? "-preview" : ""}`,
    vsixFileName: `azure-iot-toolkit-${version}${isPreRelease ? "-pre-release" : ""}.vsix`,
  };
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function resolveSource() {
  const options = parseOptions(["mode", "source-ref", "repository", "output"]);
  const repository = path.resolve(options.repository);
  const output = path.resolve(options.output);
  const sourceRef = options["source-ref"];

  if (!sourceRef.startsWith("refs/heads/") && !sourceRef.startsWith("refs/tags/")) {
    fail(`Source ref must be a full branch or tag ref, received ${sourceRef}.`);
  }

  run("git", ["-C", repository, "check-ref-format", sourceRef]);
  run("git", ["-C", repository, "fetch", "--no-tags", "origin", sourceRef]);

  const sourceCommit = run(
    "git",
    ["-C", repository, "rev-parse", "--verify", "FETCH_HEAD^{commit}"],
    true,
  ).trim();

  const packageJsonText = run(
    "git",
    ["-C", repository, "show", `${sourceCommit}:package.json`],
    true,
  );
  const packageJson = JSON.parse(packageJsonText);
  const releaseInfo = getReleaseInfo(options.mode, sourceRef, packageJson.version);

  fs.mkdirSync(output, { recursive: true });
  const sourceArchive = path.join(output, "source.tar");
  run("git", [
    "-C",
    repository,
    "archive",
    "--format=tar",
    `--output=${sourceArchive}`,
    sourceCommit,
  ]);
  fs.copyFileSync(__filename, path.join(output, path.basename(__filename)));

  const sourceMetadata = {
    mode: options.mode,
    sourceRef,
    sourceCommit,
    packageVersion: packageJson.version,
    ...releaseInfo,
  };
  writeJson(path.join(output, "source-metadata.json"), sourceMetadata);

  setOutputVariable("sourceCommit", sourceCommit);
  setOutputVariable("releaseTag", releaseInfo.releaseTag);
}

function extractSource() {
  const options = parseOptions(["artifact-directory", "destination"]);
  const artifactDirectory = path.resolve(options["artifact-directory"]);
  const destination = path.resolve(options.destination);
  const sourceArchive = path.join(artifactDirectory, "source.tar");

  fs.mkdirSync(destination, { recursive: true });
  run("tar", ["-xf", sourceArchive, "-C", destination]);
}

function createCandidate() {
  const options = parseOptions(["source-metadata", "candidate-directory"]);
  const sourceMetadata = readJson(path.resolve(options["source-metadata"]));
  const candidateDirectory = path.resolve(options["candidate-directory"]);

  const vsixPath = path.join(candidateDirectory, sourceMetadata.vsixFileName);
  const vsixHash = sha256(vsixPath);
  fs.writeFileSync(
    `${vsixPath}.sha256`,
    `${vsixHash}  ${path.basename(vsixPath)}\n`,
  );
  writeJson(path.join(candidateDirectory, "release-metadata.json"), {
    ...sourceMetadata,
    vsixSha256: vsixHash,
  });
}

function verifyCandidate() {
  const options = parseOptions(["candidate-directory", "mode", "source-ref", "source-commit"]);
  const candidateDirectory = path.resolve(options["candidate-directory"]);
  const metadata = readJson(path.join(candidateDirectory, "release-metadata.json"));

  const expected = {
    mode: options.mode,
    sourceRef: options["source-ref"],
    sourceCommit: options["source-commit"],
    ...getReleaseInfo(options.mode, options["source-ref"], metadata.packageVersion),
  };
  for (const [field, value] of Object.entries(expected)) {
    if (metadata[field] !== value) {
      fail(`Candidate ${field} ${metadata[field]} does not match ${value}.`);
    }
  }

  const { vsixFileName } = expected;
  const vsixPath = path.join(candidateDirectory, vsixFileName);
  const actualHash = sha256(vsixPath);
  if (actualHash !== metadata.vsixSha256) {
    fail(`Candidate VSIX SHA-256 ${actualHash} does not match metadata ${metadata.vsixSha256}.`);
  }

  const checksumText = fs.readFileSync(`${vsixPath}.sha256`, "utf8").trim();
  if (checksumText !== `${actualHash}  ${vsixFileName}`) {
    fail(`Checksum file for ${vsixFileName} is invalid.`);
  }

  console.log(`Verified ${vsixFileName} (${actualHash}).`);
  setOutputVariable("vsixPath", vsixPath);
}

function main() {
  const commands = {
    resolve: resolveSource,
    "extract-source": extractSource,
    "create-candidate": createCandidate,
    "verify-candidate": verifyCandidate,
  };
  const commandName = process.argv[2];
  if (!Object.hasOwn(commands, commandName)) {
    fail(`Unsupported command ${commandName ?? "<missing>"}.`);
  }
  commands[commandName]();
}

module.exports = { getReleaseInfo };

if (require.main === module) {
  main();
}
