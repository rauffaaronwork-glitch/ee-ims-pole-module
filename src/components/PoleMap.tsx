"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { poleIcon } from "@/lib/poleIcon";
import { TILES } from "@/lib/mapTiles";
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
        attribution={TILES.street.attribution}
        url={TILES.street.url}
        maxNativeZoom={TILES.street.maxNativeZoom}
        maxZoom={20}
        className={TILES.street.className}
      />
      {poles.map((p) => {
        const isSel = p.id === selectedId;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={poleIcon(STATUS_META[p.status].color, isSel ? 34 : p.transformerKVA ? 24 : 20, isSel ? "#ffffff" : "#111")}
            zIndexOffset={isSel ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Tooltip direction="top">
              <span className="font-mono">{p.poleNumber}</span>
              {p.transformerKVA ? ` · ${p.transformerKVA} kVA` : ""}
            </Tooltip>
          </Marker>
        );
      })}
      <FlyTo pole={selected} />
    </MapContainer>
  );
}
