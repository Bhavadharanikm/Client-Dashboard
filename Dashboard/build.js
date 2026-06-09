const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');

// Clean and recreate dist folder
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

// Files/folders to copy as-is (no minification)
const COPY_AS_IS = [
  'index.html',
  'dashboard.config.js',
  'dashboard.html',
  'assets',
  'Pricing Tool Files'
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy static assets
for (const item of COPY_AS_IS) {
  copyRecursive(path.join(__dirname, item), path.join(DIST, item));
}

// JS files to minify
const JS_FILES = [
  'dashboard.js',
  'Pricing Tool Files/pricing-tool.js'
];

const TERSER_OPTIONS = {
  compress: {
    dead_code: true,
    drop_console: false,
    passes: 2
  },
  mangle: {
    toplevel: false
  },
  format: {
    comments: false
  }
};

(async () => {
  for (const file of JS_FILES) {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(DIST, file);
    if (!fs.existsSync(srcPath)) continue;

    const source = fs.readFileSync(srcPath, 'utf8');
    const result = await minify(source, TERSER_OPTIONS);

    if (result.error) {
      console.error(`Error minifying ${file}:`, result.error);
      process.exit(1);
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, result.code, 'utf8');
    const orig = (source.length / 1024).toFixed(1);
    const mini = (result.code.length / 1024).toFixed(1);
    console.log(`✓ ${file}: ${orig}KB → ${mini}KB`);
  }

  console.log('\nBuild complete → dist/');
})();
