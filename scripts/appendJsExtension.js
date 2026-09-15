import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// tsc compiles with `moduleResolution: bundler`, so the emitted specifiers keep
// the extensionless form used in the sources. Node's ESM loader has no such
// resolver: a relative specifier must name a file, and a folder must be spelled
// out as its `index.js`. This pass rewrites the output to that form.

// The vite bundles land in dist/assets, after this script in a full build — but
// an incremental `compile:backend` sees them, and they are already resolved.
const SKIP_DIRS = [path.normalize('dist/assets')];

// Lenient: `import ... 'x'`, `export ... from 'x'` and the `import('x')` form
// that tsc emits for inline type references in .d.ts files.
const SPECIFIER = /(import\s.*?['"]|export\s.*?from\s+['"]|import\s*\(\s*['"])(\.[^'"]*)(['"])/g;

// Strict: only real statements, so a path inside a comment or a string literal
// cannot fail the build below.
const STATEMENT = /^[ \t]*(?:import|export)\s+(?:[^'"]*?\bfrom\s*)?['"](\.[^'"]*)['"]/gm;

const EXPLICIT_EXTENSION = /\.(js|mjs|cjs|json|node)$/;

// The specifier Node needs, or null when nothing on disk matches it.
function resolve(fromDir, specifier) {
  if (EXPLICIT_EXTENSION.test(specifier)) {
    return fs.existsSync(path.resolve(fromDir, specifier)) ? specifier : null;
  }

  const target = path.resolve(fromDir, specifier);
  if (fs.existsSync(target + '.js')) {
    return specifier + '.js';
  }
  // A directory import — unsupported in ESM, name its index file instead.
  if (fs.existsSync(path.join(target, 'index.js'))) {
    return specifier.replace(/\/+$/, '') + '/index.js';
  }
  return null;
}

const unresolved = [];

function appendJsExtension(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.includes(filePath)) {
        appendJsExtension(filePath);  // Recursively process directories
      }
    } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
      const original = fs.readFileSync(filePath, 'utf8');
      const fileDir = path.dirname(filePath);

      const content = original.replace(SPECIFIER, (match, prefix, specifier, quote) => {
        const resolved = resolve(fileDir, specifier);
        return resolved ? prefix + resolved + quote : match; // Leave unchanged if nothing matches
      });

      for (const [, specifier] of content.matchAll(STATEMENT)) {
        if (!resolve(fileDir, specifier)) {
          unresolved.push(`${filePath}: ${specifier}`);
        }
      }

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  });
}

// Process the 'dist' directory (or your compiled output directory)
appendJsExtension('./dist');

if (unresolved.length) {
  console.log(chalk.red('Specifiers Node cannot resolve at runtime:'));
  unresolved.forEach(entry => console.log(chalk.red(`  ${entry}`)));
  process.exit(1);
}
