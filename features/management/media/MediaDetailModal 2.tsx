import { X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { deleteMedia } from '@/actions/managements/media';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/components/PermissionGate';

import { MediaItem } from './mediaTypes';

interface MediaDetailModalProps {
  open: boolean;
  media: MediaItem | null;
  onClose: () => void;
  mediaList: MediaItem[];
}

const Lightbox: React.FC<{
  image: MediaItem;
  open: boolean;
  onClose: () => void;
}> = ({ image, open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex justify-center items-center bg-transparent shadow-none p-0 border-none max-w-3xl">
        <DialogTitle asChild>
          <VisuallyHidden>Image Preview</VisuallyHidden>
        </DialogTitle>
        <div className="relative flex flex-col items-center bg-white p-4 rounded-2xl w-full">
          <div className="flex justify-center items-center w-full">
            <Image
              src={image.url}
              alt={image.title || "Preview"}
              className="rounded-xl w-auto h-auto max-h-[70vh] object-contain"
              width={900}
              height={600}
              priority
            />
          </div>
          {image.title && (
            <div
              className="mt-4 w-full font-semibold text-gray-800 text-lg text-center truncate"
              title={image.title}
            >
              {image.title}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  open,
  media,
  onClose,
  mediaList,
}) => {
  const [lightboxImage, setLightboxImage] = useState<MediaItem | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);
  const queryClient = useQueryClient();

  // Update images when mediaList changes, but only if modal is open
  useEffect(() => {
    if (open && mediaList.length > 0) {
      setImages(mediaList);
    }
  }, [mediaList, open]);

  // Close modal if all images are deleted (but only if modal was already open with images)
  useEffect(() => {
    if (open && images.length === 0 && mediaList.length === 0) {
      // Only close if we previously had images and now don't
      const timer = setTimeout(() => {
        onClose();
      }, 100); // Small delay to prevent race conditions
      return () => clearTimeout(timer);
    }
  }, [images.length, mediaList.length, open, onClose]);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteMedia(id);
    },
    onSuccess: (data, id) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to delete media");
        return;
      }
      toast.success(data.message || "Image deleted");
      setImages((prev) => prev.filter((img) => img.id !== id));
      queryClient.invalidateQueries({ queryKey: ["media", "all"] });
    },
    onError: () => {
      toast.error("Delete failed");
    },
  });

  // Don't render if not open or no media
  if (!open || !media) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="mt-10 p-0 w-full max-w-5xl h-[calc(100vh-100px)]">
          <DialogTitle asChild>
            <VisuallyHidden>Media Gallery</VisuallyHidden>
          </DialogTitle>
          <div className="relative flex flex-col gap-8 p-6 rounded-2xl w-full animate-fadeIn">
            {/* Gallery Grid */}
            <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full">
              {images.length > 0 ? (
                images.map((img) => (
                  <div key={img.id} className="group relative">
                    <button
                      className="relative bg-gray-50 shadow-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary w-full aspect-[3/4] overflow-hidden"
                      onClick={() => setLightboxImage(img)}
                      aria-label={img.title || "Preview"}
                      tabIndex={0}
                      type="button"
                    >
                      <Image
                        src={img.url}
                        alt={img.title || "Preview"}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        fill
                        priority
                      />
                    </button>
                    {/* Delete button on hover */}
                    <PermissionGate codename="delete_media" showFallback={false}>
                    <button
                      className="top-2 right-2 z-10 absolute bg-destructive opacity-0 group-hover:opacity-100 shadow-lg p-1 rounded-full text-white transition"
                      title="Delete image"
                      onClick={(e) => {
                        e.stopPropagation();
                        mutation.mutate(img.id);
                      }}
                      disabled={mutation.isPending}
                    >
                      <X className="w-5 h-5" />
                    </button>
                    </PermissionGate>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-gray-400 text-sm">
                  No images
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          open={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
};

export default MediaDetailModal;
