"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export interface LatLng {
  lat: number;
  lng: number;
}

const TILES = {
  street: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 20,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 19,
  },
} as const;

// CSS pin instead of Leaflet's default PNG icon (those break under bundlers)
const PIN = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:28px;height:28px;transform:translate(-14px,-28px)">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#f5b301" stroke="#111" stroke-width="1.5">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="#111"/>
    </svg></div>`,
  iconSize: [0, 0],
});

/**
 * Reads coordinates out of pasted text:
 *   "17.6132, 121.7270"   "17.6132 121.7270"
 *   Google Maps links: .../@17.6132,121.7270,18z   ?q=17.6132,121.7270   !3d17.6132!4d121.7270
 * Short links (maps.app.goo.gl) don't contain coordinates, so they return null.
 */
export function parseCoords(text: string): LatLng | null {
  const t = text.trim();
  const pats = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // exact pin in place URLs
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // map view centre
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/, // plain "lat, lng"
  ];
  for (const re of pats) {
    const m = t.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

function ClickToPlace({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FollowValue({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value && !map.getBounds().pad(-0.2).contains([value.lat, value.lng])) {
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 18));
    }
  }, [value, map]);
  return null;
}

export default function LocationPicker({
  value,
  center,
  onChange,
}: {
  value: LatLng | null;
  center: [number, number];
  onChange: (p: LatLng) => void;
}) {
  const [layer, setLayer] = useState<keyof typeof TILES>("satellite");
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState("");
  const tiles = TILES[layer];

  function applyPaste() {
    if (/goo\.gl|maps\.app/i.test(paste)) {
      setPasteError("Short links don't include coordinates. In Google Maps, long-press the pole, then copy the numbers shown at the top (e.g. 17.6132, 121.7270).");
      return;
    }
    const p = parseCoords(paste);
    if (!p) {
      setPasteError("Couldn't find coordinates. Paste something like 17.6132, 121.7270 or a full Google Maps link.");
      return;
    }
    setPasteError("");
    setPaste("");
    onChange(p);
  }

  return (
    <div className="space-y-3">
      <div className="relative h-72 overflow-hidden rounded-xl border border-ims-line sm:h-80">
        <MapContainer center={value ? [value.lat, value.lng] : center} zoom={value ? 19 : 16} maxZoom={21} className="h-full w-full">
          <TileLayer key={layer} url={tiles.url} attribution={tiles.attribution} maxNativeZoom={tiles.maxNativeZoom} maxZoom={21} />
          <ClickToPlace onPick={onChange} />
          <FollowValue value={value} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={PIN}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  onChange({ lat: ll.lat, lng: ll.lng });
                },
              }}
            />
          )}
        </MapContainer>
        <div className="absolute right-2 top-2 z-[1000] flex overflow-hidden rounded-lg border border-ims-line bg-ims-panel/95 text-xs">
          {(["satellite", "street"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setLayer(k)}
              className={`px-2.5 py-1.5 capitalize ${layer === k ? "bg-ims-amber text-black" : "text-gray-300"}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ims-muted">Tap the map where the pole is, or drag the pin. Zoom in on Satellite to see the pole itself.</p>
      <div className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Or paste coordinates / a Google Maps link"
          value={paste}
          onChange={(e) => { setPaste(e.target.value); setPasteError(""); }}
          onKeyDown={(e) => e.key === "Enter" && applyPaste()}
        />
        <button type="button" onClick={applyPaste} disabled={!paste.trim()} className="btn-ghost px-3 py-2 text-sm disabled:opacity-50">
          Use
        </button>
      </div>
      {pasteError && <p className="text-sm text-amber-300">{pasteError}</p>}
    </div>
  );
}
