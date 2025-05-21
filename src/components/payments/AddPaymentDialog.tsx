import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PaymentForm, { PaymentFormRef } from './PaymentForm';

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
  onPaymentSaved,
}) => {
  const isEditing = paymentId !== null;
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [defaultValues, setDefaultValues] = useState<{
    clientId: string;
    taskId: string;
    amount: number;
    status: string;
    dueDate: Date;
    invoiceNumber?: string;
    notes?: string;
  }>({
    clientId: '',
    taskId: '',
    amount: 0,
    status: 'due',
    dueDate: new Date(),
    invoiceNumber: '',
    notes: '',
  });
  const formRef = useRef<PaymentFormRef>(null);

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
      console.error('Fetch clients error:', err);
      toast.error('Failed to load clients');
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
      console.log('Fetching tasks for clientId:', clientId);
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('client_id', clientId)
        .order('title', { ascending: true });
      if (error) throw error;
      if (isMounted.current) {
        console.log('Tasks fetched:', data);
        setTasks(data ?? []);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
      toast.error('Failed to load tasks');
    } finally {
      if (isMounted.current) setIsLoadingTasks(false);
    }
    return () => { isMounted.current = false; };
  }, []);

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
        setDefaultValues({
          clientId: data.client_id,
          taskId: data.task_id,
          amount: data.amount,
          status: data.status,
          dueDate: new Date(data.due_date),
          invoiceNumber: data.invoice_number || '',
          notes: data.notes || '',
        });
        await fetchTasks(data.client_id);
      }
    } catch (err) {
      console.error('Fetch payment error:', err);
      toast.error('Failed to load payment');
    }
  }, [paymentId, fetchTasks]);

  useEffect(() => {
    if (open) {
      fetchClients();
      if (isEditing) fetchPayment();
    } else {
      setDefaultValues({
        clientId: '',
        taskId: '',
        amount: 0,
        status: 'due',
        dueDate: new Date(),
        invoiceNumber: '',
        notes: '',
      });
      setTasks([]);
    }
  }, [open, fetchClients, fetchPayment, isEditing]);

  const onSubmit = async (values: {
    clientId: string;
    taskId: string;
    amount: number;
    status: string;
    dueDate: Date;
    invoiceNumber?: string;
    notes?: string;
  }) => {
    console.log('PaymentForm submitted with values:', values);
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
    } catch (err: any) {
      console.error('Payment save error:', err);
      toast.error(err.message || 'Failed to save payment');
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the payment information below.' : 'Fill in the payment information to create a new record.'}
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          ref={formRef}
          onSubmit={onSubmit}
          defaultValues={defaultValues}
          clients={clients}
          tasks={tasks}
          isLoadingClients={isLoadingClients}
          isLoadingTasks={isLoadingTasks}
          isEditing={isEditing}
          onClientChange={fetchTasks}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log('Submitting PaymentForm');
              formRef.current?.submit();
            }}
            disabled={isLoadingClients || isLoadingTasks}
          >
            {isEditing ? 'Update Payment' : 'Add Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;