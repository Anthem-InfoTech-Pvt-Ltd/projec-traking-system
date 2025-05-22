import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PaymentList from '@/components/payments/PaymentList';
import AddPaymentDialog from '@/components/payments/AddPaymentDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Payment } from '@/types';
import { toast } from 'sonner';

const PaymentsPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const clientId = user?.app_metadata?.clientId;

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      let query = supabase.from('payments').select('*');
      if (!isAdmin && clientId) query = query.eq('client_id', clientId).in('status', ['invoiced', 'overdue', 'pending']);
      const { data, error } = await query;
      if (error) throw error;
      setPayments(data.map((p: any) => ({
        id: p.id,
        taskId: p.task_id,
        clientId: p.client_id,
        amount: p.amount,
        status: p.status,
        dueDate: new Date(p.due_date),
        invoiceNumber: p.invoice_number,
        invoicedAt: p.invoiced_at ? new Date(p.invoiced_at) : undefined,
        receivedAt: p.received_at ? new Date(p.received_at) : undefined,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
        notes: p.notes,
      })));
    } catch (error: any) {
      console.error('Fetch payments error:', error.message);
      toast.error('Failed to load payments');
    }
  }, [isAdmin, clientId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('payments_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
        const newPayment: Payment = {
          id: payload.new.id,
          taskId: payload.new.task_id,
          clientId: payload.new.client_id,
          amount: payload.new.amount,
          status: payload.new.status,
          dueDate: new Date(payload.new.due_date),
          invoiceNumber: payload.new.invoice_number,
          invoicedAt: payload.new.invoiced_at ? new Date(payload.new.invoiced_at) : undefined,
          receivedAt: payload.new.received_at ? new Date(payload.new.received_at) : undefined,
          createdAt: new Date(payload.new.created_at),
          updatedAt: new Date(payload.new.updated_at),
          notes: payload.new.notes,
        };
        if (isAdmin || newPayment.clientId === clientId) {
          setPayments((prev) => [newPayment, ...prev.filter((p) => p.id !== newPayment.id)]);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'payments' }, (payload) => {
        setPayments((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, clientId]);

  // Handle payment addition
  const handlePaymentSaved = useCallback((newPayment: Payment) => {
    if (isAdmin || newPayment.clientId === clientId) {
      setPayments((prev) => [newPayment, ...prev.filter((p) => p.id !== newPayment.id)]);
    }
    setOpen(false);
    setPaymentToEdit(null);
  }, [isAdmin, clientId]);

  // Handle payment deletion
  const handlePaymentDeleted = useCallback((paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        {isAdmin && (
          <Button onClick={() => setOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Payment
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment Management</CardTitle>
          <CardDescription>
            {isAdmin ? 'Track and manage all client payments.' : 'View and pay your invoices.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentList
            payments={payments}
            onEdit={(id) => { if (isAdmin) { setPaymentToEdit(id); setOpen(true); } }}
            onDelete={handlePaymentDeleted}
          />
        </CardContent>
      </Card>
      {isAdmin && (
        <AddPaymentDialog
          open={open}
          onOpenChange={setOpen}
          paymentId={paymentToEdit}
          onPaymentSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
};

export default PaymentsPage;