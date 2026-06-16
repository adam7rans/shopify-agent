import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const PRODUCTS_JSON = path.join(process.cwd(), "data", "generated", "products.json");
const OUTPUT_DIR = path.join(process.cwd(), "public", "products");
const WIDTH = 600;
const HEIGHT = 600;

interface Product {
  handle: string;
  title: string;
  category: string;
  countryOfOrigin: string;
}

const CATEGORY_PALETTES: Record<string, { bg1: string; bg2: string; accent: string; emoji: string }> = {
  "Japanese gummies":           { bg1: "#fce4ec", bg2: "#f8bbd0", accent: "#e91e63", emoji: "🍬" },
  "Sour candy":                 { bg1: "#e8f5e9", bg2: "#c8e6c9", accent: "#4caf50", emoji: "🍋" },
  "Matcha chocolate/snacks":    { bg1: "#e8f5e9", bg2: "#a5d6a7", accent: "#2e7d32", emoji: "🍵" },
  "Korean gummies":             { bg1: "#e3f2fd", bg2: "#90caf9", accent: "#1565c0", emoji: "🇰🇷" },
  "Chocolate biscuit sticks":   { bg1: "#efebe9", bg2: "#d7ccc8", accent: "#795548", emoji: "🍫" },
  "Mochi candy":                { bg1: "#fce4ec", bg2: "#f48fb1", accent: "#c2185b", emoji: "🍡" },
  "Ramune / soda candy":        { bg1: "#e0f7fa", bg2: "#80deea", accent: "#00838f", emoji: "🥤" },
  "Hard candy":                 { bg1: "#fff8e1", bg2: "#ffe082", accent: "#f57f17", emoji: "🍭" },
  "Jelly candy":                { bg1: "#f3e5f5", bg2: "#ce93d8", accent: "#7b1fa2", emoji: "🫧" },
  "Character / kawaii candy":   { bg1: "#fce4ec", bg2: "#f8bbd0", accent: "#ad1457", emoji: "⭐" },
  "Variety boxes":              { bg1: "#fff3e0", bg2: "#ffcc80", accent: "#e65100", emoji: "📦" },
  "Seasonal limited editions":  { bg1: "#fce4ec", bg2: "#ef9a9a", accent: "#c62828", emoji: "🌸" },
  "Korean chocolate biscuits":  { bg1: "#efebe9", bg2: "#bcaaa4", accent: "#5d4037", emoji: "🍪" },
  "Korean snack puffs":         { bg1: "#fff8e1", bg2: "#ffe082", accent: "#ff8f00", emoji: "🧈" },
  "Korean hard candy":          { bg1: "#e0f7fa", bg2: "#4dd0e1", accent: "#006064", emoji: "🍬" },
  "Korean sour candy":          { bg1: "#f1f8e9", bg2: "#aed581", accent: "#558b2f", emoji: "😝" },
};

const DEFAULT_PALETTE = { bg1: "#f5f5f5", bg2: "#e0e0e0", accent: "#616161", emoji: "🍬" };

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildSvg(product: Product): string {
  const palette = CATEGORY_PALETTES[product.category] ?? DEFAULT_PALETTE;
  const lines = wrapText(product.title, 20);
  const lineHeight = 42;

  const totalTextHeight = lines.length * lineHeight;
  const titleY = 300 + (120 - totalTextHeight) / 2;

  const titleTspans = lines
    .map((line, i) => `<tspan x="300" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const origin = product.countryOfOrigin === "Japan" ? "Japan" : product.countryOfOrigin === "South Korea" ? "Korea" : product.countryOfOrigin;

  const initial = product.title.charAt(0).toUpperCase();

  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="100%" stop-color="${palette.bg2}" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" rx="24"/>
  <circle cx="300" cy="190" r="80" fill="${palette.accent}20"/>
  <circle cx="300" cy="190" r="56" fill="${palette.accent}35"/>
  <text x="300" y="210" text-anchor="middle" font-size="64" font-weight="bold" font-family="Arial, Helvetica, sans-serif" fill="${palette.accent}">${initial}</text>
  <text x="300" y="${titleY}" text-anchor="middle" font-size="32" font-weight="bold" font-family="Arial, Helvetica, sans-serif" fill="${palette.accent}">
    ${titleTspans}
  </text>
  <text x="300" y="${titleY + lines.length * lineHeight + 20}" text-anchor="middle" font-size="18" font-family="Arial, Helvetica, sans-serif" fill="${palette.accent}88">
    ${escapeXml(product.category)} · ${escapeXml(origin)}
  </text>
</svg>`;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const products = JSON.parse(readFileSync(PRODUCTS_JSON, "utf-8")) as Product[];

  let count = 0;
  for (const product of products) {
    const svg = buildSvg(product);
    const outputPath = path.join(OUTPUT_DIR, `${product.handle}.png`);
    await sharp(Buffer.from(svg)).png({ quality: 85 }).toFile(outputPath);
    count++;
  }

  console.log(`Generated ${count} product images in ${OUTPUT_DIR}`);
}

main().catch(console.error);
