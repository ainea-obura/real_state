import Image from 'next/image';
import React from 'react';

import type { MediaPropertyWithImagesSchema } from "./schema";
interface MediaItemProps {
  property: MediaPropertyWithImagesSchema;
  onPreview: () => void;
}

export const MediaItemCard: React.FC<MediaItemProps> = ({
  property,
  onPreview,
}) => {
  const firstImage = property.images[0];
  return (
    <div
      className="group relative flex flex-col border rounded-xl min-w-[260px] max-w-[340px] h-full min-h-[420px] overflow-hidden transition-all cursor-pointer"
      tabIndex={0}
      role="group"
      aria-label={property.name}
      onClick={onPreview}
    >
      {/* Thumbnail */}
      {firstImage ? (
        <Image
          src={firstImage.media}
          alt={property.name}
          className="w-full h-[240px] object-cover group-focus:scale-105 group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
          width={340}
          height={240}
        />
      ) : (
        <div className="flex flex-col justify-center items-center bg-gray-50 w-full h-[240px] text-muted-foreground">
          <span className="bg-gray-200 mb-2 rounded-full w-12 h-12" />
          <span className="text-xs">No Image</span>
        </div>
      )}
      {/* Info section */}
      <div className="flex flex-col flex-1 justify-start items-start bg-white p-4">
        <div
          className="mb-1 font-bold text-gray-900 text-lg text-center truncate"
          title={property.name}
        >
          {property.name}
        </div>
        <div
          className="mb-2 text-gray-500 text-xs truncate"
          title={property.parent_path}
        >
          {property.parent_path}
        </div>
        {firstImage && (
          <div className="mt-auto text-gray-400 text-xs text-center">
            {new Date(firstImage.created_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaItemCard;
