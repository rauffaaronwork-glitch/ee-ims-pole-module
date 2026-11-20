import L from "leaflet";

/**
 * Vector utility-pole marker: pole, crossarm with insulators, braces, ground shadow.
 * The icon is anchored at the BASE of the pole, so the exact coordinate is
 * where the pole meets the ground (not the middle of the drawing).
 */
export function poleSvg(color: string, w = 32, outline = "#111") {
  const h = Math.round((w * 48) / 32);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 48" width="${w}" height="${h}">
  <ellipse cx="16" cy="45.6" rx="7" ry="2.1" fill="rgba(0,0,0,.45)"/>
  <path d="M14.7 3.5h2.6l1 41.8h-4.6z" fill="${color}" stroke="${outline}" stroke-width="1.3" stroke-linejoin="round"/>
  <rect x="3.5" y="9" width="25" height="3.2" rx="1" fill="${color}" stroke="${outline}" stroke-width="1.3"/>
  <path d="M14.8 18.5 7.5 12.2M17.2 18.5l7.3-6.3" stroke="${outline}" stroke-width="1.3" stroke-linecap="round"/>
  <rect x="5" y="4.6" width="2.8" height="4.6" rx="1.1" fill="#e5e7eb" stroke="${outline}" stroke-width=".9"/>
  <rect x="24.2" y="4.6" width="2.8" height="4.6" rx="1.1" fill="#e5e7eb" stroke="${outline}" stroke-width=".9"/>
  <rect x="14.6" y=".5" width="2.8" height="3.6" rx="1.1" fill="#e5e7eb" stroke="${outline}" stroke-width=".9"/>
</svg>`;
}

const cache = new Map<string, L.DivIcon>();

/** Leaflet icon for a pole. `size` is the width in px; height is 1.5x. */
export function poleIcon(color: string, size = 32, outline = "#111"): L.DivIcon {
  const key = `${color}|${size}|${outline}`;
  let icon = cache.get(key);
  if (!icon) {
    const h = Math.round(size * 1.5);
    icon = L.divIcon({
      className: "pole-marker",
      html: poleSvg(color, size, outline),
      iconSize: [size, h],
      iconAnchor: [size / 2, Math.round((h * 45.3) / 48)], // base of the pole
      tooltipAnchor: [0, -h * 0.8],
    });
    cache.set(key, icon);
  }
  return icon;
}
