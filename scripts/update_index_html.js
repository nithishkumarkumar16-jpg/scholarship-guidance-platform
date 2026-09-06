const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "public", "index.html");
let html = fs.readFileSync(htmlPath, "utf8");

html = html.replace('<meta name="theme-color" content="#000000" />', '<meta name="theme-color" content="#162F76" />');
html = html.replace('content="Web site created using create-react-app"', 'content="SGP - Scholarship Guidance Platform. Smart Pre-Submission Verification System."');

fs.writeFileSync(htmlPath, html, "utf8");
console.log("Updated index.html meta tags");
