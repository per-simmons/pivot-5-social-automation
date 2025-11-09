// Pivot 5 Social Media Image Compositor
// Supabase Edge Function: render_social
// Generates SVG images (PNG conversion handled by Cloudflare Worker)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { encode, decode as decodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import opentype from "https://esm.sh/opentype.js@1.3.4";
import {
  INTER_REGULAR_BASE64,
  INTER_BOLD_BASE64,
  VCR_OSD_MONO_BASE64,
  HELVETICA_COMPRESSED_BASE64,
} from "./fonts.ts";
import { PIVOT_LOGO_BASE64 } from "./logo.ts";

interface RenderRequest {
  ratio: "4:5" | "1:1" | "9:16" | "1200x627" | "1080x1350";
  imageUrl: string;
  category: string;
  headline: string;
  footer?: string;
  postId: string;
}

// Embedded templates
const FONT_FAMILY = "'Pivot Sans', sans-serif";

const BASE_TEMPLATES = {
  "4:5": {
    "ratio": "4:5",
    "name": "Instagram Portrait",
    "width": 1080,
    "height": 1350,
    "platform": "instagram",
    "layout": {
      "branding": { "type": "logo", "x": 30, "y": 22, "width": 280 },
      "gradient": {
        "x1": "0%",
        "y1": "0%",
        "x2": "0%",
        "y2": "100%",
        "stops": [
          { "offset": "0%", "color": "#000000", "opacity": 0.0 },
          { "offset": "40%", "color": "#000000", "opacity": 0.1 },
          { "offset": "70%", "color": "#000000", "opacity": 0.6 },
          { "offset": "100%", "color": "#000000", "opacity": 0.92 }
        ]
      },
      "text": {
        "category": {
          "x": 70,
          "y": 1050,
          "fontSize": 22,
          "fontFamily": FONT_FAMILY,
          "fontKey": "mono",
          "fontWeight": 600,
          "fill": "#FFFFFF",
          "textAnchor": "start",
          "letterSpacing": "0.1em"
        },
        "headline": {
          "x": 70,
          "y": 1120,
          "maxWidth": 900,
          "maxHeight": 200,
          "fontSize": 58,
          "fontFamily": FONT_FAMILY,
          "fontKey": "compressed",
          "fontWeight": 700,
          "fill": "#FFFFFF",
          "lineHeight": 1.15,
          "textAnchor": "start"
        },
        "footer": {
          "x": 60,
          "y": 1310,
          "fontSize": 16,
          "fontFamily": FONT_FAMILY,
          "fontWeight": 400,
          "fill": "#CCCCCC",
          "textAnchor": "start"
        }
      }
    }
  },
  "1:1": {
    "ratio": "1:1",
    "name": "Square Post",
    "width": 1080,
    "height": 1080,
    "platform": "linkedin",
    "layout": {
      "branding": { "type": "logo", "x": 30, "y": 22, "width": 250 },
      "gradient": {
        "x1": "0%",
        "y1": "0%",
        "x2": "0%",
        "y2": "100%",
        "stops": [
          { "offset": "0%", "color": "#000000", "opacity": 0.0 },
          { "offset": "40%", "color": "#000000", "opacity": 0.1 },
          { "offset": "70%", "color": "#000000", "opacity": 0.6 },
          { "offset": "100%", "color": "#000000", "opacity": 0.92 }
        ]
      },
      "text": {
        "category": {
          "x": 70,
          "y": 820,
          "fontSize": 20,
          "fontFamily": FONT_FAMILY,
          "fontKey": "mono",
          "fontWeight": 600,
          "fill": "#FFFFFF",
          "textAnchor": "start",
          "letterSpacing": "0.1em"
        },
        "headline": {
          "x": 70,
          "y": 875,
          "maxWidth": 1000,
          "maxHeight": 170,
          "fontSize": 48,
          "fontFamily": FONT_FAMILY,
          "fontKey": "compressed",
          "fontWeight": 700,
          "fill": "#FFFFFF",
          "lineHeight": 1.15,
          "textAnchor": "start"
        },
        "footer": {
          "x": 60,
          "y": 1040,
          "fontSize": 14,
          "fontFamily": FONT_FAMILY,
          "fontWeight": 400,
          "fill": "#CCCCCC",
          "textAnchor": "start"
        }
      }
    }
  },
  "9:16": {
    "ratio": "9:16",
    "name": "Story/Reels",
    "width": 1080,
    "height": 1920,
    "platform": "instagram_story",
    "layout": {
      "branding": { "type": "logo", "x": 30, "y": 26, "width": 260 },
      "gradient": {
        "x1": "0%",
        "y1": "0%",
        "x2": "0%",
        "y2": "100%",
        "stops": [
          { "offset": "0%", "color": "#000000", "opacity": 0.0 },
          { "offset": "50%", "color": "#000000", "opacity": 0.05 },
          { "offset": "75%", "color": "#000000", "opacity": 0.5 },
          { "offset": "100%", "color": "#000000", "opacity": 0.92 }
        ]
      },
      "text": {
        "category": {
          "x": 70,
          "y": 1600,
          "fontSize": 26,
          "fontFamily": FONT_FAMILY,
          "fontKey": "mono",
          "fontWeight": 600,
          "fill": "#FFFFFF",
          "textAnchor": "start",
          "letterSpacing": "0.1em"
        },
        "headline": {
          "x": 70,
          "y": 1675,
          "maxWidth": 980,
          "maxHeight": 210,
          "fontSize": 62,
          "fontFamily": FONT_FAMILY,
          "fontKey": "compressed",
          "fontWeight": 700,
          "fill": "#FFFFFF",
          "lineHeight": 1.15,
          "textAnchor": "start"
        },
        "footer": {
          "x": 60,
          "y": 1880,
          "fontSize": 18,
          "fontFamily": FONT_FAMILY,
          "fontWeight": 400,
          "fill": "#CCCCCC",
          "textAnchor": "start"
        }
      }
    }
  },
  "1200x627": {
    "ratio": "1200x627",
    "name": "Landscape Card",
    "width": 1200,
    "height": 627,
    "platform": "linkedin_landscape",
    "layout": {
      "branding": { "type": "logo", "x": 40, "y": 18, "width": 300 },
      "gradient": {
        "x1": "0%", "y1": "0%", "x2": "0%", "y2": "100%",
        "stops": [
          { "offset": "0%", "color": "#000000", "opacity": 0.0 },
          { "offset": "45%", "color": "#000000", "opacity": 0.2 },
          { "offset": "70%", "color": "#000000", "opacity": 0.65 },
          { "offset": "100%", "color": "#000000", "opacity": 0.95 }
        ]
      },
      "text": {
        "category": {
          "x": 70,
          "y": 460,
          "fontSize": 22,
          "fontFamily": FONT_FAMILY,
          "fontKey": "mono",
          "fontWeight": 600,
          "fill": "#FFFFFF",
          "textAnchor": "start",
          "letterSpacing": "0.12em"
        },
        "headline": {
          "x": 70,
          "y": 515,
          "maxWidth": 980,
          "maxHeight": 120,
          "fontSize": 60,
          "fontFamily": FONT_FAMILY,
          "fontKey": "compressed",
          "fontWeight": 700,
          "fill": "#FFFFFF",
          "lineHeight": 1.1,
          "textAnchor": "start"
        },
        "footer": {
          "x": 70,
          "y": 600,
          "fontSize": 20,
          "fontFamily": FONT_FAMILY,
          "fontWeight": 400,
          "fill": "#CCCCCC",
          "textAnchor": "start"
        }
      }
    }
  }
};

