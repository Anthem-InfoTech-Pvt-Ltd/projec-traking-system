import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { Payment, PaymentStatus } from "@/types";
import {
  Edit,
  MoreVertical,
  Trash2,
  FileText,
  CreditCard,
  CircleCheckBig,
} from "lucide-react";
import CustomPagination from "../../components/CustomPagination";
import DeleteDialog from "../../components/DeleteDialog";
import { debounce } from "lodash";
import MarkPaidDialog from "./MarkPaidDialog";

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => {
      console.warn(`Operation timed out after ${timeoutMs}ms`);
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch (error: any) {
    console.error(`withTimeout error: ${error.message}`, error.stack);
    throw error;
  }
}

interface PaymentListProps {
  payments: Payment[];
  onEdit: (paymentId: string) => void;
  onDelete: (paymentId: string) => void;
  fetchPayments: () => Promise<void>;
}

const SkeletonRow: React.FC<{ rowsPerPage: number }> = ({ rowsPerPage }) => (
  <Table>
    <TableHeader>
      <TableRow>
        {[
          "Client/Task",
          "Task",
          "Amount",
          "Due Date",
          "Invoice #",
          "Status",
          "",
        ].map((h, i) => (
          <TableHead key={i}>
            <div className="h-6 bg-gray-200 rounded w-20" />
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(rowsPerPage)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(7)].map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const PaymentList: React.FC<PaymentListProps> = ({
  payments,
  onEdit,
  onDelete,
}) => {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null
  );
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const clientId = user?.clientId;

  const debouncedSetDeleteDialogOpen = useMemo(
    () => debounce((open: boolean) => setDeleteDialogOpen(open), 300),
    []
  );

  const openMarkPaidDialog = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setMarkPaidDialogOpen(true);
  };

  const closeMarkPaidDialog = () => {
    setSelectedPaymentId(null);
    setMarkPaidDialogOpen(false);
  };

  const onMarkedPaid = async () => {
    await fetchPayments();
    toast.success("Payment updated!");
  };

  useEffect(
    () => () => debouncedSetDeleteDialogOpen.cancel(),
    [debouncedSetDeleteDialogOpen]
  );
  // console.log("client: ", clientId);
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: clientData, error: clientError },
          { data: taskData, error: taskError },
        ] = await Promise.all([
          withTimeout(supabase.from("clients").select("id, name").eq("is_deleted", false), 5000),
          withTimeout(supabase.from("tasks").select("id, title").eq("is_deleted", false), 5000),
        ]);
        if (clientError) throw new Error(`Clients: ${clientError.message}`);
        if (taskError) throw new Error(`Tasks: ${taskError.message}`);
        setClients(clientData || []);
        setTasks(taskData || []);
      } catch (error: any) {
        console.error("Load data error:", error.message);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => setCurrentPage(1), [payments]);

  const getClientName = useCallback(
    (clientId: string) => {
      const name = clients.find((t) => t.id === clientId)?.name;
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Unknown";
    },
    [clients]
  );
  const getTaskTitle = useCallback(
    (taskId: string) => {
      const title = tasks.find((t) => t.id === taskId)?.title;
      return title ? title.charAt(0).toUpperCase() + title.slice(1) : "Unknown";
    },
    [tasks]
  );

  const filteredPayments = useMemo(() => {
    if (isAdmin || !clientId) {
      return payments;
    }
    return payments.filter((payment) => payment.clientId === clientId); // Removed status filter
  }, [payments, isAdmin, clientId]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, currentPage, rowsPerPage]);

  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount),
    []
  );

  const getStatusColor = useCallback(
    (status: PaymentStatus) =>
      ({
        received: "bg-green-100 text-green-800 hover:bg-green-200",
        due: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        invoiced: "bg-purple-100 text-purple-800 hover:bg-purple-200",
        pending: "bg-amber-100 text-amber-800 hover:bg-amber-200",
        overdue: "bg-red-100 text-red-800 hover:bg-red-200",
        canceled: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      }[status] || "bg-gray-100 text-gray-800 hover:bg-gray-200"),
    []
  );

  const getRowColor = useCallback(
    (status: PaymentStatus) =>
      ({
        received: "border-l-4 border-l-green-500",
        due: "border-l-4 border-l-blue-500",
        invoiced: "border-l-4 border-l-purple-500",
        pending: "border-l-4 border-l-amber-500",
        overdue: "border-l-4 border-l-red-500",
        canceled: "border-l-4 border-l-gray-500",
      }[status] || ""),
    []
  );

  const confirmDelete = useCallback(
    (paymentId: string) => {
      setPaymentToDelete(paymentId);
      debouncedSetDeleteDialogOpen(true);
    },
    [debouncedSetDeleteDialogOpen]
  );

  const handleDelete = useCallback(async () => {
    if (!paymentToDelete) {
      debouncedSetDeleteDialogOpen(false);
      return;
    }
    setIsProcessing(true);
    try {
      // Optimistic update
      onDelete(paymentToDelete);
      const { error } = await supabase.from("payments").update({is_deleted: 'TRUE'}).eq("id", paymentToDelete);
      if (error) throw error;
      toast.success("Payment deleted");
    } catch (error: any) {
      console.error("Delete error:", error.message);
      toast.error("Failed to delete payment");
    } finally {
      setIsProcessing(false);
      setPaymentToDelete(null);
      debouncedSetDeleteDialogOpen(false);
    }
  }, [paymentToDelete, debouncedSetDeleteDialogOpen, onDelete]);

  const handleCheckout = (payment: Payment) => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payments/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ name: "Anthem InfoTech Pvt Ltd", price: payment.amount, quantity: 1 }],
        paymentId: payment.id,
      }),
    })
      .then((res) => {
        if (res.ok) return res.json();
        return res.json().then((json) => Promise.reject(json));
      })
      .then(({ url }) => {
        window.location = url;
      })
      .catch((e) => {
        console.error(e.error);
         toast.error("Checkout failed");
      });
  };

  if (isLoading) return <SkeletonRow rowsPerPage={rowsPerPage} />;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isAdmin ? "Client" : null}</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin ? null : <TableHead>Payment option</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedPayments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-10 text-muted-foreground"
              >
                No payments found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedPayments.map((payment) => (
              <TableRow
                key={payment.id}
                className={getRowColor(payment.status)}
              >
                <TableCell className="font-medium">
                  {isAdmin ? getClientName(payment.clientId) : null}
                </TableCell>
                <TableCell>{getTaskTitle(payment.taskId)}</TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell>{format(payment.dueDate, "MMM d, yyyy")}</TableCell>
                <TableCell>{payment.invoiceNumber || "-"}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status.charAt(0).toUpperCase() +
                      payment.status.slice(1)}
                  </Badge>
                </TableCell>
                {isAdmin ? null : (
                  <TableCell>
                    {["invoiced", "pending", "overdue"].includes(
                      payment.status
                    ) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={()=>handleCheckout(payment)}
                        disabled={isProcessing}
                      >
                        <CreditCard className="h-3 w-3" /> Pay Now
                      </Button>
                    )}
                  </TableCell>
                )}

                <TableCell className="text-right">
                  {isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isProcessing}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEdit(payment.id)}
                          disabled={isProcessing}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => confirmDelete(payment.id)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    ["invoiced", "pending", "overdue"].includes(
                      payment.status
                    ) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isProcessing}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-green-500"
                            disabled={isProcessing}
                            onClick={() => openMarkPaidDialog(payment.id)}
                          >
                            <CircleCheckBig className="mr-2 h-4 w-4" /> Mark as
                            paid
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <CustomPagination
        totalItems={filteredPayments.length}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <DeleteDialog
        key={`delete-payment-${paymentToDelete || "none"}`}
        open={deleteDialogOpen}
        onOpenChange={debouncedSetDeleteDialogOpen}
        onDelete={handleDelete}
        entityName="payment"
        isProcessing={isProcessing}
      />
      <MarkPaidDialog
        open={markPaidDialogOpen}
        onClose={closeMarkPaidDialog}
        paymentId={selectedPaymentId}
        onSuccess={onMarkedPaid}
      />
    </div>
  );
};

export default PaymentList;