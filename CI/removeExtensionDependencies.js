const fs = require("fs");
const packageJson = JSON.parse(fs.readFileSync("package.json"));
packageJson.extensionDependencies = [];
fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2) + "\n");