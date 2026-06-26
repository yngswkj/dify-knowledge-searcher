const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rendererDir = path.join(__dirname, "..", "src", "renderer");

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return collect(full);
    return /\.(c|m)?js$/.test(entry.name) ? [full] : [];
  });
}

const files = collect(rendererDir);

if (files.length === 0)
  throw new Error("No renderer scripts found under src/renderer.");

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`renderer syntax ok (${files.length} file${files.length === 1 ? "" : "s"})`);
