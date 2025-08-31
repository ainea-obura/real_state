export const getVerificationActions = (currentStatus: string) => {
  switch (currentStatus?.toLowerCase()) {
    case "rejected":
      return [{ label: "Approve", action: "approve", variant: "default" as const }];
    case "approved":
      return [{ label: "Reject", action: "reject", variant: "destructive" as const }];
    case "pending":
      return [
        { label: "Approve", action: "approve", variant: "default" as const },
        { label: "Reject", action: "reject", variant: "destructive" as const },
      ];
    default:
      return [];
  }
};
