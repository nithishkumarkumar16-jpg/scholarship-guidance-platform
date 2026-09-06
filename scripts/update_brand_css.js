const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "..", "src", "components", "Dashboard", "Dashboard.css");
let css = fs.readFileSync(cssPath, "utf8");

// Update .brand-icon
css = css.replace(
  /\.brand-icon\s*\{[^}]*\}/,
  `.brand-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.25), 0 6px 18px rgba(22, 47, 118, 0.45);
  overflow: hidden;
  background: #162F76;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.brand-icon:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4), 0 10px 24px rgba(22, 47, 118, 0.55);
}`
);

// Update .edura-brand-icon
css = css.replace(
  /\.edura-brand-icon\s*\{[^}]*\}/,
  `.edura-brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(22, 47, 118, 0.45);
  flex-shrink: 0;
  background: #162F76;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}`
);

fs.writeFileSync(cssPath, css, "utf8");
console.log("Updated Dashboard.css brand-icon styles");
