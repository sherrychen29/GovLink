"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Report } from "@/lib/types";
import { CITY } from "@/lib/seed";
import { severityIcon } from "./markerIcon";

function FitToReports({ reports }: { reports: Report[] }) {
  const map = useMap();
  useEffect(() => {
    if (reports.length === 0) {
      map.setView([CITY.center.lat, CITY.center.lng], CITY.zoom);
      return;
    }
    const bounds = L.latLngBounds(
      reports.map((r) => [r.location.lat, r.location.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports.length]);
  return null;
}

function FlyToSelected({
  reports,
  selectedId,
}: {
  reports: Report[];
  selectedId: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const r = reports.find((x) => x.id === selectedId);
    if (r) {
      map.flyTo([r.location.lat, r.location.lng], Math.max(map.getZoom(), 16), {
        duration: 0.6,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  return null;
}

export default function ReportMap({
  reports,
  selectedId,
  onSelect,
}: {
  reports: Report[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={[CITY.center.lat, CITY.center.lng]}
      zoom={CITY.zoom}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitToReports reports={reports} />
      <FlyToSelected reports={reports} selectedId={selectedId} />
      {reports.map((r) => {
        const pulse = r.severity >= 8 && r.status !== "resolved";
        return (
          <Marker
            key={r.id}
            position={[r.location.lat, r.location.lng]}
            icon={severityIcon(r.severity, pulse)}
            zIndexOffset={selectedId === r.id ? 1000 : r.severity * 10}
            eventHandlers={{ click: () => onSelect(r.id) }}
            keyboard
            alt={`${r.category} report, severity ${r.severity}, at ${
              r.location.address || "mapped location"
            }`}
          />
        );
      })}
    </MapContainer>
  );
}
