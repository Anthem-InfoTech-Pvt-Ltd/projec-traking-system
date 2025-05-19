import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '../../integrations/supabase/client';
import { Payment, PaymentStatus } from '@/types';
import { Edit, MoreVertical, Trash2, FileText, CreditCard } from 'lucide-react';
import CustomPagination from '@/components/CustomPagination';
import DeleteDialog from '../../components/DeleteDialog';
import { debounce } from 'lodash';

// Timeout utility with cleanup
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onCancel?: () => void
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.warn(`Operation timed out after ${timeoutMs}ms`);
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } catch (error: any) {
    console.error(`withTimeout error: ${error.message}`, {
      stack: error.stack,
      code: error.code,
    });
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (onCancel) onCancel();
  }
};

interface PaymentListProps {
  onEdit: (paymentId: string) => void;
}

// Skeleton component for PaymentList
const SkeletonRow: React.FC<{ rowsPerPage: number }> = ({ rowsPerPage }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead><div className="h-6 bg-gray-200 rounded-md animate-pulse w-24" /></TableHead>
        <TableHead><div className="h-6 bg-gray-200 rounded-md animate-pulse w-24" /></TableHead>
        <TableHead><div className="h-6 bg-gray-200 rounded-md animate-pulse w-20" /></TableHead>
        <TableHead><div className="h-6 bg-gray-200 rounded-md animate-pulse w-28" /></TableHead>
        <TableHead><div className="h-6 bg-gray-200 rounded-md animate-pulse w-20" /></TableHead>
        <TableHead><div className="h-6 bg-gray-200 rounded-md animate-pulse w-20" /></TableHead>
        <TableHead className="text-right"><div className="h-6 bg-gray-200 rounded-md animate-pulse w-16 ml-auto" /></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(rowsPerPage)].map((_, index) => (
        <TableRow key={index}>
          <TableCell><div className="h-4 bg-gray-200 rounded-md animate-pulse w-3/4" /></TableCell>
          <TableCell><div className="h-4 bg-gray-200 rounded-md animate-pulse w-1/2" /></TableCell>
          <TableCell><div className="h-4 bg-gray-200 rounded-md animate-pulse w-1/4" /></TableCell>
          <TableCell><div className="h-4 bg-gray-200 rounded-md animate-pulse w-1/3" /></TableCell>
          <TableCell><div className="h-4 bg-gray-200 rounded-md animate-pulse w-1/4" /></TableCell>
          <TableCell><div className="h-4 bg-gray-200 rounded-md animate-pulse w-1/4" /></TableCell>
          <TableCell className="text-right"><div className="h-4 bg-gray-200 rounded-md animate-pulse w-8 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const PaymentList: React.FC<PaymentListProps> = ({ onEdit }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const clientId = user?.app_metadata?.clientId;

  // Debounce setDeleteDialogOpen with cleanup
  const debouncedSetDeleteDialogOpen = useMemo(
    () =>
      debounce((open: boolean) => {
        setDeleteDialogOpen(open);
      }, 300),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetDeleteDialogOpen.cancel();
    };
  }, [debouncedSetDeleteDialogOpen]);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Validate Supabase client
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Fetch payments
      let paymentQuery = supabase.from('payments').select('*');
      if (!isAdmin && clientId) {
        paymentQuery = paymentQuery.eq('client_id', clientId).in('status', ['invoiced', 'overdue', 'pending']);
      }
      const { data: paymentData, error: paymentError } = await withTimeout(paymentQuery, 5000);
      if (paymentError) throw new Error(`Failed to fetch payments: ${paymentError.message}`);
      if (!paymentData) throw new Error('No payment data returned');

      const formattedPayments: Payment[] = paymentData.map((payment: any) => ({
        id: payment.id,
        taskId: payment.task_id,
        clientId: payment.client_id,
        amount: payment.amount,
        status: payment.status,
        dueDate: new Date(payment.due_date),
        invoiceNumber: payment.invoice_number,
        invoicedAt: payment.invoiced_at ? new Date(payment.invoiced_at) : undefined,
        receivedAt: payment.received_at ? new Date(payment.received_at) : undefined,
        createdAt: new Date(payment.created_at),
        updatedAt: new Date(payment.updated_at),
        notes: payment.notes,
      }));
      setPayments(formattedPayments);

      // Fetch clients
      const { data: clientData, error: clientError } = await withTimeout(
        supabase.from('clients').select('id, name'),
        5000
      );
      if (clientError) throw new Error(`Failed to fetch clients: ${clientError.message}`);
      setClients(clientData || []);

      // Fetch tasks
      const { data: taskData, error: taskError } = await withTimeout(
        supabase.from('tasks').select('id, title'),
        5000
      );
      if (taskError) throw new Error(`Failed to fetch tasks: ${taskError.message}`);
      setTasks(taskData || []);
    } catch (error: any) {
      console.error('Error loading data:', error.message, { stack: error.stack });
      toast.error(`Failed to load payment data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset currentPage when payments change
  useEffect(() => {
    setCurrentPage(1);
  }, [payments]);

  const getClientName = useCallback((clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
  }, [clients]);

  const getTaskTitle = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : 'Unknown';
  }, [tasks]);

  const getStatusColor = useCallback((status: PaymentStatus) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'due': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'invoiced': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'pending': return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'overdue': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'canceled': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  }, []);

  const getRowColor = useCallback((status: PaymentStatus) => {
    switch (status) {
      case 'received': return 'border-l-4 border-l-green-500';
      case 'due': return 'border-l-4 border-l-blue-500';
      case 'invoiced': return 'border-l-4 border-l-purple-500';
      case 'pending': return 'border-l-4 border-l-amber-500';
      case 'overdue': return 'border-l-4 border-l-red-500';
      case 'canceled': return 'border-l-4 border-l-gray-500';
      default: return '';
    }
  }, []);

  const confirmDelete = useCallback((paymentId: string) => {
    setPaymentToDelete(paymentId);
    debouncedSetDeleteDialogOpen(true);
  }, [debouncedSetDeleteDialogOpen]);

  const handleDelete = useCallback(async () => {
    if (!paymentToDelete) {
      debouncedSetDeleteDialogOpen(false);
      return;
    }
    setIsProcessing(true);
    try {
      const { error } = await withTimeout(
        supabase.from('payments').delete().eq('id', paymentToDelete),
        5000
      );
      if (error) throw new Error(`Failed to delete payment: ${error.message}`);
      setPayments(prev => prev.filter(payment => payment.id !== paymentToDelete));
      toast.success('Payment deleted successfully');
    } catch (error: any) {
      console.error('Error deleting payment:', error.message, { stack: error.stack });
      toast.error(error.message || 'Failed to delete payment');
    } finally {
      setIsProcessing(false);
      setPaymentToDelete(null);
      debouncedSetDeleteDialogOpen(false);
    }
  }, [paymentToDelete, debouncedSetDeleteDialogOpen]);

  const generateInvoice = useCallback(async (paymentId: string) => {
    setIsProcessing(true);
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const updateData = {
        invoice_number: invoiceNumber,
        status: 'invoiced' as PaymentStatus,
        invoiced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await withTimeout(
        supabase.from('payments').update(updateData).eq('id', paymentId),
        5000
      );
      if (error) throw new Error(`Failed to generate invoice: ${error.message}`);
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, ...updateData, updatedAt: new Date() } : p));
      toast.success('Invoice generated and ready to send');
    } catch (error: any) {
      console.error('Error generating invoice:', error.message, { stack: error.stack });
      toast.error(`Failed to generate invoice: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [payments]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }, []);

  const initiatePayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  }, []);

  const handlePaymentCompleted = useCallback(async (payment: Payment) => {
    setIsProcessing(true);
    try {
      const updateData = {
        status: 'received' as PaymentStatus,
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await withTimeout(
        supabase.from('payments').update(updateData).eq('id', payment.id),
        5000
      );
      if (error) throw new Error(`Failed to process payment: ${error.message}`);
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, ...updateData, updatedAt: new Date() } : p));
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
      toast.success('Payment completed successfully!');
    } catch (error: any) {
      console.error('Error processing payment:', error.message, { stack: error.stack });
      toast.error(`Payment processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handlePayNow = useCallback((payment: Payment) => {
    setIsProcessing(true);
    try {
      window.open(`https://www.paypal.com/checkoutnow?token=demo-${payment.id}`, '_blank');
      toast.success('Redirecting to PayPal for payment processing');
      setTimeout(() => {
        handlePaymentCompleted(payment);
      }, 3000);
    } catch (error: any) {
      console.error('Error initiating PayPal payment:', error.message, { stack: error.stack });
      toast.error(`Failed to initiate payment: ${error.message}`);
      setIsProcessing(false);
    }
  }, [handlePaymentCompleted]);

  const handleEdit = useCallback((paymentId: string) => {
    onEdit(paymentId);
  }, [onEdit]);

  // Memoize paginated payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return payments.slice(startIndex, endIndex);
  }, [payments, currentPage, rowsPerPage]);

  if (isLoading) {
    return (
      <div>
        <SkeletonRow rowsPerPage={rowsPerPage} />
        <CustomPagination
          totalItems={0}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isAdmin ? 'Client' : 'Task'}</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedPayments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                No payments found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedPayments.map((payment) => (
              <TableRow key={payment.id} className={getRowColor(payment.status)}>
                <TableCell className="font-medium">
                  {isAdmin ? getClientName(payment.clientId) : `Task #${payment.taskId}`}
                </TableCell>
                <TableCell>{getTaskTitle(payment.taskId)}</TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell>{format(payment.dueDate, 'MMM d, yyyy')}</TableCell>
                <TableCell>{payment.invoiceNumber || '-'}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`rounded-full px-2.5 text-xs font-semibold ${getStatusColor(payment.status)}`}
                          disabled={isProcessing}
                        >
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(payment.id)} disabled={isProcessing}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateInvoice(payment.id)} disabled={isProcessing}>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => confirmDelete(payment.id)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge className={`${getStatusColor(payment.status)}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isProcessing}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(payment.id)} disabled={isProcessing}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateInvoice(payment.id)} disabled={isProcessing}>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => confirmDelete(payment.id)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    ['invoiced', 'pending', 'overdue'].includes(payment.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => initiatePayment(payment)}
                        className="flex items-center gap-1"
                        disabled={isProcessing}
                      >
                        <CreditCard className="h-3 w-3" />
                        Pay Now
                      </Button>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <CustomPagination
        totalItems={payments.length}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <DeleteDialog
        key={`delete-payment-${paymentToDelete || 'none'}`}
        open={deleteDialogOpen}
        onOpenChange={debouncedSetDeleteDialogOpen}
        onDelete={handleDelete}
        entityName="payment"
        isProcessing={isProcessing}
      />
      {paymentDialogOpen && selectedPayment && (
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Confirmation</DialogTitle>
              <DialogDescription>
                You are about to make a payment to Anthem InfoTech Pvt Ltd.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Invoice Number:</p>
                  <p>{selectedPayment.invoiceNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount:</p>
                  <p className="font-semibold">{formatCurrency(selectedPayment.amount)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Recipient:</p>
                <p>Anthem InfoTech Pvt Ltd</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Method:</p>
                <p>PayPal</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={() => handlePayNow(selectedPayment)}
                disabled={isProcessing}
              >
                Proceed to PayPal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PaymentList;