const fs = require("fs");

const packageJson = JSON.parse(fs.readFileSync("package.json"));
const indexOfDash = packageJson.version.indexOf("-");

// remove trailing -rc if it presents.
if (indexOfDash !== -1) {
  packageJson.version = packageJson.version.substring(0, indexOfDash);
}

// modify package.json by key/value pairs.
const cnt = process.argv.length;

if (cnt % 2 === 1) {
  console.log("Format error, expect even argv length!");
  process.exit(1);
}

for (let i = 3; i < cnt; i += 2) {
  packageJson[process.argv[i - 1]] = process.argv[i];
}

fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2) + "\n");
