import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/types';

const paymentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  taskId: z.string().min(1, 'Task is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  status: z.enum(['due', 'invoiced', 'pending', 'received', 'overdue', 'canceled']),
  dueDate: z.date({ required_error: "Due date is required" }),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string | null;
  onPaymentSaved: () => void;
}

const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({
  open,
  onOpenChange,
  paymentId,
  onPaymentSaved
}) => {
  const isEditing = paymentId !== null;
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      clientId: '',
      taskId: '',
      amount: 0,
      status: 'due',
      dueDate: new Date(),
      invoiceNumber: '',
      notes: '',
    },
  });

  const selectedClientId = form.watch('clientId');

  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true);
    const isMounted = { current: true };
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      if (isMounted.current) setClients(data ?? []);
    } catch (err) {
      toast.error('Failed to load clients');
      console.error(err);
    } finally {
      if (isMounted.current) setIsLoadingClients(false);
    }
    return () => { isMounted.current = false; };
  }, []);

  const fetchTasks = useCallback(async (clientId: string) => {
    if (!clientId) return;
    setIsLoadingTasks(true);
    const isMounted = { current: true };
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('client_id', clientId)
        .order('title', { ascending: true });
      if (error) throw error;
      if (isMounted.current) {
        setTasks(data ?? []);
        const currentTaskId = form.getValues('taskId');
        if (isEditing && currentTaskId && !data?.some(t => t.id === currentTaskId)) {
          form.setValue('taskId', '');
          toast.error('Selected task is invalid for this client');
        }
      }
    } catch (err) {
      toast.error('Failed to load tasks');
      console.error(err);
    } finally {
      if (isMounted.current) setIsLoadingTasks(false);
    }
    return () => { isMounted.current = false; };
  }, [form, isEditing]);

  const fetchPayment = useCallback(async () => {
    if (!paymentId) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      if (error) throw error;
  
      if (data) {
        form.reset({
          clientId: data.client_id,
          amount: data.amount,
          status: data.status,
          dueDate: new Date(data.due_date),
          invoiceNumber: data.invoice_number || '',
          notes: data.notes || '',
        });
  
        // 🔥 Important: wait for task list before setting taskId
        await fetchTasks(data.client_id);
        form.setValue('taskId', data.task_id);
      }
    } catch (err) {
      toast.error('Failed to load payment');
      console.error(err);
    }
  }, [form, paymentId, fetchTasks]);  

  useEffect(() => {
    if (open) {
      fetchClients();
      if (isEditing) fetchPayment();
    } else {
      form.reset();
    }
  }, [open, fetchClients, fetchPayment, isEditing, form]);

  useEffect(() => {
    if (open && selectedClientId) {
      fetchTasks(selectedClientId);
    } else {
      setTasks([]);
      if (!isEditing) {
        form.setValue('taskId', '');
      }
    }
  }, [open, selectedClientId, fetchTasks, form, isEditing]);

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    try {
      const payload = {
        client_id: values.clientId,
        task_id: values.taskId,
        amount: values.amount,
        status: values.status,
        due_date: values.dueDate.toISOString(),
        invoice_number: values.invoiceNumber,
        notes: values.notes,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { error } = await supabase
          .from('payments')
          .update(payload)
          .eq('id', paymentId);
        if (error) throw error;
      } else {
        payload['created_at'] = new Date().toISOString();
        const { error } = await supabase
          .from('payments')
          .insert([payload]);
        if (error) throw error;
      }

      toast.success(isEditing ? 'Payment updated successfully' : 'Payment added successfully');
      onOpenChange(false);
      onPaymentSaved();
    } catch (err) {
      toast.error('Failed to save payment');
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the payment information below.' : 'Fill in the payment information to create a new record.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Select */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingClients || isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingClients ? 'Loading...' : 'Select client'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Task Select */}
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingTasks || !selectedClientId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingTasks
                                ? 'Loading...'
                                : !selectedClientId
                                  ? 'Select a client first'
                                  : tasks.length === 0
                                    ? 'No tasks available'
                                    : 'Select task'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tasks.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['due', 'invoiced', 'pending', 'received', 'overdue', 'canceled'].map(status => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn('w-full text-left font-normal', !field.value && 'text-muted-foreground')}>
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={date => date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Invoice Number */}
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. INV-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes related to the payment..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Update Payment' : 'Add Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;