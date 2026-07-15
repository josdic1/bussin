import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type BusMapProps = {
  latitude: number;
  longitude: number;
  isStale: boolean;
};

const BUS_MARKER_ICON = L.divIcon({
  className: "busMapMarker",
  html: '<span aria-hidden="true">🚌</span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

export function BusMap({ latitude, longitude, isStale }: BusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  function recenterMap() {
    const map = mapRef.current;
    const container = map?.getContainer();

    if (!map || !container?.isConnected) {
      return;
    }

    map.invalidateSize({ pan: false });
    map.setView([latitude, longitude], 15, {
      animate: true,
    });
  }

  useEffect(() => {
    const container = containerRef.current;

    if (!container || mapRef.current) {
      return;
    }

    let isActive = true;
    const location = L.latLng(latitude, longitude);

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
    }).setView(location, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker(location, {
      icon: BUS_MARKER_ICON,
      title: "Bus location",
    })
      .addTo(map)
      .bindTooltip(
        isStale ? "Last known bus location" : "Current bus location",
      );

    mapRef.current = map;
    markerRef.current = marker;

    const resizeObserver = new ResizeObserver(() => {
      if (!isActive || !container.isConnected) {
        return;
      }

      map.invalidateSize({ pan: false });
    });

    resizeObserver.observe(container);

    const initialResize = window.setTimeout(() => {
      if (!isActive || !container.isConnected) {
        return;
      }

      map.invalidateSize({ pan: false });
      map.setView(location, 15);
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(initialResize);
      resizeObserver.disconnect();

      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const container = map?.getContainer();

    if (!map || !marker || !container?.isConnected || !map.hasLayer(marker)) {
      return;
    }

    const location = L.latLng(latitude, longitude);

    marker.setLatLng(location);
    marker.setTooltipContent(
      isStale ? "Last known bus location" : "Current bus location",
    );
    map.panTo(location);
  }, [latitude, longitude, isStale]);

  return (
    <div className="busMapShell">
      <div
        ref={containerRef}
        className={`busMap${isStale ? " busMapStale" : ""}`}
        role="img"
        aria-label={
          isStale
            ? "Map showing the bus's last known location"
            : "Map showing the bus's current location"
        }
      />

      <button className="mapRecenterButton" type="button" onClick={recenterMap}>
        Recenter bus
      </button>
    </div>
  );
}
