import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  UserCircle2,
  ArchiveX,
} from "lucide-react";
import {
  listVerificationDocuments,
  uploadVerificationDocument,
  updateVerificationStatus,
} from "@/actions/clients";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PermissionGate } from '@/components/PermissionGate';

const CATEGORY_LABELS: Record<string, string> = {
  passport: "Passport",
  national_id: "National ID Card",
  driver_license: "Driver's License",
  residence_permit: "Residence Permit",
  other: "Other",
};

const STATUS_STYLES: Record<
  string,
  { badge: string; icon: React.ReactNode; text: string; card: string; button: string }
> = {
  approved: {
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="mr-1 w-4 h-4" />,
    text: "Approved",
    card: "bg-gradient-to-br from-green-50/80 to-white/80 border-green-200 shadow-green-100",
    button: "bg-green-600 hover:bg-green-700 text-white",
  },
  pending: {
    badge: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="mr-1 w-4 h-4" />,
    text: "Pending",
    card: "bg-gradient-to-br from-yellow-50/80 to-white/80 border-yellow-200 shadow-yellow-100",
    button: "bg-yellow-500 hover:bg-yellow-600 text-white",
  },
  rejected: {
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="mr-1 w-4 h-4" />,
    text: "Rejected",
    card: "bg-gradient-to-br from-red-50/80 to-white/80 border-red-200 shadow-red-100",
    button: "bg-red-600 hover:bg-red-700 text-white",
  },
  expired: {
    badge: "bg-gray-200 text-gray-600",
    icon: <ArchiveX className="mr-1 w-4 h-4" />,
    text: "Expired",
    card: "bg-gradient-to-br from-gray-100/80 to-white/80 border-gray-200 shadow-gray-100",
    button: "bg-gray-500 hover:bg-gray-600 text-white",
  },
};

interface VerificationDocument {
  id: string;
  category: string;
  idNumber: string;
  documentImageUrl: string;
  userImageUrl?: string;
  status: "pending" | "approved" | "rejected" | "expired";
  updatedAt: string;
  reason?: string;
}

type TabKey = "all" | "approved" | "pending" | "rejected" | "expired";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
];

