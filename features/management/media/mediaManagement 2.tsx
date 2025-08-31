"use client";
import React, { useState } from 'react';

// Removed unused import: import { z } from 'zod';
import { fetchMediaForProject } from '@/actions/managements/media';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
// Remove unused Input and Textarea imports
import { useQuery } from '@tanstack/react-query';

import MediaDetailModal from './MediaDetailModal';
import MediaList from './MediaList';
import MediaUploadModal from './MediaUploadModal';

import type { MediaItem, MediaCategory, PropertyNodeType } from "./mediaTypes";
import type { MediaPropertyWithImagesSchema } from "./schema";

const MediaManagement: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Fetch all media using react-query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["media", "all"],
    queryFn: fetchMediaForProject,
  });

  // Handle error state
  const errorMessage = data && data.error ? (data.message || "Failed to fetch media") : null;

  // One card per property: use the first image for the card, but keep all images for the modal
  const propertyList: MediaPropertyWithImagesSchema[] = (
    data?.data.results || []
  ).filter((property) => property.images && property.images.length > 0);

  // State for all images of the selected property
  const [selectedImages, setSelectedImages] = useState<MediaItem[]>([]);

  // When a card is clicked, show all images for that property in the modal
  const handlePreview = (property: MediaPropertyWithImagesSchema) => {
    const mappedImages: MediaItem[] = property.images.map((img) => ({
      id: img.id,
      url: img.media, // map 'media' to 'url'
      title: img.title,
      description: img.description,
      fileType: img.file_type, // map 'file_type' to 'fileType'
      category: img.category as MediaCategory, // Cast to MediaCategory
      createdAt: img.created_at, // map 'created_at' to 'createdAt'
      nodeId: property.id, // Use property id as nodeId
      nodeType: property.node_type as PropertyNodeType, // Cast to PropertyNodeType
    }));
    setSelectedMedia(mappedImages[0] || null);
    setSelectedImages(mappedImages);
    setShowDetail(true);
  };

  // Remove handleUpload and handleDelete for now (API integration needed)

  return (
    <PermissionGate codename="view_media">
      <section className="flex flex-col gap-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="font-bold text-2xl">Media Management</h1>
          <PermissionGate codename="add_media" showFallback={false}>
            <Button
              onClick={() => setShowUpload(true)}
              className="px-6 py-2 font-medium text-sm"
            >
              Upload Media
            </Button>
          </PermissionGate>
        </div>
        <PermissionGate codename="add_media" showFallback={false}>
          <MediaUploadModal
            open={showUpload}
            onClose={() => setShowUpload(false)}
            onUpload={() => refetch()}
          />
        </PermissionGate>
        {/* Media Grid */}
        <MediaList
          properties={propertyList}
          loading={isLoading}
          onPreview={handlePreview}
        />
        {/* Error State */}
        {isError && (
          <div className="py-8 text-red-500 text-center">
            Failed to load media.
          </div>
        )}
        {/* Media Detail Modal */}
        <MediaDetailModal
          open={showDetail}
          media={selectedMedia}
          onClose={() => {
            setShowDetail(false);
            setSelectedMedia(null);
            setSelectedImages([]);
          }}
          mediaList={selectedImages}
        />
      </section>
    </PermissionGate>
  );
};

export default MediaManagement;
