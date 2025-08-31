import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const deleteConfirmationSchema = z
  .object({ confirmation: z.string() })
  .refine((data) => data.confirmation === 'DELETE', {
    message: 'Please type DELETE to confirm',
    path: ['confirmation'],
  });

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  invoiceNumber?: string;
  loading?: boolean;
  error?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: React.ReactNode;
  confirmColor?: string; // e.g. 'destructive', 'warning', etc.
  confirmationPhrase?: string; // e.g. 'DELETE', 'CANCEL'
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title = 'Delete Item',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  invoiceNumber,
  loading = false,
  error = null,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  icon,
  confirmColor = 'destructive',
  confirmationPhrase = 'DELETE',
}: ConfirmationDialogProps) {
  const form = useForm<{ confirmation: string }>({
    defaultValues: { confirmation: '' },
    mode: 'onChange',
    resolver: async (values) => {
      try {
        z.object({ confirmation: z.string() })
          .refine((data) => data.confirmation === confirmationPhrase, {
            message: `Please type ${confirmationPhrase} to confirm`,
            path: ['confirmation'],
          })
          .parse(values);
        return { values, errors: {} };
      } catch (e: any) {
        return { values, errors: e.formErrors?.fieldErrors || {} };
      }
    },
  });

  const handleSubmit = async (data: { confirmation: string }) => {
    if (data.confirmation === confirmationPhrase) {
      await onConfirm();
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-8 max-w-md rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="mb-2">
          <div className="flex flex-col gap-2 items-center">
            {icon || <AlertTriangle className="w-8 h-8 text-red-500" />}
            <DialogTitle className={`text-2xl font-bold tracking-tight text-center ${confirmColor === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="mb-4 text-lg font-semibold text-center text-gray-900">
          {invoiceNumber ? (
            <>
              {description}
            </>
          ) : (
            description
          )}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-700">
                    Please type <span className={`font-bold ${confirmColor === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>{confirmationPhrase}</span> to confirm
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      placeholder={`Type ${confirmationPhrase}`}
                      autoFocus
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4 justify-center items-center mt-4 text-sm text-gray-500">
              {icon || <AlertTriangle className="w-8 h-8 text-red-400" />}
              <span>
                <span className={`font-semibold ${confirmColor === 'warning' ? 'text-yellow-600' : 'text-red-500'}`}>Warning:</span> This action cannot be undone.
              </span>
            </div>
            {error && (
              <div className="text-sm font-medium text-center text-red-600">{error}</div>
            )}
            <DialogFooter className="flex flex-row gap-3 justify-center mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="min-w-[100px]"
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                style={confirmColor === 'warning' ? { backgroundColor: '#f59e42', color: '#fff' } : { backgroundColor: '#dc2626', color: '#fff' }}
                className="min-w-[100px] font-bold"
                disabled={!form.formState.isValid || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" /> {confirmLabel}...
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 