"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import type { ReportLocation } from "@/lib/types";
import { CITY } from "@/lib/seed";
import { pinIcon } from "./markerIcon";
import { formatCoords } from "@/lib/utils";
import { cx } from "@/lib/utils";

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const last = useRef<string>("");
  useEffect(() => {
    const key = `${lat},${lng}`;
    if (key !== last.current) {
      last.current = key;
      map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
      a.neighbourhood || a.suburb,
      a.city || a.town || a.village,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : data.display_name || null;
  } catch {
    return null;
  }
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: ReportLocation | null;
  onChange: (loc: ReportLocation) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  const lat = value?.lat ?? CITY.center.lat;
  const lng = value?.lng ?? CITY.center.lng;
  const hasPin = !!value;

  function setPoint(
    nlat: number,
    nlng: number,
    method: ReportLocation["method"]
  ) {
    onChange({
      lat: nlat,
      lng: nlng,
      method,
      address: value?.address,
      crossStreet: value?.crossStreet,
    });
    setResolving(true);
    reverseGeocode(nlat, nlng).then((addr) => {
      setResolving(false);
      if (addr) {
        onChange({
          lat: nlat,
          lng: nlng,
          method,
          address: addr,
          crossStreet: value?.crossStreet,
        });
      }
    });
  }

  function useMyLocation() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser doesn't support location. Drop a pin instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPoint(pos.coords.latitude, pos.coords.longitude, "gps");
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Drop a pin on the map or type an address below."
            : "Couldn't get your location. Drop a pin or type an address below."
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          className="btn-outline"
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="h-4 w-4" aria-hidden="true" />
          )}
          {locating ? "Locating…" : "Use my location"}
        </button>
        <p className="text-xs text-ink-muted">
          {hasPin ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-accent-500" aria-hidden="true" />
              {resolving ? "Finding address…" : formatCoords(lat, lng)}
            </span>
          ) : (
            "Tap the map to drop a pin"
          )}
        </p>
      </div>

      <div
        className="h-64 w-full overflow-hidden rounded-xl border border-navy-200"
        role="application"
        aria-label="Map for selecting the issue location. Use the controls or type an address below if you prefer not to use the map."
      >
        <MapContainer
          center={[lat, lng]}
          zoom={hasPin ? 16 : CITY.zoom}
          scrollWheelZoom={false}
          className="h-full w-full"
          ref={mapRef as never}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ClickHandler onPick={(la, ln) => setPoint(la, ln, "pin")} />
          {hasPin && (
            <>
              <Recenter lat={lat} lng={lng} />
              <Marker
                position={[lat, lng]}
                icon={pinIcon()}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target.getLatLng();
                    setPoint(m.lat, m.lng, "pin");
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {geoError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200" role="status">
          {geoError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="address" className="field-label">
            Address or place
          </label>
          <input
            id="address"
            className="field-input"
            placeholder="e.g. 1200 Cedar Street"
            value={value?.address ?? ""}
            onChange={(e) =>
              onChange({
                lat,
                lng,
                method: hasPin ? value!.method : "address",
                address: e.target.value,
                crossStreet: value?.crossStreet,
              })
            }
          />
          <p className="field-hint">
            Typing an address still requires a pin — drop one near the spot.
          </p>
        </div>
        <div>
          <label htmlFor="crossStreet" className="field-label">
            Nearest cross-street{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id="crossStreet"
            className="field-input"
            placeholder="e.g. Cedar St & 12th Ave"
            value={value?.crossStreet ?? ""}
            onChange={(e) =>
              onChange({
                lat,
                lng,
                method: hasPin ? value!.method : "cross-street",
                address: value?.address,
                crossStreet: e.target.value,
              })
            }
          />
        </div>
      </div>

      {!hasPin && (
        <p className="text-xs text-ink-muted">
          No pin set yet. Drop one to continue — or{" "}
          <button
            type="button"
            className={cx(
              "font-semibold text-accent-600 underline underline-offset-2 hover:text-accent-700"
            )}
            onClick={() =>
              setPoint(CITY.center.lat, CITY.center.lng, "pin")
            }
          >
            start from {CITY.name} center
          </button>
          .
        </p>
      )}
    </div>
  );
}
