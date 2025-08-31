import React from 'react';

import MediaItemCard from './MediaItem';

import type { MediaPropertyWithImagesSchema } from "./schema";

interface MediaListProps {
  properties: MediaPropertyWithImagesSchema[];
  loading?: boolean;
  onPreview?: (property: MediaPropertyWithImagesSchema) => void;
}

export const MediaList: React.FC<MediaListProps> = ({
  properties,
  loading,
  onPreview,
}) => {
  if (loading) {
    return (
      <div className="py-8 text-muted-foreground text-center">
        Loading media...
      </div>
    );
  }
  if (!properties.length) {
    return (
      <div className="py-8 text-muted-foreground text-center">
        No media found.
      </div>
    );
  }
  return (
    <div className="gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3">
      {properties.map((property) =>
        property.images && property.images.length > 0 ? (
          <MediaItemCard
            key={property.id}
            property={property}
            onPreview={() => onPreview?.(property)}
          />
        ) : null
      )}
    </div>
  );
};

export default MediaList;
