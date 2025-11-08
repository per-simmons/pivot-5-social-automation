// Local test for render_social Edge Function
// Tests SVG generation and PNG conversion without Supabase deployment
// Run with: deno run --allow-net --allow-read --allow-write test-local.ts

import initWasm, { svg2png } from "npm:svg2png-wasm@1.4.1";

interface RatioTemplate {
  ratio: string;
  name: string;
  width: number;
  height: number;
  platform: string;
  layout: {
    branding: {
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      fill: string;
      textAnchor: string;
    };
    gradient: {
      x1: string;
      y1: string;
      x2: string;
      y2: string;
      stops: Array<{ offset: string; color: string; opacity: number }>;
    };
    text: {
      category: {
        x: number;
        y: number;
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        fill: string;
        textAnchor: string;
        letterSpacing?: string;
      };
      headline: {
        x: number;
        y: number;
        maxWidth?: number;
        maxHeight?: number;
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        fill: string;
        lineHeight?: number;
        textAnchor: string;
      };
      footer: {
        x: number;
        y: number;
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        fill: string;
        textAnchor: string;
      };
    };
  };
}

// Helper: Simple text wrapping
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: string
): string[] {
  const avgCharWidth = fontSize * 0.5;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(" ");
  const lines: string[] = [];
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
function generateSVG(
  template: RatioTemplate,
  imageBase64: string,
  category: string,
  headlineLines: string[],
  footer: string
): string {
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
  <text x="${branding.x}" y="${branding.y}"
        font-family="${branding.fontFamily}"
        font-size="${branding.fontSize}"
        font-weight="${branding.fontWeight}"
        fill="${branding.fill}"
        text-anchor="${branding.textAnchor}">
    ${escapeXml(branding.text)}
  </text>

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

  <!-- Footer -->
  <text x="${text.footer.x}" y="${text.footer.y}"
        font-family="${text.footer.fontFamily}"
        font-size="${text.footer.fontSize}"
        font-weight="${text.footer.fontWeight}"
        fill="${text.footer.fill}"
        text-anchor="${text.footer.textAnchor}">
    ${escapeXml(footer)}
  </text>
</svg>`;
}

// Helper: XML escape
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Main test function
async function runTest() {
  console.log("🧪 Pivot 5 Social Media Compositor - Local Test");
  console.log("================================================\n");

  // Initialize WASM
  console.log("📦 Initializing svg2png-wasm...");
  await initWasm();
  console.log("✅ WASM initialized\n");

  // Test configuration
  const testImageUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80";
  const category = "TOOLS";
  const headline = "Testing AI-Powered Social Media Automation";
  const footer = "@pivot5 • pivot5.com";
  const ratios = ["4-5", "1-1", "9-16"];

  // Fetch test image
  console.log("📥 Fetching test image from Unsplash...");
  const imageResponse = await fetch(testImageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  console.log("✅ Image downloaded\n");

  // Test each ratio
  for (const ratio of ratios) {
    console.log(`🎨 Testing ratio: ${ratio.replace("-", ":")}`);

    // Load template
    const templatePath = `./templates/ratios/${ratio}.json`;
    const templateData = await Deno.readTextFile(templatePath);
    const template: RatioTemplate = JSON.parse(templateData);

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
      footer
    );

    // Save SVG for inspection
    const svgPath = `./test-output-${ratio}.svg`;
    await Deno.writeTextFile(svgPath, svg);
    console.log(`   📄 SVG saved: ${svgPath}`);

    // Convert to PNG
    console.log(`   🔄 Converting to PNG...`);
    const pngBuffer = await svg2png(
      new TextEncoder().encode(svg),
      {
        width: template.width,
        height: template.height,
      }
    );

    // Save PNG
    const pngPath = `./test-output-${ratio}.png`;
    await Deno.writeFile(pngPath, pngBuffer);
    console.log(`   ✅ PNG saved: ${pngPath} (${template.width}x${template.height})`);
    console.log("");
  }

  console.log("================================================");
  console.log("✨ All tests complete!");
  console.log("\n📸 Generated files:");
  console.log("   - test-output-4-5.svg / .png (1080x1350 - Instagram Portrait)");
  console.log("   - test-output-1-1.svg / .png (1080x1080 - Square)");
  console.log("   - test-output-9-16.svg / .png (1080x1920 - Story/Reels)");
  console.log("\n💡 Open the SVG files to inspect the gradient and text layers");
  console.log("💡 Open the PNG files to see the final rendered images");
}

// Run the test
if (import.meta.main) {
  try {
    await runTest();
  } catch (error) {
    console.error("❌ Test failed:", error);
    Deno.exit(1);
  }
}
