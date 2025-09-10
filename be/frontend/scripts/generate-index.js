const fs = require('fs');
const path = require('path');

// Script to generate index.html in build directory
// Run this after cloning the repository and before starting the app

const buildDir = path.join(__dirname, '..', 'build');
const indexPath = path.join(buildDir, 'index.html');

// Create build directory if it doesn't exist
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// HTML template for the React app
const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="IoT NOVA Admin Dashboard - Monitor and manage your IoT devices"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <link 
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
      rel="stylesheet"
    />
    <title>IoT NOVA Admin Dashboard</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <!--
      This HTML file is a template.
      If you open it directly in the browser, you will see an empty page.

      You can add webfonts, meta tags, or analytics to this file.
      The build step will place the bundled scripts into the <body> tag.

      To begin the development, run \`npm start\` or \`yarn start\`.
      To create a production bundle, use \`npm run build\` or \`yarn build\`.
    -->
    <script 
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js">
    </script>
  </body>
</html>`;

// Write the HTML file
try {
  fs.writeFileSync(indexPath, htmlTemplate, 'utf8');
  console.log('✅ index.html generated successfully in build directory');
  console.log(`📁 File location: ${indexPath}`);
} catch (error) {
  console.error('❌ Error generating index.html:', error.message);
  process.exit(1);
}

// Also copy static files if they exist
const publicDir = path.join(__dirname, '..', 'public');
const staticFiles = ['favicon.ico', 'logo192.png', 'logo512.png', 'manifest.json'];

staticFiles.forEach(file => {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`📄 Copied ${file} to build directory`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not copy ${file}:`, error.message);
    }
  }
});

console.log('\n🚀 Setup complete! You can now run:');
console.log('   npm start     - Start development server');
console.log('   npm run build - Create production build');