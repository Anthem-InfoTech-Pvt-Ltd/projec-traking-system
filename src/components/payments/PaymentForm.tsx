import React, { useImperativeHandle, forwardRef, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentStatus } from '@/types';
import SimpleDatePicker from '../ui/customCalendar';
import { debounce } from 'lodash';

const paymentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  taskId: z.string().min(1, 'Task is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  status: z.enum(['due', 'invoiced', 'pending', 'received', 'overdue', 'canceled']),
  dueDate: z.date({ required_error: 'Due date is required' }).optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  onSubmit: (values: PaymentFormValues) => void;
  defaultValues?: Partial<PaymentFormValues>;
  clients: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  isLoadingClients?: boolean;
  isLoadingTasks?: boolean;
  isEditing?: boolean;
  onClientChange?: (clientId: string) => void;
}

export interface PaymentFormRef {
  submit: () => void;
  reset: (values: Partial<PaymentFormValues>) => void;
}

const PaymentForm = forwardRef<PaymentFormRef, PaymentFormProps>(
  (
    {
      onSubmit,
      defaultValues = {
        clientId: '',
        taskId: '',
        amount: 0,
        status: 'due',
        dueDate: undefined,
        invoiceNumber: '',
        notes: '',
      },
      clients,
      tasks,
      isLoadingClients = false,
      isLoadingTasks = false,
      isEditing = false,
      onClientChange,
    },
    ref
  ) => {
    const form = useForm<PaymentFormValues>({
      resolver: zodResolver(paymentSchema),
      defaultValues,
    });
    const prevClientIdRef = useRef<string>(''); // Track previous clientId

    useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      reset: (values) => {
        console.log('Resetting form with:', values, 'Tasks:', tasks);
        form.reset(values);
      },
    }));

    // Reset form when defaultValues change in edit mode
    useEffect(() => {
      if (isEditing) {
        console.log('Default values changed:', defaultValues);
        form.reset(defaultValues);
      }
    }, [defaultValues, isEditing, form]);

    // Debug form errors
    useEffect(() => {
      if (Object.keys(form.formState.errors).length > 0) {
        console.log('PaymentForm validation errors:', form.formState.errors);
      }
    }, [form.formState.errors]);

    // Debounced client change handler
    const handleClientChange = useCallback(
      debounce((clientId: string) => {
        console.log('Client changed to:', clientId, 'Current taskId:', form.getValues('taskId'));
        form.setValue('taskId', '');
        onClientChange?.(clientId);
      }, 500),
      [onClientChange, form]
    );

    // Watch clientId and fetch tasks when it changes
    const selectedClientId = form.watch('clientId');
    useEffect(() => {
      if (
        selectedClientId &&
        selectedClientId !== prevClientIdRef.current &&
        !isEditing &&
        !isLoadingTasks
      ) {
        handleClientChange(selectedClientId);
        prevClientIdRef.current = selectedClientId; 
      }
    }, [selectedClientId, handleClientChange, isEditing, isLoadingTasks]);

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <SimpleDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select due date"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
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
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
               <div className='flex justify-between items-center mb-2'>
                 <FormLabel>Notes</FormLabel>
                 <span className="text-sm text-gray-500">
                {field.value?.length || 0} / 500
              </span>
               </div>
                <FormControl>
                  <Textarea placeholder="Any notes related to the payment..." {...field} maxLength={500} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="submit" style={{ display: 'none' }} />
        </form>
      </Form>
    );
  }
);

PaymentForm.displayName = 'PaymentForm';

export default PaymentForm;