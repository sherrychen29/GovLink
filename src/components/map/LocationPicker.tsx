"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import type { ReportLocation } from "@/lib/types";
import { CITY } from "@/lib/seed";
import { pinIcon } from "./markerIcon";
import { formatCoords } from "@/lib/utils";
import { cx } from "@/lib/utils";

/** San Jose + surrounding area search bounds. */
const SEARCH_VIEWBOX = "-122.05,37.15,-121.65,37.50";

interface SearchResult {
  lat: number;
  lng: number;
  label: string;
}

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

async function searchPlaces(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        `${q}, San Jose, California`
      )}&viewbox=${SEARCH_VIEWBOX}&bounded=0&limit=6&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    return data.map((item) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name.split(",").slice(0, 3).join(",").trim(),
    }));
  } catch {
    return [];
  }
}

export default function LocationPicker({
  value,
  onChange,
  compact = false,
  readOnly = false,
  /** Pre-fill search from chat (street / landmark Beacon heard). */
  initialSearchQuery,
}: {
  value: ReportLocation | null;
  onChange: (loc: ReportLocation) => void;
  /** Smaller map for inline chat widgets. */
  compact?: boolean;
  readOnly?: boolean;
  initialSearchQuery?: string;
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<number | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const lat = value?.lat ?? CITY.center.lat;
  const lng = value?.lng ?? CITY.center.lng;
  const hasPin = !!value;

  function setPoint(
    nlat: number,
    nlng: number,
    method: ReportLocation["method"],
    addressHint?: string
  ) {
    onChange({
      lat: nlat,
      lng: nlng,
      method,
      address: addressHint ?? value?.address,
      crossStreet: value?.crossStreet,
    });
    if (addressHint) return;
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
            ? "Location permission denied. Search for an address or drop a pin."
            : "Couldn't get your location. Search for an address or drop a pin."
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function runSearch(q: string) {
    const trimmed = q.trim();
    setSearchQuery(trimmed);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (trimmed.length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchPlaces(trimmed).then((results) => {
      setSearchResults(results);
      setSearching(false);
    });
  }

  function onSearchInput(q: string) {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (q.trim().length < 3) {
      setSearchQuery(q);
      setSearchResults([]);
      return;
    }
    setSearchQuery(q);
    searchTimer.current = window.setTimeout(() => runSearch(q), 350);
  }

  function pickSearchResult(r: SearchResult) {
    setSearchQuery(r.label);
    setSearchResults([]);
    setPoint(r.lat, r.lng, "address", r.label);
  }

  const prefillDone = useRef(false);
  useEffect(() => {
    if (prefillDone.current || readOnly || !initialSearchQuery?.trim()) return;
    prefillDone.current = true;
    const q = initialSearchQuery.trim();
    setSearching(true);
    setSearchQuery(q);
    searchPlaces(q).then((results) => {
      setSearchResults(results);
      setSearching(false);
      if (results.length === 1) {
        const r = results[0];
        setSearchQuery(r.label);
        setSearchResults([]);
        setPoint(r.lat, r.lng, "address", r.label);
      }
    });
  }, [initialSearchQuery, readOnly]);

  if (readOnly && value) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {value.address || value.crossStreet || formatCoords(value.lat, value.lng)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor="location-search" className="field-label">
          Search address, street, or intersection
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
            aria-hidden="true"
          />
          <input
            id="location-search"
            className="field-input pl-9"
            placeholder="e.g. Cedar St & 12th Ave, San Jose"
            value={searchQuery}
            onChange={(e) => onSearchInput(e.target.value)}
            disabled={readOnly}
          />
          {searching && (
            <Loader2
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-navy-400"
              aria-hidden="true"
            />
          )}
        </div>
        {searchResults.length > 0 && (
          <ul
            className="absolute z-[500] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-navy-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {searchResults.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  type="button"
                  role="option"
                  className="w-full px-3 py-2 text-left text-sm text-navy-900 hover:bg-navy-50"
                  onClick={() => pickSearchResult(r)}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          className="btn-outline text-sm"
          disabled={locating || readOnly}
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
        className={cx(
          "w-full overflow-hidden rounded-xl border border-navy-200",
          compact ? "h-52" : "h-64"
        )}
        role="application"
        aria-label="Map for selecting the issue location"
      >
        <MapContainer
          center={[lat, lng]}
          zoom={hasPin ? 16 : CITY.zoom}
          scrollWheelZoom={!compact}
          className="h-full w-full"
          ref={mapRef as never}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {!readOnly && (
            <ClickHandler onPick={(la, ln) => setPoint(la, ln, "pin")} />
          )}
          {hasPin && (
            <>
              <Recenter lat={lat} lng={lng} />
              <Marker
                position={[lat, lng]}
                icon={pinIcon()}
                draggable={!readOnly}
                eventHandlers={
                  readOnly
                    ? undefined
                    : {
                        dragend: (e) => {
                          const m = e.target.getLatLng();
                          setPoint(m.lat, m.lng, "pin");
                        },
                      }
                }
              />
            </>
          )}
        </MapContainer>
      </div>

      {geoError && (
        <p
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200"
          role="status"
        >
          {geoError}
        </p>
      )}

      {!compact && (
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
            disabled={readOnly}
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
      )}

      {!hasPin && !readOnly && (
        <p className="text-xs text-ink-muted">
          Search above, drop a pin, or{" "}
          <button
            type="button"
            className="font-semibold text-accent-600 underline underline-offset-2 hover:text-accent-700"
            onClick={() => setPoint(CITY.center.lat, CITY.center.lng, "pin")}
          >
            start from {CITY.name} center
          </button>
          .
        </p>
      )}
    </div>
  );
}
