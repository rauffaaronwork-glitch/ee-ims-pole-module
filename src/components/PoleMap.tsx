"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { Pole } from "@/lib/types";
import { STATUS_META } from "@/lib/store";
import { MAP_CENTER } from "@/lib/mock";

function FlyTo({ pole }: { pole?: Pole }) {
  const map = useMap();
  useEffect(() => {
    if (pole) map.flyTo([pole.lat, pole.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [pole, map]);
  return null;
}

export default function PoleMap({
  poles,
  selectedId,
  onSelect,
}: {
  poles: Pole[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const selected = poles.find((p) => p.id === selectedId);
  return (
    <MapContainer center={MAP_CENTER} zoom={15} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {poles.map((p) => {
        const isSel = p.id === selectedId;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={isSel ? 11 : p.transformerKVA ? 8 : 6}
            pathOptions={{
              color: isSel ? "#ffffff" : STATUS_META[p.status].color,
              weight: isSel ? 3 : 1.5,
              fillColor: STATUS_META[p.status].color,
              fillOpacity: 0.85,
            }}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="font-mono">{p.poleNumber}</span>
              {p.transformerKVA ? ` · ${p.transformerKVA} kVA` : ""}
            </Tooltip>
          </CircleMarker>
        );
      })}
      <FlyTo pole={selected} />
    </MapContainer>
  );
}
