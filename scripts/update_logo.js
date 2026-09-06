const fs = require("fs");
const path = require("path");

// 1. Update Dashboard.js
const dashPath = path.join(__dirname, "..", "src", "components", "Dashboard", "Dashboard.js");
let dashContent = fs.readFileSync(dashPath, "utf8");

// Replace Header Brand SVG with img
const headerBrandSvgRegex = /<div className="brand-icon">[\s\S]*?<\/svg>\s*<\/div>/;
const headerBrandImgReplacement = `<div className="brand-icon">
              <img src="/sgp-emblem.png" alt="SGP Emblem" className="brand-logo-img" />
            </div>`;

if (dashContent.match(headerBrandSvgRegex)) {
  dashContent = dashContent.replace(headerBrandSvgRegex, headerBrandImgReplacement);
  console.log("Replaced header brand SVG in Dashboard.js");
} else {
  console.log("Header brand SVG pattern not found in Dashboard.js");
}

// Replace Footer Brand SVG with img
const footerBrandSvgRegex = /<div className="edura-brand-icon">[\s\S]*?<\/svg>\s*<\/div>/;
const footerBrandImgReplacement = `<div className="edura-brand-icon">
                <img src="/sgp-emblem.png" alt="SGP Logo" className="footer-logo-img" />
              </div>`;

if (dashContent.match(footerBrandSvgRegex)) {
  dashContent = dashContent.replace(footerBrandSvgRegex, footerBrandImgReplacement);
  console.log("Replaced footer brand SVG in Dashboard.js");
} else {
  console.log("Footer brand SVG pattern not found in Dashboard.js");
}

fs.writeFileSync(dashPath, dashContent, "utf8");

// 2. Update Dashboard.css
const cssPath = path.join(__dirname, "..", "src", "components", "Dashboard", "Dashboard.css");
let cssContent = fs.readFileSync(cssPath, "utf8");

// Ensure .brand-logo-img and .footer-logo-img styles exist
if (!cssContent.includes(".brand-logo-img")) {
  const brandIconExtra = `
.brand-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.footer-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
`;
  cssContent += brandIconExtra;
  fs.writeFileSync(cssPath, cssContent, "utf8");
  console.log("Added logo image css to Dashboard.css");
}

// 3. Update ScholarshipImportants.js
const siPath = path.join(__dirname, "..", "src", "components", "ScholarshipImportants", "ScholarshipImportants.js");
if (fs.existsSync(siPath)) {
  let siContent = fs.readFileSync(siPath, "utf8");
  const siIconRegex = /<div className="si-brand-icon">.*?<\/div>/;
  const siIconReplacement = `<div className="si-brand-icon"><img src="/sgp-emblem.png" alt="SGP Emblem" style={{width:"100%", height:"100%", objectFit:"cover", borderRadius:"10px"}} /></div>`;
  if (siContent.match(siIconRegex)) {
    siContent = siContent.replace(siIconRegex, siIconReplacement);
    fs.writeFileSync(siPath, siContent, "utf8");
    console.log("Updated ScholarshipImportants.js header logo");
  }
}

console.log("All updates completed successfully!");
