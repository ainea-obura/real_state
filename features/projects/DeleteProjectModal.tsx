"use client";
import { useAtom } from "jotai";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { deleteProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { deleteProjectId, isDeleteProjectModalOpen } from "@/store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Project } from "@/schema/projects/schema";

// Delete confirmation schema
const deleteConfirmationSchema = z
  .object({
    confirmation: z.string(),
  })
  .refine((data) => data.confirmation === "DELETE", {
    message: "Please type DELETE to confirm",
    path: ["confirmation"],
  });

type DeleteConfirmationForm = z.infer<typeof deleteConfirmationSchema>;

interface DeleteProjectModalProps {
  project: Project | undefined;
}

// DeleteProjectModal: Modal for confirming project deletion
const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ project }) => {
  const [isOpen, setIsOpen] = useAtom(isDeleteProjectModalOpen);
  const [projectId, setProjectId] = useAtom(deleteProjectId);
  const queryClient = useQueryClient();

  const form = useForm<DeleteConfirmationForm>({
    resolver: zodResolver(deleteConfirmationSchema),
    defaultValues: {
      confirmation: "",
    },
  });

  // Handle case where project is undefined
  const projectName = project?.node?.name || "this project";

  // Delete project mutation
  const { mutate: deleteProjectMutation, isPending } = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Project ID is required");
      return deleteProject(projectId);
    },
    onSuccess: () => {
      // Get all existing project queries
      const queries = queryClient.getQueriesData({
        queryKey: ["projects"],
      });

      // Update all matching queries by removing the deleted project
      queries.forEach(([queryKey]) => {
        queryClient.setQueryData(queryKey, (oldData: unknown) => {
          if (!oldData || typeof oldData !== "object" || !("data" in oldData))
            return oldData;

          const data = oldData as {
            data: { results: Project[] | Project; count?: number };
          };
          const oldResults = Array.isArray(data.data.results)
            ? data.data.results
            : [data.data.results];

          const filteredResults = oldResults.filter(
            (p: Project) => p.id !== projectId
          );

          return {
            ...oldData,
            data: {
              count: Math.max(0, (data.data.count ?? 0) - 1),
              results: filteredResults,
            },
          };
        });
      });

      toast.success("Project deleted successfully", {
        className: "bg-primary text-white",
      });

      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message, {
        className: "bg-destructive text-white",
      });
    },
  });

  // Handler for closing the modal
  const handleClose = () => {
    setIsOpen(false);
    setProjectId(null);
    form.reset();
  };

  // Handler for form submission
  const onSubmit = (data: DeleteConfirmationForm) => {
    if (data.confirmation === "DELETE") {
      deleteProjectMutation();
    }
  };

  // Don't render if no project is selected or project is undefined
  if (!isOpen || !projectId || !project) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="shadow-2xl p-8 border-0 rounded-2xl max-w-md">
        <DialogHeader className="mb-2">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <DialogTitle className="font-bold text-red-600 text-2xl text-center tracking-tight">
              Delete Project
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="mb-4 font-semibold text-gray-900 text-lg text-center">
          Are you sure you want to delete project{" "}
          <span className="font-bold text-red-700">
            &apos;{projectName}&apos;
          </span>
          ?
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700 text-xs">
                    Please type{" "}
                    <span className="font-bold text-red-600">DELETE</span> to
                    confirm
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                      placeholder="Type DELETE"
                      autoFocus
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center items-center gap-4 mt-4 text-gray-500 text-sm">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span>
                <span className="font-semibold text-red-500">Warning:</span>{" "}
                This action cannot be undone. All data for this project will be
                permanently deleted.
              </span>
            </div>

            <DialogFooter className="flex flex-row justify-center gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
                className="min-w-[100px] font-bold"
                disabled={!form.formState.isValid || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProjectModal;
