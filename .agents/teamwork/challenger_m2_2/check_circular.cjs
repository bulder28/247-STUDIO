const fs = require("fs");
const path = require("path");

const srcDir = path.resolve(__dirname, "../../../src");

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getFiles(srcDir);
const graph = new Map();

files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  const imports = [];
  // match import ... from '...' and import('...')
  const regex = /(?:from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (importPath.startsWith("@/") || importPath.startsWith("./") || importPath.startsWith("../")) {
      let resolved;
      if (importPath.startsWith("@/")) {
        resolved = path.resolve(srcDir, importPath.slice(2));
      } else {
        resolved = path.resolve(path.dirname(file), importPath);
      }
      // resolve extensions
      const candidates = [
        resolved,
        resolved + ".ts",
        resolved + ".tsx",
        path.join(resolved, "index.ts"),
        path.join(resolved, "index.tsx"),
      ];
      const found = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (found) {
        imports.push(found);
      }
    }
  }
  graph.set(file, imports);
});

// Detect cycles via DFS
const cycles = [];
const visited = new Set();
const recStack = new Set();
const currentPath = [];

function dfs(node) {
  visited.add(node);
  recStack.add(node);
  currentPath.push(node);

  const neighbors = graph.get(node) || [];
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      dfs(neighbor);
    } else if (recStack.has(neighbor)) {
      const cycleStartIdx = currentPath.indexOf(neighbor);
      const cycle = currentPath.slice(cycleStartIdx).concat(neighbor);
      cycles.push(cycle.map((p) => path.relative(srcDir, p)));
    }
  }

  currentPath.pop();
  recStack.delete(node);
}

for (const file of graph.keys()) {
  if (!visited.has(file)) {
    dfs(file);
  }
}

if (cycles.length > 0) {
  console.log(`Detected ${cycles.length} circular dependencies:`);
  cycles.forEach((c, i) => console.log(`Cycle ${i + 1}: ${c.join(" -> ")}`));
} else {
  console.log(`0 circular dependencies detected among ${files.length} source files!`);
}
