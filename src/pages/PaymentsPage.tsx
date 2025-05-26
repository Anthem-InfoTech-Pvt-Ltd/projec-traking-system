import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PaymentList from '@/components/payments/PaymentList';
import AddPaymentDialog from '@/components/payments/AddPaymentDialog';
import PaymentFilterDialog from '@/components/payments/PaymentFilterDialog';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Payment } from '@/types';
import { toast } from 'sonner';

interface PaymentFilterForm {
  statuses: string[];
  clientId: string | null;
  dueDateStart: Date | null;
  dueDateEnd: Date | null;
}

const PaymentsPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<PaymentFilterForm>({
    statuses: [],
    clientId: null,
    dueDateStart: null,
    dueDateEnd: null,
  });
  const { user } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin' || user?.role === 'admin'; // Support both metadata structures
  let clientId = user?.app_metadata?.clientId;

  // Fallback to fetch clientId from users table if needed
  const fetchClientId = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data?.client_id || null;
    } catch (error: any) {
      console.error('Error fetching client_id from users table:', error.message);
      return null;
    }
  }, []);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      let resolvedClientId = clientId;
      if (!isAdmin && !resolvedClientId && user?.id) {
        resolvedClientId = await fetchClientId(user.id);
        console.log('Fetched clientId from users table:', resolvedClientId);
      }

      if (!isAdmin && !resolvedClientId) {
        console.error('No clientId found for non-admin user:', user);
        toast.error('Unable to load payments: User configuration error');
        setPayments([]);
        return;
      }

      let query = supabase.from('payments').select('*');
      if (!isAdmin && resolvedClientId) {
        query = query.eq('client_id', resolvedClientId);
      } else if (isAdmin && filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      } else if (!isAdmin && resolvedClientId) {
        query = query.in('status', ['due', 'invoiced', 'pending', 'received', 'overdue', 'canceled']);
      }

      if (filters.dueDateStart) {
        query = query.gte('due_date', filters.dueDateStart.toISOString());
      }
      if (filters.dueDateEnd) {
        query = query.lte('due_date', filters.dueDateEnd.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const formattedPayments = data.map((p: any) => ({
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
      }));

      console.log('Fetched payments:', formattedPayments);
      setPayments(formattedPayments);
    } catch (error: any) {
      console.error('Fetch payments error:', error.message);
      toast.error('Failed to load payments');
      setPayments([]);
    }
  }, [isAdmin, clientId, user, filters, fetchClientId]);

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
        const matchesFilters =
          (!filters.statuses.length || filters.statuses.includes(newPayment.status)) &&
          (!filters.clientId || newPayment.clientId === filters.clientId) &&
          (!filters.dueDateStart || (newPayment.dueDate >= filters.dueDateStart)) &&
          (!filters.dueDateEnd || (newPayment.dueDate <= filters.dueDateEnd)) &&
          (isAdmin ? true : newPayment.clientId === clientId);
        if (matchesFilters) {
          console.log('Adding real-time payment:', newPayment);
          setPayments((prev) => [newPayment, ...prev.filter((p) => p.id !== newPayment.id)]);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'payments' }, (payload) => {
        console.log('Removing real-time payment:', payload.old.id);
        setPayments((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to payments table changes');
        } else if (err) {
          console.error('Subscription error:', err);
          toast.error('Failed to subscribe to payment updates');
        }
      });
    return () => {
      console.log('Unsubscribing from payments table changes');
      supabase.removeChannel(channel);
    };
  }, [isAdmin, clientId, filters]);

  // Handle payment addition
  const handlePaymentSaved = useCallback((newPayment: Payment) => {
    if (isAdmin || (clientId && newPayment.clientId === clientId && ['invoiced', 'overdue', 'pending'].includes(newPayment.status))) {
      console.log('Saving payment:', newPayment);
      setPayments((prev) => [newPayment, ...prev.filter((p) => p.id !== newPayment.id)]);
    }
    setOpen(false);
    setPaymentToEdit(null);
  }, [isAdmin, clientId]);

  // Handle payment deletion
  const handlePaymentDeleted = useCallback((paymentId: string) => {
    console.log('Deleting payment:', paymentId);
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  }, []);

  // Handle filter application
  const handleApplyFilters = useCallback((newFilters: PaymentFilterForm) => {
    setFilters(newFilters);
  }, []);

  // Log user for debugging
  useEffect(() => {
    console.log('User object:', user);
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsFilterDialogOpen(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          {isAdmin && (
            <Button onClick={() => setOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add Payment
            </Button>
          )}
        </div>
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
      <PaymentFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApply={handleApplyFilters}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default PaymentsPage;