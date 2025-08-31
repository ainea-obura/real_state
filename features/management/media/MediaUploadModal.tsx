import { Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createMedia, fetchMediaProjects } from '@/actions/managements/media';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';

import { MediaProjectNode } from './schema';

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total

const schema = z.object({
  project: z.string().min(1, "Project is required"),
  block: z.string().optional(),
  unit: z.string().optional(),
  files: z
    .array(
      z.custom<File>(
        (file) =>
          file instanceof File &&
          ACCEPTED_IMAGE_TYPES.includes(file.type) &&
          file.size <= MAX_FILE_SIZE,
        {
          message: "Only PNG/JPG/JPEG images under 5MB allowed",
        }
      )
    )
    .min(1, "At least one image is required")
    .max(10, "Max 10 images")
    .refine(
      (files) =>
        files.reduce((acc, file) => acc + file.size, 0) <= MAX_TOTAL_SIZE,
      {
        message: "Total size of all images must not exceed 5MB",
      }
    ),
});

type FormValues = z.infer<typeof schema>;

interface MediaUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (data: FormValues) => void;
}

const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  open,
  onClose,
  onUpload,
}) => {
  const [projectSearch, setProjectSearch] = useState("");
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { files: [] },
  });

  const files = watch("files");
  const selectedProjectId = watch("project");
  const selectedBlockId = watch("block");

  // Fetch projects from API
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["media-projects", projectSearch],
    queryFn: () => fetchMediaProjects({ q: projectSearch }),
    enabled: open && projectSearch.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Flatten results for easier access
  const projects: MediaProjectNode[] = projectsData?.data.results || [];
  // Find selected project node
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );
  // Blocks are children of the project
  const blocks =
    selectedProject?.children?.filter(
      (c) => c.node_type === "BLOCK" || c.node_type === "HOUSE"
    ) || [];
  // Find selected block node
  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId),
    [blocks, selectedBlockId]
  );
  // Units are children of the block
  // const units = selectedBlock?.children?.filter((c) => c.node_type === "UNIT") || [];

  // Dropzone logic
  const onDrop = (acceptedFiles: File[]) => {
    const existing = files;
    const newFiles = acceptedFiles.filter(
      (file) =>
        !existing.some((f) => f.name === file.name && f.size === file.size)
    );
    const combinedFiles = [...existing, ...newFiles].slice(0, 10);
    const totalSize = combinedFiles.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      toast.error("Total size of all images must not exceed 5MB");
      return;
    }
    setValue("files", combinedFiles, { shouldValidate: true });
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {}
    ),
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  // Remove file
  const removeFile = (idx: number) => {
    setValue(
      "files",
      files.filter((_, i) => i !== idx),
      { shouldValidate: true }
    );
  };

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await createMedia({
        project: data.project,
        block: data.block || undefined,
        unit: data.unit || undefined,
        files: data.files,
      });
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to upload media");
        return;
      }
      toast.success(data.message || "Media uploaded successfully!");
      reset();
      onClose();
      onUpload({} as FormValues);
    },
    onError: () => {
      toast.error("Upload failed");
    },
  });

  // Submit
  const submit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="mt-10 max-w-2xl max-h-[calc(100vh-100px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
          {/* Project Search */}
          <div>
            <label className="block mb-1 font-medium text-sm">Project</label>
            <div className="relative">
              <Input
                placeholder="Search project..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="pr-10"
              />
              <Search className="top-2.5 right-2 absolute w-4 h-4 text-muted-foreground" />
            </div>
            {/* Only show dropdown if searching */}
            {projectSearch.length > 0 && (
              <div className="bg-white shadow-sm mt-2 border rounded max-h-32 overflow-y-auto">
                {isProjectsLoading ? (
                  <div className="px-3 py-2 text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : projects.length ? (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-primary/10 ${
                        selectedProjectId === p.id
                          ? "bg-primary/10 font-semibold"
                          : ""
                      }`}
                      onClick={() => {
                        setValue("project", p.id, { shouldValidate: true });
                        setProjectSearch(p.name);
                      }}
                    >
                      {p.name}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground text-sm">
                    No projects found
                  </div>
                )}
              </div>
            )}
            {errors.project && (
              <p className="mt-1 text-destructive text-xs">
                {errors.project.message}
              </p>
            )}
          </div>
          {/* Block Dropdown */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 font-medium text-sm">
                Block (optional)
              </label>
              <Select
                value={selectedBlockId || undefined}
                onValueChange={(val) =>
                  setValue("block", val || undefined, { shouldValidate: true })
                }
                disabled={!selectedProject}
              >
                <SelectTrigger className="w-full !h-11">
                  <SelectValue placeholder="Select block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Unit Dropdown (grouped by floor) */}
            <div className="flex-1">
              <label className="block mb-1 font-medium text-sm">
                Unit (optional)
              </label>
              <Select
                value={watch("unit") || undefined}
                onValueChange={(val) =>
                  setValue("unit", val || undefined, { shouldValidate: true })
                }
                disabled={!selectedBlock}
              >
                <SelectTrigger className="w-full !h-11">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {/* Group units by floor, only show floors with units */}
                  {selectedBlock &&
                    selectedBlock.children
                      .filter((f) => f.node_type === "FLOOR")
                      .map((floor) => {
                        const floorUnits = floor.children.filter(
                          (u) => u.node_type === "UNIT"
                        );
                        if (floorUnits.length === 0) return null;
                        return (
                          <React.Fragment key={floor.id}>
                            <div className="bg-muted/50 mt-2 mb-1 px-2 py-1 rounded font-semibold text-muted-foreground text-xs">
                              {floor.name}
                            </div>
                            {floorUnits.map((u) => (
                              <SelectItem
                                key={u.id}
                                value={u.id}
                                className="pl-6"
                              >
                                {u.name}
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        );
                      })}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Dropzone */}
          <div>
            <label className="block mb-1 font-medium text-sm">
              Media Images
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isDragActive ? "border-primary bg-muted" : "border-muted"
              }`}
            >
              <input {...getInputProps()} />
              <p className="mb-2 text-muted-foreground text-center">
                Drag & drop or click to select images (PNG, JPG, JPEG, max 5MB
                each, up to 10)
              </p>
              <Button type="button" variant="secondary" className="mt-2">
                Browse Files
              </Button>
            </div>
            {errors.files && (
              <p className="mt-1 text-destructive text-xs">
                {errors.files.message}
              </p>
            )}
            {/* Preview */}
            {files.length > 0 && (
              <div className="gap-4 grid grid-cols-2 sm:grid-cols-3 mt-4">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="group relative border rounded-lg overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      className="top-1 right-1 absolute bg-black/60 opacity-80 hover:opacity-100 p-1 rounded-full text-white"
                      onClick={() => removeFile(idx)}
                      tabIndex={-1}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="right-0 bottom-0 left-0 absolute bg-black/60 px-2 py-1 text-white text-xs truncate">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="mr-2 w-4 h-4 text-white animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MediaUploadModal;
