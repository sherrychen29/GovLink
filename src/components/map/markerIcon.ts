import L from "leaflet";
import { severityMeta } from "@/lib/meta";

/** A custom severity-colored divIcon (no external image assets needed). */
export function severityIcon(
  severity: number,
  pulse: boolean,
  selected = false
): L.DivIcon {
  const meta = severityMeta(severity);
  const pulseClass = pulse ? "gl-marker--pulse" : "";
  const selectedClass = selected ? "gl-marker--selected" : "";
  return L.divIcon({
    className: "gl-marker-wrap",
    html: `
      <div class="gl-marker ${pulseClass} ${selectedClass}">
        <span class="gl-marker-ring" style="background:${meta.hex}"></span>
        <span class="gl-marker-dot" style="background:${meta.hex}">${severity}</span>
      </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

/** A draggable pin used by the citizen location picker. */
export function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "gl-pin-wrap",
    html: `
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13 23.5 13.6 24a2 2 0 0 0 2.8 0C17 38.5 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="#102a56"/>
        <circle cx="15" cy="15" r="6.5" fill="#1fc7ef"/>
      </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });
}
