import { AlertTriangle, Loader2, PauseCircle, XCircle, Trash2, PlayCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

const actionConfig = {
  remove: {
    keyword: "REMOVE",
    color: "red",
    icon: Trash2,
    title: "Remove Service",
    confirmText: "Remove",
    warning: "All data for this service will be permanently removed.",
    toast: "Service removed successfully",
    iconColor: "text-red-500",
    buttonColor: "#dc2626",
    tooltip: "Remove Service",
  },
  pause: {
    keyword: "PAUSE",
    color: "yellow",
    icon: PauseCircle,
    title: "Pause Service",
    confirmText: "Pause",
    warning: "This service will be paused. You can resume it later.",
    toast: "Service paused successfully",
    iconColor: "text-yellow-500",
    buttonColor: "#eab308",
    tooltip: "Pause Service",
  },
  cancel: {
    keyword: "CANCEL",
    color: "yellow",
    icon: XCircle,
    title: "Cancel Service",
    confirmText: "Cancel",
    warning: "This service will be cancelled and cannot be resumed.",
    toast: "Service cancelled successfully",
    iconColor: "text-yellow-500",
    buttonColor: "#eab308",
    tooltip: "Cancel Service",
  },
  activate: {
    keyword: "ACTIVATE",
    color: "green",
    icon: PlayCircle,
    title: "Activate Service",
    confirmText: "Activate",
    warning: "This service will be re-activated and set to active.",
    toast: "Service activated successfully",
    iconColor: "text-green-600",
    buttonColor: "#22c55e",
    tooltip: "Activate Service",
  },
};

type ActionType = keyof typeof actionConfig;

interface ServiceActionModalProps {
  open: boolean;
  onClose: () => void;
  service: { id: string | number; name: string } | null;
  onAction: (id: string | number, type: ActionType) => void;
  actionType: ActionType;
}

const ServiceActionModal: React.FC<ServiceActionModalProps> = ({ open, onClose, service, onAction, actionType }) => {
  const config = actionConfig[actionType];
  const actionSchema = z
    .object({ confirmation: z.string() })
    .refine((data) => data.confirmation === config.keyword, {
      message: `Please type ${config.keyword} to confirm`,
      path: ["confirmation"],
    });
  type ActionForm = z.infer<typeof actionSchema>;
  const form = useForm<ActionForm>({
    resolver: zodResolver(actionSchema),
    defaultValues: { confirmation: "" },
  });

  const { mutate: doAction, isPending } = useMutation({
    mutationFn: async () => {
      // Replace with real API call
      await new Promise((res) => setTimeout(res, 800));
      return service?.id;
    },
    onSuccess: (id) => {
      toast.success(config.toast, { className: "bg-primary text-white" });
      onAction(id!, actionType);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message, { className: "bg-destructive text-white" });
    },
  });

  const handleClose = () => {
    onClose();
    form.reset();
  };

  const onSubmit = (data: ActionForm) => {
    if (data.confirmation === config.keyword) {
      doAction();
    }
  };

  if (!open || !service) return null;
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="shadow-2xl p-8 border-0 rounded-2xl max-w-md">
        <DialogHeader className="mb-2">
          <div className="flex flex-col items-center gap-2">
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
            <DialogTitle className={`font-bold text-2xl text-center tracking-tight ${config.iconColor}`}>
              {config.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="mb-4 font-semibold text-gray-900 text-lg text-center">
          Are you sure you want to {actionType} service{' '}
          <span className={`font-bold ${config.iconColor}`}>'{service.name}'</span>?
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700 text-xs">
                    Please type <span className={`font-bold ${config.iconColor}`}>{config.keyword}</span> to confirm
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      placeholder={`Type ${config.keyword}`}
                      autoFocus
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-center items-center gap-4 mt-4 text-gray-500 text-sm">
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
              <span>
                <span className={`font-semibold ${config.iconColor}`}>Warning:</span> {config.warning}
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
                style={{ backgroundColor: config.buttonColor, color: "#fff" }}
                className="min-w-[100px] font-bold"
                disabled={!form.formState.isValid || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" /> {config.confirmText}ing...
                  </>
                ) : (
                  config.confirmText
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceActionModal; 