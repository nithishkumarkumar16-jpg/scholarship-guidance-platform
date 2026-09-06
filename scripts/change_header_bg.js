const fs = require("fs");
const path = require("path");

const filesToUpdate = [
  path.join(__dirname, "..", "src", "components", "Dashboard", "Dashboard.css"),
  path.join(__dirname, "..", "src", "components", "DocumentUpload", "DocumentUpload.css"),
  path.join(__dirname, "..", "src", "components", "EligibilityEngine", "EligibilityEngine.css"),
  path.join(__dirname, "..", "src", "components", "ReadinessDashboard", "ReadinessDashboard.css"),
  path.join(__dirname, "..", "src", "components", "RenewalAlert", "RenewalAlert.css"),
  path.join(__dirname, "..", "src", "components", "Reports", "Reports.css"),
  path.join(__dirname, "..", "src", "components", "ScholarshipImportants", "ScholarshipImportants.css"),
  path.join(__dirname, "..", "src", "components", "ScholarshipChat", "ScholarshipChat.css")
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    content = content.replace(/#311161/g, "#162F76");
    content = content.replace(/rgba\(49,\s*17,\s*97,/g, "rgba(22, 47, 118,");
    fs.writeFileSync(file, content, "utf8");
    console.log("Updated: " + path.basename(file));
  }
});

console.log("All header background colors updated successfully!");
