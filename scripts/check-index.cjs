const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const match = html.match(/<script>([\s\S]*)<\/script>/);

if (!match)
  throw new Error("index.html script tag was not found.");

new Function(match[1]);
console.log("index.html script syntax ok");
