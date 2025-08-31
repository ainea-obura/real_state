"use client";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createDocument, fetchDocumentsVaraible } from "@/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Editor as TinyMCEEditor } from "tinymce";
import type { DocumentVariable } from "./schema/variables";

// Dynamically import TinyMCE Editor for Next.js SSR
const Editor = dynamic(
  () => import("@tinymce/tinymce-react").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center bg-gray-50 border rounded-md h-[400px]">
        <div className="text-center">
          <div className="mx-auto mb-2 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <div>Loading editor...</div>
        </div>
      </div>
    ),
  }
);

// Document type configuration
export const DOCUMENT_TYPES = {
  rent: {
    value: "rent",
    label: "Rent Agreement Template",
    description: "Create comprehensive rental agreements and lease contracts",
    variables: [
      "tenant_name",
      "landlord_name",
      "property_address",
      "rent_amount",
      "lease_start",
      "lease_end",
      "security_deposit",
    ],
    defaultContent: "Start writing here....",
  },
  offer_letter: {
    value: "offer_letter",
    label: "Offer Letter Template",
    description: "Create professional offer letters for sales and negotiations",
    variables: [
      "client_name",
      "property_address",
      "offer_amount",
      "offer_date",
      "valid_until",
      "terms_conditions",
    ],
    defaultContent: "Start writing here....",
  },
  sales_agreement: {
    value: "sales_agreement",
    label: "Sales Agreement Template",
    description: "Create sales contracts and purchase agreements",
    variables: [
      "buyer_name",
      "seller_name",
      "property_address",
      "purchase_price",
      "closing_date",
      "earnest_money",
      "financing_terms",
    ],
    defaultContent: "Start writing here....",
  },
} as const;

