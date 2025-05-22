import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PaymentForm, { PaymentFormRef } from './PaymentForm';
import { Payment } from '@/types';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string | null;
  onPaymentSaved: (payment: Payment) => void;
}

const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({ open, onOpenChange, paymentId, onPaymentSaved }) => {
  const isEditing = paymentId !== null;
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [defaultValues, setDefaultValues] = useState<{
    clientId: string; taskId: string; amount: number; status: string; dueDate?: Date; invoiceNumber?: string; notes?: string;
  }>({
    clientId: '',
    taskId: '',
    amount: 0,
    status: 'due',
    dueDate: undefined,
    invoiceNumber: '',
    notes: '',
  });
  const formRef = useRef<PaymentFormRef>(null);

  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const { data, error } = await supabase.from('clients').select('id, name').order('name', { ascending: true });
      if (error) throw error;
      setClients(data ?? []);
    } catch (err) {
      console.error('Fetch clients error:', err);
      toast.error('Failed to load clients');
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  const fetchTasks = useCallback(async (clientId: string, retryCount = 0) => {
    if (!clientId) {
      console.log('No clientId provided for fetchTasks');
      return [];
    }
    setIsLoadingTasks(true);
    try {
      console.log('Fetching tasks for clientId:', clientId);
      const { data, error } = await supabase.from('tasks').select('id, title').eq('client_id', clientId).order('title', { ascending: true });
      if (error) throw error;
      console.log('Fetched tasks for client:', clientId, 'Tasks:', data);
      setTasks(data ?? []);
      return data ?? [];
    } catch (err: any) {
      console.error('Fetch tasks error:', err.message, 'ClientId:', clientId);
      if (retryCount < 1) {
        console.warn('Retrying fetchTasks... Attempt:', retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchTasks(clientId, retryCount + 1);
      }
      toast.error('Failed to load tasks');
      setTasks([]);
      return [];
    } finally {
      setIsLoadingTasks(false);
      console.log('isLoadingTasks set to false');
    }
  }, []);

  const fetchPayment = useCallback(async () => {
    if (!paymentId) return;
    try {
      const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).single();
      if (error) throw error;
      if (data) {
        const paymentValues = {
          clientId: data.client_id,
          taskId: data.task_id,
          amount: data.amount,
          status: data.status,
          dueDate: data.due_date ? new Date(data.due_date) : undefined,
          invoiceNumber: data.invoice_number || '',
          notes: data.notes || '',
        };
        let tasks = await fetchTasks(data.client_id);
        console.log('Fetched payment:', data, 'Tasks:', tasks);
        if (!tasks.some(t => t.id === data.task_id)) {
          console.warn('Task ID not found in tasks, refetching...');
          tasks = await fetchTasks(data.client_id);
        }
        setDefaultValues(paymentValues);
        formRef.current?.reset(paymentValues);
        console.log('Form reset with:', paymentValues);
      }
    } catch (err) {
      console.error('Fetch payment error:', err);
      toast.error('Failed to load payment');
    }
  }, [paymentId, fetchTasks]);

  useEffect(() => {
    if (open) {
      setTasks([]);
      setDefaultValues({
        clientId: '',
        taskId: '',
        amount: 0,
        status: 'due',
        dueDate: undefined,
        invoiceNumber: '',
        notes: '',
      });
      fetchClients();
      if (isEditing) {
        fetchPayment();
      } else {
        const initialValues = {
          clientId: '',
          taskId: '',
          amount: 0,
          status: 'due',
          dueDate: undefined,
          invoiceNumber: '',
          notes: '',
        };
        setDefaultValues(initialValues);
        formRef.current?.reset(initialValues);
        console.log('Add mode reset with:', initialValues);
      }
    } else {
      const initialValues = {
        clientId: '',
        taskId: '',
        amount: 0,
        status: 'due',
        dueDate: undefined,
        invoiceNumber: '',
        notes: '',
      };
      setDefaultValues(initialValues);
      setTasks([]);
      formRef.current?.reset(initialValues);
    }
  }, [open, fetchClients, fetchPayment, isEditing]);

  const onSubmit = async (values: {
    clientId: string; taskId: string; amount: number; status: string; dueDate?: Date; invoiceNumber?: string; notes?: string;
  }) => {
    try {
      const payload = {
        client_id: values.clientId,
        task_id: values.taskId,
        amount: values.amount,
        status: values.status,
        due_date: values.dueDate ? values.dueDate.toISOString() : null,
        invoice_number: values.invoiceNumber || null,
        notes: values.notes || null,
        updated_at: new Date().toISOString(),
      };

      let newPayment: Payment;
      if (isEditing) {
        const { data, error } = await supabase.from('payments').update(payload).eq('id', paymentId).select().single();
        if (error) throw error;
        newPayment = {
          id: paymentId!,
          taskId: data.task_id,
          clientId: data.client_id,
          amount: data.amount,
          status: data.status,
          dueDate: data.due_date ? new Date(data.due_date) : undefined,
          invoiceNumber: data.invoice_number,
          invoicedAt: data.invoiced_at ? new Date(data.invoiced_at) : undefined,
          receivedAt: data.received_at ? new Date(data.received_at) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          notes: data.notes,
        };
      } else {
        payload['created_at'] = new Date().toISOString();
        const { data, error } = await supabase.from('payments').insert([payload]).select().single();
        if (error) throw error;
        newPayment = {
          id: data.id,
          taskId: data.task_id,
          clientId: data.client_id,
          amount: data.amount,
          status: data.status,
          dueDate: data.due_date ? new Date(data.due_date) : undefined,
          invoiceNumber: data.invoice_number,
          invoicedAt: data.invoiced_at ? new Date(data.invoiced_at) : undefined,
          receivedAt: data.received_at ? new Date(data.received_at) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          notes: data.notes,
        };
      }

      toast.success(isEditing ? 'Payment updated' : 'Payment added');
      onPaymentSaved(newPayment);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Payment save error:', err.message);
      toast.error('Failed to save payment');
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update payment details.' : 'Create a new payment record.'}</DialogDescription>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => formRef.current?.submit()} disabled={isLoadingClients || isLoadingTasks}>
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;