const TEMPLATES: Record<string, any> = {
  ...BASE_TEMPLATES,
  "1080x1350": BASE_TEMPLATES["4:5"],
};

const PLACEHOLDER_HEADLINES = new Set([
  "",
  "testing ai-powered social media automation",
  "testing ai pipeline",
  "testing after webhook update",
  "testing after webhook update v2",
  "test headline",
  "font embed test",
  "Helvetica compressed + logo".toLowerCase(),
]);

const HEADLINE_PATTERNS = [
  "Why {CATEGORY} teams pivot faster with AI workflows",
  "{CATEGORY} automation ideas for 2025 launches",
  "3 playbooks every {CATEGORY} founder needs this week",
  "The ultimate {CATEGORY} growth stack in 60 seconds",
  "From manual to magical: {CATEGORY} ops reimagined",
  "Daily rituals that keep {CATEGORY} strategy sharp",
  "Inside the Pivot 5 lab: {CATEGORY} trends to watch",
];

function resolveHeadline(input: string | undefined, category: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed || PLACEHOLDER_HEADLINES.has(trimmed.toLowerCase())) {
    return generateHeadline(category);
  }
  return trimmed;
}

function generateHeadline(category: string): string {
  const template = HEADLINE_PATTERNS[Math.floor(Math.random() * HEADLINE_PATTERNS.length)];
  const upper = category.toUpperCase();
  const titled = titleCase(category);
  return template.replace(/{CATEGORY}/g, upper).replace(/{Category}/g, titled);
}

