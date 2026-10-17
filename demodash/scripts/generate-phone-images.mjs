// Generates simple, license-free phone illustrations into public/phones/*.svg for the seed catalog.
// Replace them with real photos via the admin "Add / edit product" screen.
import { mkdirSync, writeFileSync } from "node:fs";

const phones = [
  ["redmi-13c", "#3b82f6", "#1e3a8a", 2],
  ["galaxy-m35", "#8b5cf6", "#4c1d95", 3],
  ["narzo-70", "#10b981", "#065f46", 2],
  ["vivo-t3", "#f59e0b", "#92400e", 2],
  ["nord-ce4", "#6366f1", "#312e81", 2],
  ["pixel-8a", "#e5e7eb", "#6b7280", 2],
  ["iphone-15", "#f9a8d4", "#9d174d", 2],
  ["galaxy-s24", "#a78bfa", "#3730a3", 3],
  ["oneplus-12", "#14b8a6", "#134e4a", 3],
  ["iphone-15-pro", "#a8a29e", "#292524", 3],
];

mkdirSync("public/phones", { recursive: true });

for (const [slug, c1, c2, cams] of phones) {
  const lenses = Array.from({ length: cams }, (_, i) => `<circle cx="${176 + (i % 2) * 38}" cy="${96 + Math.floor(i / 2) * 38 + (cams === 2 ? 0 : 0)}" r="15" fill="#0b0b12" stroke="#ffffff55" stroke-width="3"/><circle cx="${176 + (i % 2) * 38}" cy="${96 + Math.floor(i / 2) * 38}" r="6" fill="#2b2b45"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${slug}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f1ff"/><stop offset="1" stop-color="#e9e3ff"/></linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <ellipse cx="200" cy="372" rx="90" ry="9" fill="#2c187022"/>
  <g transform="rotate(-8 200 200)">
    <rect x="132" y="34" width="136" height="316" rx="26" fill="url(#g)"/>
    <rect x="132" y="34" width="136" height="316" rx="26" fill="none" stroke="#ffffff66" stroke-width="2"/>
    <rect x="160" y="62" width="${cams > 2 ? 78 : 78}" height="${cams > 2 ? 86 : 52}" rx="16" fill="#00000030"/>
    ${lenses}
    <circle cx="246" cy="76" r="4" fill="#fff9"/>
    <rect x="186" y="318" width="28" height="4" rx="2" fill="#ffffff66"/>
  </g>
</svg>`;
  writeFileSync(`public/phones/${slug}.svg`, svg);
}
console.log(`Wrote ${phones.length} phone images to public/phones`);
