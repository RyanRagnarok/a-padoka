const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  if (file === 'Login.jsx') continue;

  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Add import
  if (!content.includes("import { apiFetch }")) {
    content = content.replace("import React", "import { apiFetch } from '../utils/api';\nimport React");
  }

  // Replace fetch with apiFetch
  content = content.replace(/fetch\(/g, "apiFetch(");

  // Strip VITE_API_URL
  content = content.replace(/import\.meta\.env\.VITE_API_URL \+ /g, "");
  content = content.replace(/\$\{import\.meta\.env\.VITE_API_URL\}/g, "");

  // Strip Authorization headers block if it's the only option
  content = content.replace(/,\s*\{\s*headers:\s*\{\s*'Authorization':\s*`Bearer \$\{token\}`\s*\}\s*\}/g, "");
  // Strip from apiFetch calls that have other options
  content = content.replace(/'Authorization':\s*`Bearer \$\{token\}`/g, "");

  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log("Refactoring complete");
