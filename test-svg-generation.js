// Simple Node.js test for SVG generation
// Run with: node test-svg-generation.js
// This will generate SVG files to verify gradient and text layers

const fs = require('fs');
const https = require('https');

// Helper: Simple text wrapping
function wrapText(text, maxWidth, fontSize, fontWeight) {
  const avgCharWidth = fontSize * 0.5;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// Helper: Generate SVG
function generateSVG(template, imageBase64, category, headlineLines, footer, logoBase64) {
  const { width, height, layout } = template;
  const { branding, gradient, text } = layout;

  const gradientStops = gradient.stops
    .map(
      (stop) =>
        `<stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="${stop.opacity}"/>`
    )
    .join("\n    ");

  const headlineText = headlineLines
    .map(
      (line, i) =>
        `<tspan x="${text.headline.x}" dy="${
          i === 0 ? 0 : text.headline.fontSize * (text.headline.lineHeight || 1.15)
        }">${escapeXml(line)}</tspan>`
    )
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="textGradient" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}">
      ${gradientStops}
    </linearGradient>
  </defs>

  <!-- Background Image -->
  <image href="data:image/png;base64,${imageBase64}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>

  <!-- Gradient Overlay -->
  <rect width="${width}" height="${height}" fill="url(#textGradient)"/>

  <!-- Branding -->
  ${branding.type === "image" && logoBase64
    ? `<image href="data:image/png;base64,${logoBase64}" x="${branding.x}" y="${branding.y}" width="${branding.width}" height="${branding.height}" preserveAspectRatio="xMidYMid meet"/>`
    : branding.type === "text"
    ? `<text x="${branding.x}" y="${branding.y}"
        font-family="${branding.fontFamily}"
        font-size="${branding.fontSize}"
        font-weight="${branding.fontWeight}"
        fill="${branding.fill}"
        text-anchor="${branding.textAnchor}">
    ${escapeXml(branding.text || "")}
  </text>`
    : ""}

  <!-- Category Label -->
  <text x="${text.category.x}" y="${text.category.y}"
        font-family="${text.category.fontFamily}"
        font-size="${text.category.fontSize}"
        font-weight="${text.category.fontWeight}"
        fill="${text.category.fill}"
        text-anchor="${text.category.textAnchor}"
        ${text.category.letterSpacing ? `letter-spacing="${text.category.letterSpacing}"` : ""}>
    ${escapeXml(category.toUpperCase())}
  </text>

  <!-- Headline -->
  <text x="${text.headline.x}" y="${text.headline.y}"
        font-family="${text.headline.fontFamily}"
        font-size="${text.headline.fontSize}"
        font-weight="${text.headline.fontWeight}"
        fill="${text.headline.fill}"
        text-anchor="${text.headline.textAnchor}">
    ${headlineText}
  </text>

  ${footer ? `<!-- Footer -->
  <text x="${text.footer.x}" y="${text.footer.y}"
        font-family="${text.footer.fontFamily}"
        font-size="${text.footer.fontSize}"
        font-weight="${text.footer.fontWeight}"
        fill="${text.footer.fill}"
        text-anchor="${text.footer.textAnchor}">
    ${escapeXml(footer)}
  </text>` : ""}
</svg>`;
}

// Helper: XML escape
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Download image and convert to base64
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(base64);
      });
      response.on('error', reject);
    });
  });
}

// Main test function
async function runTest() {
  console.log("🧪 Pivot 5 Social Media Compositor - SVG Generation Test");
  console.log("=========================================================\n");

  // Test configuration
  const testImageUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80";
  const category = "TOOLS";
  const headline = "Testing AI-Powered Social Media Automation";
  const footer = "";
  const ratios = ["4-5", "1-1", "9-16"];

  // Fetch test image
  console.log("📥 Fetching test image from Unsplash...");
  const imageBase64 = await downloadImage(testImageUrl);
  console.log("✅ Image downloaded\n");

  // Load logo
  console.log("📥 Loading Pivot 5 logo...");
  const logoBuffer = fs.readFileSync('./pivot-5-logo.png');
  const logoBase64 = logoBuffer.toString('base64');
  console.log("✅ Logo loaded\n");

  // Test each ratio
  for (const ratio of ratios) {
    console.log(`🎨 Testing ratio: ${ratio.replace("-", ":")}`);

    // Load template
    const templatePath = `./templates/ratios/${ratio}.json`;
    const templateData = fs.readFileSync(templatePath, 'utf8');
    const template = JSON.parse(templateData);

    // Wrap headline
    const wrappedHeadline = wrapText(
      headline,
      template.layout.text.headline.maxWidth || 1000,
      template.layout.text.headline.fontSize,
      template.layout.text.headline.fontWeight
    );

    // Generate SVG
    const svg = generateSVG(
      template,
      imageBase64,
      category,
      wrappedHeadline,
      footer,
      logoBase64
    );

    // Save SVG for inspection
    const svgPath = `./test-output-${ratio}.svg`;
    fs.writeFileSync(svgPath, svg);
    console.log(`   ✅ SVG saved: ${svgPath} (${template.width}x${template.height})`);
    console.log("");
  }

  console.log("=========================================================");
  console.log("✨ All tests complete!");
  console.log("\n📸 Generated SVG files:");
  console.log("   - test-output-4-5.svg (1080x1350 - Instagram Portrait)");
  console.log("   - test-output-1-1.svg (1080x1080 - Square)");
  console.log("   - test-output-9-16.svg (1080x1920 - Story/Reels)");
  console.log("\n💡 Open the SVG files in a browser to verify:");
  console.log("   ✓ Background image is visible");
  console.log("   ✓ Gradient overlay (transparent → dark) is applied");
  console.log("   ✓ \"Pivot 5\" branding appears in orange at top-left");
  console.log("   ✓ \"TOOLS\" category appears in VCR OSD Mono font");
  console.log("   ✓ Headline appears in Helvetica bold");
  console.log("   ✓ Footer appears at bottom");
}

// Run the test
runTest().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