// Schema that accepts all document types
const documentSchema = z.object({
  template_title: z
    .string()
    .min(1, "Document title is required")
    .max(200, "Title too long"),
  template_description: z.string().optional(),
  template_type: z.enum(["rent", "offer_letter", "sales_agreement"], {
    required_error: "Document type is required",
  }),
  template_content: z.string().min(1, "Document content is required"),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface CreateDocumentProps {
  open: boolean;
  onClose: () => void;
  onUpload?: (doc: unknown) => void;
  mode?: "create" | "edit" | "view";
  document?: Partial<DocumentFormData & { id?: string }>;
  documentType?: keyof typeof DOCUMENT_TYPES;
  customVariables?: DocumentVariable[];
  title?: string;
  description?: string;
}

// Helper to format category labels
function formatCategoryLabel(cat: string) {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CreateDocument: React.FC<CreateDocumentProps> = ({
  open,
  onClose,
  onUpload,
  document,
  mode = "create",
  documentType = "rent_agreement",
  customVariables,
  title = "Create New Document",
  description = "Create a new document template with rich text editor and variables",
}) => {
  const { data: session } = useSession();
  const [availableVariables, setAvailableVariables] = useState<
    DocumentVariable[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const [variableCategories, setVariableCategories] = useState<
    { value: string; label: string }[]
  >([{ value: "all", label: "All Variables" }]);

  // Create schema that accepts all document types
  const [currentDocumentType, setCurrentDocumentType] =
    useState<keyof typeof DOCUMENT_TYPES>("rent"); // Default to rent

  // Use custom variables if provided, otherwise fetch from API
  const shouldFetchVariables = !customVariables || customVariables.length === 0;

  // Fetch variables from API only if not provided via props
  const {
    data: variablesData,
    isLoading: variablesLoading,
    isError: variablesError,
    isFetching: variablesFetching,
  } = useQuery({
    queryKey: ["document-variables", currentDocumentType],
    queryFn: () => {
      // For rent agreement: no filter (default)
      // For offer letter: filter by is_for_offer=true
      // For sales agreement: filter by is_for_sale=true
      if (currentDocumentType === "rent") {
        return fetchDocumentsVaraible(); // No filter for rent
      } else if (currentDocumentType === "offer_letter") {
        return fetchDocumentsVaraible("offer"); // Filter for offer
      } else if (currentDocumentType === "sales_agreement") {
        return fetchDocumentsVaraible("sale"); // Filter for sale
      }
      return fetchDocumentsVaraible(); // Default no filter
    },
    staleTime: 5 * 60 * 1000,
    enabled: shouldFetchVariables,
    // Keep previous data while loading new data
    placeholderData: (previousData) => previousData,
  });

  // Set available variables based on props or API data
  useEffect(() => {
    if (customVariables && customVariables.length > 0) {
      setAvailableVariables(customVariables);
    } else if (variablesData?.data?.results) {
      setAvailableVariables(variablesData.data.results);
    }

    // Handle API errors with toast
    if (variablesData?.error) {
      toast.error(variablesData.message || "Failed to load variables");
    }
  }, [customVariables, variablesData]);

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: (data) => {
      if (data?.error) {
        toast.error(data.message || "Failed to create document");
        return;
      }

      if (data?.data) {
        toast.success("Document created successfully!");
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        onUpload?.(data.data);
        onClose();
        documentForm.reset();
      }
    },
    onError: () => {
      toast.error("Failed to create document. Please try again.");
    },
  });

  const documentForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      template_title: document?.template_title || "",
      template_description: document?.template_description || "",
      template_type: "rent", // Default to rent agreement
      template_content: document?.template_content || "",
    },
    mode: "onChange",
  });

  // Watch for document type changes and update schema
  const watchedDocumentType = documentForm.watch("template_type");
  useEffect(() => {
    if (watchedDocumentType && watchedDocumentType !== currentDocumentType) {
      setCurrentDocumentType(watchedDocumentType);
    }
  }, [watchedDocumentType, currentDocumentType]);

  // Dynamically build categories based on availableVariables
  useEffect(() => {
    if (availableVariables.length > 0) {
      const allCats = new Set<string>();
      availableVariables.forEach((v) => {
        if (v.category) allCats.add(v.category);
      });
      setVariableCategories([
        { value: "all", label: "All Variables" },
        ...Array.from(allCats).map((cat) => ({
          value: cat,
          label: formatCategoryLabel(cat),
        })),
      ]);
    }
  }, [availableVariables]);

  const filteredVariables =
    selectedCategory === "all"
      ? availableVariables
      : availableVariables.filter((v) => v.category === selectedCategory);

  // Insert variable at cursor
  const insertVariable = (variableName: string) => {
    if (editorRef.current) {
      const variableHtml = `<span class="template-variable" style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; color: #1d4ed8; font-weight: 500;">{{${variableName}}}</span>&nbsp;`;
      editorRef.current.insertContent(variableHtml);
    }
  };

  const handleContentChange = (content: string) => {
    documentForm.setValue("template_content", content);
  };

  const extractUsedVariables = (
    content: string
  ): Record<string, DocumentVariable> => {
    const usedVariables: Record<string, DocumentVariable> = {};
    availableVariables.forEach((variable) => {
      if (content.includes(`{{${variable.variable_name}}}`)) {
        usedVariables[variable.variable_name] = variable;
      }
    });
    return usedVariables;
  };

  // Helper to get current date in YYYY-MM-DD
  const getCurrentDate = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  // Generate header HTML for final document
  const getDocumentHeaderHtml = (
    title: string,
    date: string,
    docType: string
  ) => `
      <div class="document-header" style="
        padding: 32px 0;
        margin-bottom: 40px;
        border-bottom: 2px solid #e5e7eb;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 24px;">
            <img src="/images/logo.svg" alt="Company Logo" style="height: 80px; width: auto;" />
            <div style="padding-left: 20px;">
              <h1 style="
                font-size: 2.5rem; 
                font-weight: 700; 
                color: #1e293b; 
                margin: 0; 
                text-transform: uppercase;
                letter-spacing: 1px;
              ">${title}</h1>
              <p style="
                font-size: 1rem; 
                color: #64748b; 
                margin: 8px 0 0 0;
                font-weight: 500;
              ">${
                DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES]?.label ||
                docType
              }</p>
            </div>
          </div>
          
          <div style="text-align: right;">
            <div style="font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 8px;">Document Date</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: #1e293b;">${date}</div>
            <div style="font-size: 0.875rem; color: #64748b; margin-top: 8px;">
              Doc ID: DOC-${Date.now().toString().slice(-8).toUpperCase()}
            </div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px;">
          <div style="display: flex; gap: 32px;">
            <div>
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Status</div>
              <div style="font-size: 0.875rem; color: #059669; font-weight: 600;">ACTIVE</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Version</div>
              <div style="font-size: 0.875rem; color: #1d293b; font-weight: 600;">1.0</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Classification</div>
              <div style="font-size: 0.875rem; color: #dc2626; font-weight: 600;">CONFIDENTIAL</div>
            </div>
          </div>
          
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">Generated by</div>
            <div style="font-size: 0.875rem; color: #1d293b; font-weight: 600;">Document Management System</div>
          </div>
        </div>
      </div>
    `;

  // Initialize editor with default content based on document type
  const initializeEditorContent = () => {
    if (editorRef.current) {
      const docTypeConfig = DOCUMENT_TYPES[currentDocumentType];
      const defaultContent =
        docTypeConfig?.defaultContent || "Start writing here....";
      editorRef.current.setContent(defaultContent);
      // Set the form value
      documentForm.setValue("template_content", defaultContent);
    }
  };

  // Initialize with rent agreement content by default
  useEffect(() => {
    if (editorRef.current && !document?.template_content) {
      const rentConfig = DOCUMENT_TYPES.rent;
      if (rentConfig) {
        editorRef.current.setContent(rentConfig.defaultContent);
        documentForm.setValue("template_content", rentConfig.defaultContent);
      }
    }
  }, [editorRef.current, document?.template_content]);

  const handleSubmit = async (data: DocumentFormData) => {
    // Check for validation errors before submitting
    const errors = documentForm.formState.errors;
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const usedVariables = extractUsedVariables(data.template_content);

    // Generate the final document with header
    const finalContent =
      getDocumentHeaderHtml(
        data.template_title,
        getCurrentDate(),
        data.template_type
      ) + data.template_content;

    createMutation.mutate({
      template_title: data.template_title,
      template_description: data.template_description,
      template_type: data.template_type,
      template_content: finalContent,
      available_variables: usedVariables,
      is_active: true,
      is_default: false,
    });
  };

  const editorInit = {
    height: 500,
    menubar: false,
    branding: false,
    promotion: false,
    base_url: "/tinymce/js/tinymce",
    suffix: ".min",
    plugins: [
      "advlist",
      "autolink",
      "lists",
      "link",
      "image",
      "charmap",
      "preview",
      "anchor",
      "searchreplace",
      "visualblocks",
      "code",
      "fullscreen",
      "insertdatetime",
      "table",
      "help",
      "wordcount",
    ],
    toolbar:
      "undo redo | blocks | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | removeformat | code | help",
    block_formats:
      "Paragraph=p; Header 1=h1; Header 2=h2; Header 3=h3; Header 4=h4; Header 5=h5; Header 6=h6",
    content_style: `
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          font-size: 14px; 
          line-height: 1.6; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
          position: relative;
        }
        .template-variable { 
          background-color: #dbeafe; 
          padding: 2px 6px; 
          border-radius: 4px; 
          color: #1d4ed8; 
          font-weight: 500; 
        }
        h1, h2 { color: #333; }
        h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        img { max-width: 100%; height: auto; }
        p:first-child { margin-top: 0; }
        @media print {
          body { padding: 0; margin: 0; }
          .template-variable { 
            background-color: #f0f0f0; 
            border: 1px solid #ccc; 
          }
        }
      `,
    placeholder: "Start writing here....",
    init_instance_callback: (editor: TinyMCEEditor) => {
      console.log("TinyMCE initialized successfully:", editor.id);
    },
    setup: (editor: TinyMCEEditor) => {
      editorRef.current = editor;

      // Initialize with default content after editor is ready
      editor.on("init", () => {
        console.log("TinyMCE editor ready");
        initializeEditorContent();
      });

      // Add error handling
      editor.on("LoadContent", () => {
        console.log("TinyMCE content loaded");
      });

      // Prevent deletion of content at the very beginning
      editor.on("keydown", (e) => {
        if (
          (e.key === "Backspace" || e.key === "Delete") &&
          editor.selection.getRng().startOffset === 0 &&
          editor.selection.getRng().startContainer ===
            editor.getBody().firstChild
        ) {
          e.preventDefault();
        }
      });
    },
  };

  // Fixed header component that appears above the editor
  const FixedHeader = () => {
    const title = documentForm.watch("template_title") || "Document Title";
    const date = getCurrentDate();
    const docTypeConfig = DOCUMENT_TYPES[currentDocumentType];

    return (
      <div className="print:block p-6 border-gray-200 border-b-2">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-6">
            <img
              src="/images/logo.svg"
              alt="Company Logo"
              className="w-auto h-20 print:h-16"
            />
            <div>
              <h1 className="font-bold text-gray-900 print:text-2xl text-3xl uppercase tracking-wide">
                {title}
              </h1>
              <p className="font-medium text-gray-600 print:text-sm">
                {docTypeConfig?.label || "Document Template"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="mb-2 font-semibold text-gray-500 print:text-xs text-sm">
              Document Date
            </div>
            <div className="font-bold text-gray-900 print:text-lg text-xl">
              {date}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-gray-200 border-t">
          <div className="flex gap-8">
            <div>
              <div className="mb-1 font-semibold text-gray-500 text-xs uppercase">
                Status
              </div>
              <div className="font-semibold text-green-600 text-sm">ACTIVE</div>
            </div>
            <div>
              <div className="mb-1 font-semibold text-gray-500 text-xs uppercase">
                Version
              </div>
              <div className="font-semibold text-gray-900 text-sm">1.0</div>
            </div>
            <div>
              <div className="mb-1 font-semibold text-gray-500 text-xs uppercase">
                Classification
              </div>
              <div className="font-semibold text-red-600 text-sm">
                CONFIDENTIAL
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="mb-1 text-gray-500 text-xs">Generated by</div>
            <div className="font-semibold text-gray-900 text-sm">
              {session?.user?.email}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show loading overlay during mutation
  const LoadingOverlay = () => (
    <div className="z-50 absolute inset-0 flex justify-center items-center bg-white/70">
      <span className="font-semibold text-blue-600 text-lg animate-pulse">
        Creating document...
      </span>
    </div>
  );

  if (shouldFetchVariables && variablesLoading) {
    return <div className="p-8 text-center">Loading variables...</div>;
  }
  if (shouldFetchVariables && variablesError) {
    return (
      <div className="p-8 text-red-500 text-center">
        Failed to load variables.
      </div>
    );
  }

  const isViewMode = mode === "view";

  if (isViewMode && document) {
    // Render read-only view of the document
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="mt-10 min-w-6xl max-h-[calc(100vh-100px)] overflow-hidden xl">
          <DialogHeader>
            <DialogTitle>View Document</DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-auto" style={{ maxHeight: "70vh" }}>
            {/* Render the full HTML content (header + body) */}
            <div
              className="max-w-none prose"
              dangerouslySetInnerHTML={{
                __html: document.template_content || "",
              }}
            />
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="mt-10 min-w-6xl max-h-[calc(100vh-100px)] overflow-hidden xl">
        {createMutation.status === "pending" && <LoadingOverlay />}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-gray-600 text-sm">{description}</p>
        </DialogHeader>
        <div className="flex-1 gap-6 grid grid-cols-12 overflow-hidden">
          {/* Variables Panel */}
          <div className="col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Variables</CardTitle>
                <CardDescription>
                  {variablesFetching
                    ? "Loading variables..."
                    : "Click to insert into document"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 w-full">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {variableCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Loading indicator for variables */}
                {variablesFetching && (
                  <div className="flex justify-center items-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="border-2 border-t-transparent border-blue-600 rounded-full w-6 h-6 animate-spin"></div>
                      <span className="text-gray-600 text-sm">
                        Loading variables...
                      </span>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 w-full max-w-full">
                    {filteredVariables.map((variable) => (
                      <Button
                        key={variable.variable_name}
                        variant="outline"
                        className="box-border justify-start w-full h-auto"
                        onClick={() => insertVariable(variable.variable_name)}
                        type="button"
                      >
                        <div className="w-full max-w-full overflow-hidden text-left">
                          <div className="mb-1 font-mono text-blue-600 text-xs">
                            {`{{${variable.variable_name}}}`}
                          </div>
                          <div className="font-medium text-sm">
                            {variable.display_name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {variable.data_type}
                            </Badge>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <div className="col-span-9 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-120px)]">
              <Form {...documentForm}>
                <div className="space-y-4 p-4">
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={documentForm.control}
                      name="template_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Type *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setCurrentDocumentType(
                                value as
                                  | "rent"
                                  | "offer_letter"
                                  | "sales_agreement"
                              );
                              // Reset content when type changes
                              const newTypeConfig =
                                DOCUMENT_TYPES[
                                  value as
                                    | "rent"
                                    | "offer_letter"
                                    | "sales_agreement"
                                ];
                              if (newTypeConfig && editorRef.current) {
                                editorRef.current.setContent(
                                  newTypeConfig.defaultContent
                                );
                                documentForm.setValue(
                                  "template_content",
                                  newTypeConfig.defaultContent
                                );
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full !h-11">
                                <SelectValue placeholder="Select document type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(DOCUMENT_TYPES).map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={documentForm.control}
                      name="template_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Title *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`e.g., ${
                                DOCUMENT_TYPES[
                                  documentType as
                                    | "rent"
                                    | "offer_letter"
                                    | "sales_agreement"
                                ]?.label || "Document Title"
                              }`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          {documentForm.formState.errors.template_title && (
                            <div className="mt-1 text-red-500 text-xs">
                              {
                                documentForm.formState.errors.template_title
                                  .message as string
                              }
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={documentForm.control}
                    name="template_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description of this document..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator />
                  <FormField
                    control={documentForm.control}
                    name="template_content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Content *</FormLabel>
                        <FormDescription>
                          Use the variables panel to insert dynamic content
                        </FormDescription>
                        <FormControl>
                          <div className="border rounded-md overflow-hidden">
                            {/* Fixed Header */}
                            <FixedHeader />

                            {/* Editor with proper spacing */}
                            <div className="bg-white">
                              <Editor
                                tinymceScriptSrc="/tinymce/js/tinymce/tinymce.min.js"
                                value={field.value}
                                init={editorInit}
                                onEditorChange={handleContentChange}
                                onInit={(_evt, editor) => {
                                  editorRef.current = editor;
                                }}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                        {documentForm.formState.errors.template_content && (
                          <div className="mt-1 text-red-500 text-xs">
                            {
                              documentForm.formState.errors.template_content
                                .message as string
                            }
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={documentForm.handleSubmit(handleSubmit)}
                      disabled={createMutation.status === "pending"}
                      className="min-w-[120px]"
                    >
                      {createMutation.status === "pending"
                        ? "Creating..."
                        : "Create Document"}
                    </Button>
                  </DialogFooter>
                </div>
              </Form>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDocument;
