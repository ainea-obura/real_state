"use client";

import { useState, useEffect } from 'react';
import { Clock, Mail, Calendar, Play, Pause, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchTaskConfigurations,
  saveAllTaskConfigurations,
  testTaskExecution,
  type TaskConfiguration,
  type TaskConfigurationUpdate,
} from '@/actions/finance/taskSettings';

// Form schemas
const invoiceTaskSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.string().optional(),
  dayOfMonth: z.string().optional(),
  executionFrequency: z.enum(['every_minute', 'every_hour', 'every_4_hours', 'every_6_hours', 'once_daily']),
});

const reminderTaskSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.string().optional(),
  beforeDue: z.number().min(0).max(30),
  afterDue: z.number().min(0).max(30),
  executionFrequency: z.enum(['every_minute', 'every_hour', 'every_4_hours', 'every_6_hours', 'once_daily']),
});

type InvoiceTaskForm = z.infer<typeof invoiceTaskSchema>;
type ReminderTaskForm = z.infer<typeof reminderTaskSchema>;

const TaskManagementSettings = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formsLoaded, setFormsLoaded] = useState(false);

  const invoiceForm = useForm<InvoiceTaskForm>({
    resolver: zodResolver(invoiceTaskSchema),
    defaultValues: {
      enabled: true,
      frequency: 'weekly',
      executionFrequency: 'once_daily',
    },
  });

  const reminderForm = useForm<ReminderTaskForm>({
    resolver: zodResolver(reminderTaskSchema),
    defaultValues: {
      enabled: true,
      frequency: 'daily',
      executionFrequency: 'once_daily',
      beforeDue: 2,
      afterDue: 1,
    },
  });

  // Fetch task configurations
  const { data: taskConfigs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['task-configurations'],
    queryFn: fetchTaskConfigurations,
  });

  console.log('Task configurations:', taskConfigs);

  // Save all configurations mutation
  const saveMutation = useMutation({
    mutationFn: ({ invoiceConfig, reminderConfig }: { 
      invoiceConfig: TaskConfigurationUpdate; 
      reminderConfig: TaskConfigurationUpdate; 
    }) => saveAllTaskConfigurations(invoiceConfig, reminderConfig),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['task-configurations'] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error('Failed to save task configurations');
    },
  });

  // Test invoice task execution mutation
  const testInvoiceMutation = useMutation({
    mutationFn: testTaskExecution,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['task-configurations'] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error('Failed to test invoice task execution');
    },
  });

  // Test reminder task execution mutation
  const testReminderMutation = useMutation({
    mutationFn: testTaskExecution,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['task-configurations'] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error('Failed to test reminder task execution');
    },
  });

  // Load existing configurations into forms
  useEffect(() => {
    if (taskConfigs && typeof taskConfigs === 'object' && 'data' in taskConfigs && Array.isArray(taskConfigs.data)) {
      const configs = taskConfigs.data as TaskConfiguration[];
      
      console.log('All configs:', configs);
      
      const invoiceConfig = configs.find(config => config.task_type === 'invoice_generation');
      const reminderConfig = configs.find(config => config.task_type === 'invoice_reminders');

      if (invoiceConfig) {
        console.log('Loading invoice config:', invoiceConfig);
        console.log('Invoice frequency:', invoiceConfig.frequency);
        console.log('Invoice day_of_week:', invoiceConfig.day_of_week);
        console.log('Invoice day_of_month:', invoiceConfig.day_of_month);
        
        const invoiceFormData = {
          enabled: invoiceConfig.enabled,
          frequency: invoiceConfig.frequency as 'daily' | 'weekly' | 'monthly',
          executionFrequency: (invoiceConfig.execution_frequency as 'every_minute' | 'every_hour' | 'every_4_hours' | 'every_6_hours' | 'once_daily') || 'once_daily',
          dayOfWeek: invoiceConfig.day_of_week || undefined,
          dayOfMonth: invoiceConfig.day_of_month ? invoiceConfig.day_of_month.toString() : undefined,
        };
        
        console.log('Invoice form data to reset:', invoiceFormData);
        // Small delay to ensure form is ready
        setTimeout(() => {
          invoiceForm.reset(invoiceFormData);
        }, 100);
      }

      if (reminderConfig) {
        console.log('Loading reminder config:', reminderConfig);
        console.log('Reminder frequency:', reminderConfig.frequency);
        console.log('Reminder day_of_week:', reminderConfig.day_of_week);
        console.log('Reminder before_due_days:', reminderConfig.before_due_days);
        console.log('Reminder after_due_days:', reminderConfig.after_due_days);
        
        const reminderFormData = {
          enabled: reminderConfig.enabled,
          frequency: reminderConfig.frequency as 'daily' | 'weekly' | 'monthly',
          executionFrequency: (reminderConfig.execution_frequency as 'every_minute' | 'every_hour' | 'every_4_hours' | 'every_6_hours' | 'once_daily') || 'once_daily',
          dayOfWeek: reminderConfig.day_of_week || undefined,
          beforeDue: reminderConfig.before_due_days || 2,
          afterDue: reminderConfig.after_due_days || 1,
        };
        
        console.log('Reminder form data to reset:', reminderFormData);
        // Small delay to ensure form is ready
        setTimeout(() => {
          reminderForm.reset(reminderFormData);
        }, 100);
      }
      
      setFormsLoaded(true);
    }
  }, [taskConfigs, invoiceForm, reminderForm]);

  const handleTestInvoiceTask = async () => {
    testInvoiceMutation.mutate({
      task_type: 'invoice_generation',
      force_run: false,
    });
  };

  const handleTestReminderTask = async () => {
    testReminderMutation.mutate({
      task_type: 'invoice_reminders',
      force_run: false,
    });
  };

  const handleSaveAll = async () => {
    const invoiceData = invoiceForm.getValues();
    const reminderData = reminderForm.getValues();
    
    console.log('Invoice form data:', invoiceData);
    console.log('Reminder form data:', reminderData);
    
    const invoiceConfig: TaskConfigurationUpdate = {
      enabled: invoiceData.enabled,
      frequency: invoiceData.frequency,
      execution_frequency: invoiceData.executionFrequency,
      day_of_week: invoiceData.dayOfWeek,
      day_of_month: invoiceData.dayOfMonth ? parseInt(invoiceData.dayOfMonth) : undefined,
      status: 'active',
    };

    const reminderConfig: TaskConfigurationUpdate = {
      enabled: reminderData.enabled,
      frequency: reminderData.frequency,
      execution_frequency: reminderData.executionFrequency,
      day_of_week: reminderData.dayOfWeek,
      before_due_days: reminderData.beforeDue,
      after_due_days: reminderData.afterDue,
      status: 'active',
    };

    console.log('Invoice config to save:', invoiceConfig);
    console.log('Reminder config to save:', reminderConfig);
    console.log('Invoice execution_frequency:', invoiceConfig.execution_frequency);
    console.log('Reminder execution_frequency:', reminderConfig.execution_frequency);

    saveMutation.mutate({ invoiceConfig, reminderConfig });
  };

  return (
    <div className="space-y-6">
      {/* Invoice Generation Task */}
      <div className="p-6 bg-white rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Invoice Generation</h3>
              <p className="text-sm text-gray-600">Automatically generate invoices for tenants</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Switch
              checked={invoiceForm.watch('enabled')}
              onCheckedChange={(checked) => invoiceForm.setValue('enabled', checked)}
            />
            <Label className="text-sm font-medium">
              {invoiceForm.watch('enabled') ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        </div>

        {invoiceForm.watch('enabled') && (
          <Form {...invoiceForm}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={invoiceForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Frequency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        key={`invoice-frequency-${field.value}`}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {invoiceForm.watch('frequency') === 'weekly' && (
                  <FormField
                    control={invoiceForm.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Day of Week</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {invoiceForm.watch('frequency') === 'monthly' && (
                  <FormField
                    control={invoiceForm.control}
                    name="dayOfMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Day of Month</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={invoiceForm.control}
                  name="executionFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Execution Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once_daily">Once Daily (1/day)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* <div className="flex flex-wrap gap-3 items-center pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestInvoiceTask}
                  disabled={testInvoiceMutation.isPending}
                  className="flex gap-2 items-center"
                >
                  {testInvoiceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {testInvoiceMutation.isPending ? 'Testing...' : 'Test Task'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex gap-2 items-center"
                >
                  <RefreshCw className="w-4 h-4" />
                  {isLoadingConfigs ? 'Loading...' : 'Last Run: 2025-08-01 09:00'}
                </Button>
              </div> */}
            </form>
          </Form>
        )}
      </div>

      {/* Invoice Reminders Task */}
      <div className="p-6 bg-white rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Invoice Reminders</h3>
              <p className="text-sm text-gray-600">Send automated reminders for due invoices</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Switch
              checked={reminderForm.watch('enabled')}
              onCheckedChange={(checked) => reminderForm.setValue('enabled', checked)}
            />
            <Label className="text-sm font-medium">
              {reminderForm.watch('enabled') ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        </div>

        {reminderForm.watch('enabled') && (
          <Form {...reminderForm}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={reminderForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Frequency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        key={`reminder-frequency-${field.value}`}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {reminderForm.watch('frequency') === 'weekly' && (
                  <FormField
                    control={reminderForm.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Day of Week</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={reminderForm.control}
                  name="beforeDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Before Due (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="w-full h-10"
                          min="0"
                          max="30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={reminderForm.control}
                  name="afterDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">After Due (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="w-full h-10"
                          min="0"
                          max="30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={reminderForm.control}
                  name="executionFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Execution Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once_daily">Once Daily (1/day)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* <div className="flex flex-wrap gap-3 items-center pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestReminderTask}
                  disabled={testReminderMutation.isPending}
                  className="flex gap-2 items-center"
                >
                  {testReminderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {testReminderMutation.isPending ? 'Testing...' : 'Test Task'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex gap-2 items-center"
                >
                  <RefreshCw className="w-4 h-4" />
                  {isLoadingConfigs ? 'Loading...' : 'Last Run: 2025-08-01 08:00'}
                </Button>
              </div> */}
            </form>
          </Form>
        )}
      </div>



      {/* Shared Save Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button 
          onClick={handleSaveAll} 
          size="lg"
          disabled={saveMutation.isPending || isLoadingConfigs}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save All Settings'
          )}
        </Button>
      </div>
    </div>
  );
};

export default TaskManagementSettings; 