function titleCase(input: string): string {
  return input.split(/\s+/).map(word => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "").join(" ").trim();
}

const FONT_FACE_STYLE = `
  @font-face {
    font-family: 'Pivot Sans';
    font-style: normal;
    font-weight: 400;
    src: url(data:font/ttf;base64,${INTER_REGULAR_BASE64.trim()}) format('truetype');
  }
  @font-face {
    font-family: 'Pivot Sans';
    font-style: normal;
    font-weight: 600;
    src: url(data:font/ttf;base64,${INTER_BOLD_BASE64.trim()}) format('truetype');
  }
  @font-face {
    font-family: 'Pivot Sans';
    font-style: normal;
    font-weight: 700;
    src: url(data:font/ttf;base64,${INTER_BOLD_BASE64.trim()}) format('truetype');
  }
  @font-face {
    font-family: 'Helvetica Compressed';
    font-style: normal;
    font-weight: 700;
    src: url(data:font/ttf;base64,${HELVETICA_COMPRESSED_BASE64.trim()}) format('truetype');
  }
  @font-face {
    font-family: 'VCR OSD Mono';
    font-style: normal;
    font-weight: 400;
    src: url(data:font/ttf;base64,${VCR_OSD_MONO_BASE64.trim()}) format('truetype');
  }
`;

