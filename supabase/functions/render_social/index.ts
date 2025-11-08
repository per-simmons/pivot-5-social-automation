// Pivot 5 Social Media Image Compositor
// Supabase Edge Function: render_social

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Import svg2png-wasm for SVG to PNG conversion
import initWasm, { svg2png } from "npm:svg2png-wasm@1.4.1";

interface RenderRequest {
  ratio: "4:5" | "1:1" | "9:16";
  imageUrl: string;
  category: string;
  headline: string;
  footer?: string; // Optional footer text
  focal?: [number, number]; // Focal point for image cropping [x, y] as 0-1 values
  postId: string;
}

interface RatioTemplate {
  ratio: string;
  name: string;
  width: number;
  height: number;
  platform: string;
  layout: {
    branding: BrandingBlock;
    gradient: {
      x1: string;
      y1: string;
      x2: string;
      y2: string;
      stops: Array<{ offset: string; color: string; opacity: number }>;
    };
    text: {
      category: TextBlock;
      headline: TextBlock;
      footer: TextBlock;
    };
  };
}

interface TextBlock {
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
  letterSpacing?: string;
}

interface BrandingBlock {
  type: "image" | "text";
  imagePath?: string;
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
  textAnchor?: string;
}

// Initialize WASM for svg2png
await initWasm();

serve(async (req) => {
  try {
    // Validate service role authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      ratio,
      imageUrl,
      category,
      headline,
      footer = "",
      focal = [0.5, 0.5],
      postId,
    }: RenderRequest = await req.json();

    // Load ratio template
    const templatePath = `./templates/ratios/${ratio.replace(":", "-")}.json`;
    const templateData = await Deno.readTextFile(templatePath);
    const template: RatioTemplate = JSON.parse(templateData);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Fetch background image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    // Wrap and fit text
    const wrappedHeadline = wrapText(
      headline,
      template.layout.text.headline.maxWidth || 1000,
      template.layout.text.headline.fontSize,
      template.layout.text.headline.fontWeight
    );

    // Load logo if branding type is image
    let logoBase64: string | undefined;
    if (template.layout.branding.type === "image" && template.layout.branding.imagePath) {
      try {
        const logoPath = template.layout.branding.imagePath.replace("./", "./templates/ratios/");
        const logoData = await Deno.readFile(logoPath);
        logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoData)));
      } catch (error) {
        console.error("Failed to load logo:", error);
      }
    }

    // Generate SVG with background image, gradient, and text
    const svg = generateSVG(
      template,
      imageBase64,
      category,
      wrappedHeadline,
      footer,
      logoBase64
    );

    // Convert SVG to PNG using svg2png-wasm
    const pngBuffer = await svg2png(
      new TextEncoder().encode(svg),
      {
        width: template.width,
        height: template.height,
      }
    );

    // Generate storage path
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const storagePath = `pivot5/social/${year}/${month}/${postId}/${ratio}/v1.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pivot5")
      .upload(storagePath.replace("pivot5/", ""), pngBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("pivot5")
      .getPublicUrl(uploadData.path);

    return new Response(
      JSON.stringify({
        path: storagePath,
        publicUrl: urlData.publicUrl,
        width: template.width,
        height: template.height,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in render_social:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// Helper: Simple text wrapping (approximation based on average character width)
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: string
): string[] {
  const avgCharWidth = fontSize * 0.5; // Approximate character width
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

// Helper: Generate SVG with all layers
function generateSVG(
  template: RatioTemplate,
  imageBase64: string,
  category: string,
  headlineLines: string[],
  footer: string,
  logoBase64?: string
): string {
  const { width, height, layout } = template;
  const { branding, gradient, text } = layout;

  // Build gradient stops
  const gradientStops = gradient.stops
    .map(
      (stop) =>
        `<stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="${stop.opacity}"/>`
    )
    .join("\n    ");

  // Build headline text blocks
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
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
