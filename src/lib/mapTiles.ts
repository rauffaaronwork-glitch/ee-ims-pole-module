// Free map tiles that need no API key.
// (CARTO's basemaps started requiring a key, so we use OpenStreetMap directly
// and darken it with CSS: see `.tiles-dark` in globals.css.)
export const TILES = {
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    className: "tiles-dark",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 18, // Esri has no imagery past z18 in much of Cagayan; upscale instead
    className: "",
  },
} as const;

export type TileKey = keyof typeof TILES;