serve(async (req) => {
  try{

    const { ratio, imageUrl, category, headline, footer = "", postId }: RenderRequest = await req.json();
    const template = TEMPLATES[ratio];

    if (!template) {
      throw new Error(`Invalid ratio: ${ratio}`);
    }

    // Fetch background image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Use Deno's base64 encoder instead of btoa to avoid stack overflow
    let imageMimeType = "image/png";
    const mimeHeader = imageResponse.headers.get("content-type");
    if (mimeHeader) {
      const firstPart = mimeHeader.split(";")[0].trim().toLowerCase();
      if (firstPart.startsWith("image/")) {
        imageMimeType = firstPart;
      }
    }
    const imageBase64 = encode(imageBuffer);

    const normalizedCategory = (category || "Insights").trim() || "Insights";
    const effectiveHeadline = resolveHeadline(headline, normalizedCategory);

    // Wrap text
    const wrappedHeadline = wrapText(
      effectiveHeadline,
      template.layout.text.headline.maxWidth || 1000,
      template.layout.text.headline.fontSize,
      template.layout.text.headline.fontWeight
    );

    // Generate SVG
    const svg = generateSVG(template, imageBase64, imageMimeType, normalizedCategory, wrappedHeadline, footer);

    // Return SVG (conversion to PNG will be done by Cloudflare Worker)
    return new Response(JSON.stringify({
      ratio,
      width: template.width,
      height: template.height,
      format: "svg",
      svg: svg,
      headline: effectiveHeadline,
      postId
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function wrapText(text: string, maxWidth: number, fontSize: number, fontWeight: string | number): string[] {
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

const FONT_PIVOT_SANS_REGULAR = parseFont(INTER_REGULAR_BASE64);
const FONT_PIVOT_SANS_BOLD = parseFont(INTER_BOLD_BASE64);
const FONT_VCR_OSD_MONO = parseFont(VCR_OSD_MONO_BASE64);
const FONT_HELVETICA_COMPRESSED = parseFont(HELVETICA_COMPRESSED_BASE64);
const LOGO_HEIGHT_RATIO = 625 / 1920;
const LOGO_IMAGE_HREF = `data:image/png;base64,${PIVOT_LOGO_BASE64.trim()}`;

function parseFont(base64Font: string) {
  const cleaned = base64Font.replace(/\s+/g, "");
  const bytes = decodeBase64(cleaned);
  return opentype.parse(bytes.buffer);
}

function selectFont(fontWeight: number, fontKey?: string) {
  if (fontKey === "compressed") {
    return FONT_HELVETICA_COMPRESSED;
  }
  if (fontKey === "mono") {
    return FONT_VCR_OSD_MONO;
  }
  return fontWeight >= 600 ? FONT_PIVOT_SANS_BOLD : FONT_PIVOT_SANS_REGULAR;
}

function createTextPathElements(templateConfig: any, lines: string[]): string {
  if (!templateConfig || !lines.length) return "";
  const weight = Number(templateConfig.fontWeight) || 400;
  const font = selectFont(weight, templateConfig.fontKey);
  const lineHeight = templateConfig.lineHeight || 1.2;
  const letterSpacingPx = letterSpacingToPixels(templateConfig.letterSpacing, templateConfig.fontSize);
  let currentY = templateConfig.y;
  const parts: string[] = [];

  for (const line of lines) {
    if (!line) {
      currentY += templateConfig.fontSize * lineHeight;
      continue;
    }
    const pathData = buildLinePath(font, line, templateConfig.x, currentY, templateConfig.fontSize, letterSpacingPx);
    parts.push(`<path d="${pathData}" fill="${templateConfig.fill}" />`);
    currentY += templateConfig.fontSize * lineHeight;
  }

  return parts.join("\n  ");
}

function buildLinePath(font: any, text: string, startX: number, baselineY: number, fontSize: number, letterSpacingPx: number): string {
  let cursorX = startX;
  const segments: string[] = [];
  const unitsPerEm = font.unitsPerEm || 1000;
  const scale = fontSize / unitsPerEm;

  for (const char of text) {
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(cursorX, baselineY, fontSize);
    segments.push(path.toPathData(3));
    const advanceWidth = glyph.advanceWidth || unitsPerEm;
    cursorX += advanceWidth * scale + letterSpacingPx;
  }

  return segments.join(" ");
}

function letterSpacingToPixels(letterSpacing: string | undefined, fontSize: number): number {
  if (!letterSpacing) return 0;
  if (letterSpacing.endsWith("em")) {
    return parseFloat(letterSpacing) * fontSize;
  }
  if (letterSpacing.endsWith("px")) {
    return parseFloat(letterSpacing);
  }
  const parsed = parseFloat(letterSpacing);
  return isNaN(parsed) ? 0 : parsed;
}

function renderBranding(branding: any): string {
  if (!branding) return "";
  if (branding.type === "logo") {
    const width = branding.width || 220;
    const height = branding.height || width * LOGO_HEIGHT_RATIO;
    const x = branding.x ?? 30;
    const y = branding.y ?? 24;
    return `<image href="${LOGO_IMAGE_HREF}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMinYMid meet"/>`;
  }
  if (branding.text) {
    return createTextPathElements(branding, [branding.text]);
  }
  return "";
}

function generateSVG(
  template: any,
  imageBase64: string,
  imageMimeType: string,
  category: string,
  headlineLines: string[],
  footer: string
): string {
  const { width, height, layout } = template;
  const { branding, gradient, text } = layout;

  const gradientStops = gradient.stops.map((stop: any) =>
    `<stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="${stop.opacity}"/>`
  ).join("\n    ");

  const brandingElement = renderBranding(branding);
  const textElements: string[] = [];
  textElements.push(createTextPathElements(text.category, [category.toUpperCase()]));
  if (headlineLines.length) {
    textElements.push(createTextPathElements(text.headline, headlineLines));
  }
  if (footer) {
    textElements.push(createTextPathElements(text.footer, [footer]));
  }
  const textLayer = textElements.filter(Boolean).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style><![CDATA[
${FONT_FACE_STYLE}
    ]]></style>
    <linearGradient id="textGradient" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}">
      ${gradientStops}
    </linearGradient>
  </defs>
  <image href="data:${imageMimeType};base64,${imageBase64}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="${width}" height="${height}" fill="url(#textGradient)"/>
  ${brandingElement}
  ${textLayer}
</svg>`;
}
