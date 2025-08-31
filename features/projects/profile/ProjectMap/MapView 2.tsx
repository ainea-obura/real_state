"use client";

import 'mapbox-gl/dist/mapbox-gl.css';

import { MapPin } from 'lucide-react';
import { useMemo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';

import type { ProjectDetail } from "@/schema/projects/schema";

interface MapViewProps {
  project: ProjectDetail;
}

const MapView: React.FC<MapViewProps> = ({ project }) => {
  // Use project.location.lat and project.location.long as center if available, else fallback to Nairobi
  const center = useMemo(() => {
    if (
      typeof project.location.lat === "number" &&
      typeof project.location.long === "number"
    ) {
      return [project.location.long, project.location.lat];
    }
    // fallback: Nairobi
    return [36.8219, -1.2921];
  }, [project.location.lat, project.location.long]);

  // If no project lat/long, don't render the map
  const hasCoordinates =
    typeof project.location.lat === "number" &&
    typeof project.location.long === "number";
  if (!hasCoordinates) {
    return (
      <div className="flex flex-col justify-center items-center bg-gray-50 rounded-md w-full h-full">
        <MapPin className="mb-2 w-12 h-12 text-gray-400" />
        <p className="text-gray-500 text-sm">No location data available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Map
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: 14,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        attributionControl={true}
        dragRotate={false}
        reuseMaps
        minZoom={10}
        maxZoom={18}
        onClick={() => {}}
      >
        <NavigationControl showCompass={false} />

        {/* Single project marker */}
        <Marker
          longitude={project.location.long as number}
          latitude={project.location.lat as number}
          anchor="bottom"
        >
          <MapPin
            className="w-6 h-6 text-primary -translate-y-1/2 cursor-pointer"
            strokeWidth={2.5}
            fill="currentColor"
          />
        </Marker>
      </Map>
    </div>
  );
};

export default MapView;
