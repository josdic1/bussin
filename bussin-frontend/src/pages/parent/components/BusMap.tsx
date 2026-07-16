import type { ArrivalEstimate } from "@bussin/shared";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type BusMapProps = {
  latitude: number;
  longitude: number;
  isStale: boolean;
  destination?: ArrivalEstimate["destination"];
  route?: ArrivalEstimate["route"];
  routeCalculatedAt?: string;
};

const BUS_MARKER_ICON = L.divIcon({
  className: "busMapMarker",
  html: '<span aria-hidden="true">🚌</span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const DESTINATION_MARKER_ICON = L.divIcon({
  className: "destinationMapMarker",
  html: '<span aria-hidden="true">⌂</span>',
  iconSize: [44, 44],
  iconAnchor: [22, 40],
});

export function BusMap({
  latitude,
  longitude,
  isStale,
  destination,
  route = [],
  routeCalculatedAt,
}: BusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  function getRoutePoints() {
    if (route.length >= 2) {
      return route.map((point) =>
        L.latLng(point.latitude, point.longitude),
      );
    }

    if (destination) {
      return [
        L.latLng(latitude, longitude),
        L.latLng(
          destination.latitude,
          destination.longitude,
        ),
      ];
    }

    return [];
  }

  function showWholeRoute() {
    const map = mapRef.current;
    const container = map?.getContainer();
    const routePoints = getRoutePoints();

    if (!map || !container?.isConnected) {
      return;
    }

    map.invalidateSize({ pan: false });

    if (routePoints.length >= 2) {
      map.fitBounds(L.latLngBounds(routePoints), {
        padding: [28, 28],
        maxZoom: 15,
        animate: true,
      });
      return;
    }

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
    const busLocation = L.latLng(latitude, longitude);

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
    }).setView(busLocation, 15);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(map);

    const busMarker = L.marker(busLocation, {
      icon: BUS_MARKER_ICON,
      title: "Bus location",
    })
      .addTo(map)
      .bindTooltip(
        isStale
          ? "Last known bus location"
          : "Current bus location",
      );

    const routePoints = getRoutePoints();

    if (routePoints.length >= 2) {
      routeLineRef.current = L.polyline(routePoints, {
        color: "#080808",
        weight: 5,
        opacity: 0.95,
        lineJoin: "miter",
      }).addTo(map);
    }

    if (destination) {
      destinationMarkerRef.current = L.marker(
        [
          destination.latitude,
          destination.longitude,
        ],
        {
          icon: DESTINATION_MARKER_ICON,
          title: destination.address,
        },
      )
        .addTo(map)
        .bindTooltip(destination.address);
    }

    mapRef.current = map;
    busMarkerRef.current = busMarker;

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

      if (routePoints.length >= 2) {
        map.fitBounds(L.latLngBounds(routePoints), {
          padding: [28, 28],
          maxZoom: 15,
        });
      } else {
        map.setView(busLocation, 15);
      }
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(initialResize);
      resizeObserver.disconnect();

      busMarkerRef.current = null;
      destinationMarkerRef.current = null;
      routeLineRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const busMarker = busMarkerRef.current;

    if (!busMarker) {
      return;
    }

    busMarker.setLatLng([latitude, longitude]);
    busMarker.setTooltipContent(
      isStale
        ? "Last known bus location"
        : "Current bus location",
    );
  }, [latitude, longitude, isStale]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const routePoints = getRoutePoints();

    if (routePoints.length >= 2) {
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs(routePoints);
      } else {
        routeLineRef.current = L.polyline(routePoints, {
          color: "#080808",
          weight: 5,
          opacity: 0.95,
          lineJoin: "miter",
        }).addTo(map);
      }
    }

    if (destination) {
      const destinationLocation = L.latLng(
        destination.latitude,
        destination.longitude,
      );

      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng(
          destinationLocation,
        );
        destinationMarkerRef.current.setTooltipContent(
          destination.address,
        );
      } else {
        destinationMarkerRef.current = L.marker(
          destinationLocation,
          {
            icon: DESTINATION_MARKER_ICON,
            title: destination.address,
          },
        )
          .addTo(map)
          .bindTooltip(destination.address);
      }
    }
  }, [route, destination]);

  useEffect(() => {
    if (!routeCalculatedAt) {
      return;
    }

    showWholeRoute();
  }, [routeCalculatedAt]);

  return (
    <div className="busMapShell">
      <span className="busMapLabel">Live bus map</span>

      <div
        ref={containerRef}
        className={`busMap${isStale ? " busMapStale" : ""}`}
        role="img"
        aria-label={
          isStale
            ? "Map showing the bus's last known location"
            : "Map showing the bus's current route to JCC"
        }
      />

    </div>
  );
}