const OwnerVerification = ({ ownerId }: { ownerId: string }) => {
  const [tab, setTab] = useState<TabKey>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["owner-verification-documents", ownerId],
    queryFn: () => listVerificationDocuments(ownerId, "owner"),
    refetchOnWindowFocus: false,
  });

  const documents: VerificationDocument[] =
    (data?.data?.verifications || []).map((doc: any) => ({
      id: doc.id,
      category: doc.category,
      idNumber: doc.id_number,
      documentImageUrl: doc.document_image,
      userImageUrl: doc.user_image,
      status: doc.status,
      updatedAt: doc.updated_at || doc.created_at,
      reason: doc.reason,
    })) || [];
  const needsDocument = data?.data?.needs_document ?? false;

  const uploadMutation = useMutation({
    mutationFn: async (payload: Omit<VerificationDocument, "id" | "status" | "updatedAt" | "reason"> & { documentImage: File; userImage?: File }) => {
      return uploadVerificationDocument(
        ownerId,
        "owner",
        payload.category,
        payload.idNumber,
        payload.documentImage,
        payload.userImage
      );
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to upload document");
        return;
      }
      toast.success(data.message || "Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["owner-verification-documents", ownerId] });
      setModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload document");
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" | "expire" }) => {
      return updateVerificationStatus(id, action, "owner");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-verification-documents", ownerId] });
    },
  });

  const filteredDocs =
    tab === "all" ? documents : documents.filter((doc) => doc.status === tab);

  const handleExpire = (id: string) => {
    statusMutation.mutate({ id, action: "expire" });
  };
  const handleApprove = (id: string) => {
    statusMutation.mutate({ id, action: "approve" });
  };
  const handleReject = (id: string) => {
    statusMutation.mutate({ id, action: "reject" });
  };

  const handleUpload = (data: Omit<VerificationDocument, "id" | "status" | "updatedAt" | "reason"> & { documentImage: File; userImage?: File }) => {
    uploadMutation.mutate(data);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/60 shadow-sm
            ${tab === t.key
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-500/10 text-gray-500 hover:bg-primary/5 hover:text-primary'}
          `}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key}
              tabIndex={0}
            >
              {t.label}
            </button>
          ))}
        </div>
        {needsDocument && (
          <PermissionGate codename="add_owner_verification" showFallback={false}>
          <Button
            size="sm"
            className="px-4 py-2 font-semibold text-white rounded-full shadow bg-primary hover:bg-primary/90"
            onClick={() => setModalOpen(true)}
            disabled={uploadMutation.isPending || statusMutation.isPending}
          >
            <UploadCloud className="mr-2 w-4 h-4" /> Upload Document
          </Button>
          </PermissionGate>
        )}
      </div>
      {(isError || uploadMutation.isError || statusMutation.isError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || uploadMutation.error?.message || statusMutation.error?.message || "An error occurred."}
          </AlertDescription>
        </Alert>
      )}
      {isLoading || uploadMutation.isPending || statusMutation.isPending ? (
        <div className="flex justify-center items-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="mb-8 bg-white rounded-xl border shadow-lg">
          <CardContent className="flex flex-col gap-6 justify-center items-center py-12">
            <UploadCloud className="mb-2 w-14 h-14 text-muted-foreground" />
            <div className="text-2xl font-bold">No Documents Found</div>
            <div className="max-w-md text-center text-muted-foreground">
              {needsDocument
                ? "You have no verification documents. Please upload your identity document to get started."
                : "No documents in this category."}
            </div>
            {needsDocument && (
              <PermissionGate codename="add_owner_verification" showFallback={false}>
              <Button
                size="lg"
                className="px-6 py-2 mt-2 font-semibold text-white rounded-full shadow bg-primary hover:bg-primary/90"
                onClick={() => setModalOpen(true)}
                disabled={uploadMutation.isPending || statusMutation.isPending}
              >
                Upload Document
              </Button>
              </PermissionGate>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="rounded-xl border shadow-lg bg-white flex flex-col justify-between min-h-[340px] p-0"
            >
              <CardHeader className="flex flex-row gap-2 justify-between items-start p-6 pb-2">
                <Badge
                  className={`rounded-full px-3 py-1.5 font-semibold flex items-center text-xs shadow-sm ${STATUS_STYLES[doc.status].badge}`}
                  variant={doc.status === 'approved' ? 'default' : doc.status === 'pending' ? 'secondary' : doc.status === 'rejected' ? 'destructive' : 'outline'}
                >
                  {STATUS_STYLES[doc.status].icon}
                  {STATUS_STYLES[doc.status].text}
                </Badge>
                <span className="mt-1 font-mono text-xs text-muted-foreground">{doc.updatedAt}</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 px-6 pb-4">
                <div className="mb-1 text-base font-semibold truncate text-foreground">
                  {CATEGORY_LABELS[doc.category]}
                </div>
                <div className="mb-2 text-xs truncate text-muted-foreground">
                  ID: <span className="font-semibold text-foreground">{doc.idNumber}</span>
                </div>
                <div className="flex flex-row gap-6 items-center mt-2">
                  <div className="flex flex-col items-center w-24">
                    <div className="text-[11px] text-muted-foreground mb-1">Document</div>
                    {doc.documentImageUrl ? (
                      <img
                        src={doc.documentImageUrl}
                        alt="Document image preview"
                        title="Click to view full size"
                        className="object-cover w-20 h-16 rounded-lg border shadow cursor-pointer"
                        onClick={() => window.open(doc.documentImageUrl, '_blank', 'noopener,noreferrer')}
                        tabIndex={0}
                        role="button"
                        aria-label="View document image full size"
                      />
                    ) : (
                      <div className="flex justify-center items-center w-20 h-16 text-[10px] rounded-lg bg-muted text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="flex flex-col items-center w-16">
                    <div className="text-[11px] text-muted-foreground mb-1">Face</div>
                    {doc.userImageUrl ? (
                      <img
                        src={doc.userImageUrl}
                        alt="User face preview"
                        title="Click to view full size"
                        className="object-cover w-12 h-12 rounded-full border shadow cursor-pointer"
                        onClick={() => window.open(doc.userImageUrl, '_blank', 'noopener,noreferrer')}
                        tabIndex={0}
                        role="button"
                        aria-label="View face image full size"
                      />
                    ) : (
                      <div className="flex justify-center items-center w-12 h-12 text-[10px] rounded-full bg-muted text-muted-foreground">
                        <UserCircle2 className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                </div>
                {doc.status === "rejected" && (
                  <Alert variant="destructive" className="p-2 mt-2 text-xs rounded-lg shadow">
                    <AlertTitle className="text-xs">Rejected</AlertTitle>
                    <AlertDescription>{doc.reason || "Your verification was rejected."}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex gap-2 justify-end px-6 pt-0 pb-4">
                {doc.status === "approved" && (
                  <PermissionGate codename="edit_owner_verification" showFallback={false}>
                  <Button size="sm" className={`rounded-full ${STATUS_STYLES[doc.status].button} shadow font-semibold`} onClick={() => handleExpire(doc.id)} disabled={uploadMutation.isPending || statusMutation.isPending}>
                    Expire
                  </Button>
                  </PermissionGate>
                )}
                {doc.status === "pending" && (
                  <>
                    <PermissionGate codename="edit_owner_verification" showFallback={false}>
                    <Button size="sm" className={`rounded-full ${STATUS_STYLES["approved"].button} shadow font-semibold`} onClick={() => handleApprove(doc.id)} disabled={uploadMutation.isPending || statusMutation.isPending}>
                      Approve
                    </Button>
                    </PermissionGate>
                    <PermissionGate codename="edit_owner_verification" showFallback={false}>
                    <Button size="sm" className={`rounded-full ${STATUS_STYLES["rejected"].button} shadow font-semibold`} onClick={() => handleReject(doc.id)} disabled={uploadMutation.isPending || statusMutation.isPending}>
                      Reject
                    </Button>
                    </PermissionGate>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <PermissionGate codename="add_owner_verification" showFallback={false}>
      <VerificationUploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={(newData) => {
          handleUpload(newData as any);
        }}
        loading={uploadMutation.isPending || statusMutation.isPending}
      />
      </PermissionGate>
    </div>
  );
};

interface VerificationUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: Omit<VerificationDocument, "id" | "status" | "updatedAt" | "reason"> & { documentImage: File; userImage?: File }
  ) => void;
  loading?: boolean;
}

function VerificationUploadModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: VerificationUploadModalProps) {
  const [category, setCategory] = useState("passport");
  const [idNumber, setIdNumber] = useState("");
  const [documentImage, setDocumentImage] = useState<File | null>(null);
  const [userImage, setUserImage] = useState<File | null>(null);
  const [documentImageUrl, setDocumentImageUrl] = useState<string>("");
  const [userImageUrl, setUserImageUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategory("passport");
    setIdNumber("");
    setDocumentImageUrl("");
    setUserImageUrl("");
    setDocumentImage(null);
    setUserImage(null);
    setError(null);
  }, [open]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "document" | "user"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (type === "document") {
      setDocumentImage(file);
      setDocumentImageUrl(url);
    } else {
      setUserImage(file);
      setUserImageUrl(url);
    }
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !idNumber) {
      setError("Please fill all required fields.");
      return;
    }
    if (!documentImage && !documentImageUrl) {
      setError("Document image is required.");
      return;
    }
    onSubmit({
      category,
      idNumber,
      documentImageUrl: documentImageUrl,
      userImageUrl: userImageUrl,
      documentImage: documentImage!,
      userImage: userImage || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-visible p-0 max-w-lg rounded-xl border-0 shadow-2xl">
        <div className="p-0 bg-white rounded-xl shadow-lg dark:bg-card">
          <div className="flex flex-col items-center px-10 pt-10 pb-4">
            <div className="flex flex-col items-center w-full">
              <div className="mb-2">
                <UploadCloud className="w-14 h-14 text-primary" />
              </div>
              <DialogHeader className="items-center w-full">
                <DialogTitle className="w-full text-2xl font-bold text-center">
                  Upload Verification Document
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 mb-4 max-w-md text-base text-center text-muted-foreground">
                Upload your identity document and (optionally) a face photo.<br />
                Your information will be reviewed for verification.
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6 mt-2 w-full"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-semibold">
                    Document Type
                  </label>
                  <Select value={category} onValueChange={setCategory} disabled={loading}>
                    <SelectTrigger className="rounded-full">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-semibold">
                    Document ID
                  </label>
                  <Input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    required
                    placeholder="Enter document ID"
                    disabled={loading}
                    className="rounded-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-semibold">
                    Document Image <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "document")}
                    ref={fileInputRef}
                    disabled={loading}
                    className="rounded-full"
                  />
                  {documentImageUrl && (
                    <div className="flex flex-col items-center mt-3">
                      <img
                        src={documentImageUrl}
                        alt="Document preview"
                        className="object-cover w-40 h-28 rounded-xl border shadow-md"
                      />
                      <span className="mt-1 text-xs text-muted-foreground">
                        {documentImage?.name || "Current document"}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-semibold">
                    Face Photo (optional)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "user")}
                    disabled={loading}
                    className="rounded-full"
                  />
                  {userImageUrl && (
                    <div className="flex flex-col items-center mt-3">
                      <img
                        src={userImageUrl}
                        alt="User preview"
                        className="object-cover w-20 h-20 rounded-full border shadow"
                      />
                      <span className="mt-1 text-xs text-muted-foreground">
                        {userImage?.name || "Current face photo"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <DialogFooter className="flex flex-row gap-2 justify-end mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="font-semibold rounded-full">Submit</Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OwnerVerification; 