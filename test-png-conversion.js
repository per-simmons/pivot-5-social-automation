// Test PNG conversion from SVG
// Run with: node test-png-conversion.js
// This uses sharp to convert SVG to PNG

const fs = require('fs');
const sharp = require('sharp');

async function convertSvgToPng() {
  console.log("🖼️  Testing SVG to PNG Conversion");
  console.log("====================================\n");

  const ratios = ["4-5", "1-1", "9-16"];

  for (const ratio of ratios) {
    const svgPath = `./test-output-${ratio}.svg`;
    const pngPath = `./test-output-${ratio}.png`;

    console.log(`🔄 Converting ${ratio.replace("-", ":")}...`);

    try {
      // Read SVG file
      const svgBuffer = fs.readFileSync(svgPath);

      // Convert to PNG using sharp
      await sharp(svgBuffer)
        .png()
        .toFile(pngPath);

      // Get file size
      const stats = fs.statSync(pngPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);

      console.log(`   ✅ PNG saved: ${pngPath} (${fileSizeKB} KB)`);

      // Get image metadata
      const metadata = await sharp(pngPath).metadata();
      console.log(`   📐 Dimensions: ${metadata.width}x${metadata.height}`);
      console.log("");
    } catch (error) {
      console.error(`   ❌ Failed to convert ${ratio}:`, error.message);
      console.log("");
    }
  }

  console.log("====================================");
  console.log("✨ PNG conversion complete!\n");
  console.log("📸 Generated PNG files:");
  console.log("   - test-output-4-5.png (Instagram Portrait)");
  console.log("   - test-output-1-1.png (Square Post)");
  console.log("   - test-output-9-16.png (Story/Reels)\n");
  console.log("💡 Open the PNG files to verify:");
  console.log("   ✓ Pivot 5 logo is sharp and clear in top-right");
  console.log("   ✓ Gradient overlay is smooth");
  console.log("   ✓ Category and headline text have proper spacing");
  console.log("   ✓ All text is readable and crisp");
}

// Run the conversion
convertSvgToPng().catch((error) => {
  console.error("❌ Conversion failed:", error);
  process.exit(1);
});
