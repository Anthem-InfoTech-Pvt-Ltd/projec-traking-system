import React, { useState, useEffect, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, MoreVertical, Trash2, Send, UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {supabase} from '../../integrations/supabase/client';
import supabaseAdmin from '../../integrations/supabase/supabaseAdmin';
import { Client, ClientStatus } from '@/types';
import CustomPagination from '@/components/CustomPagination';
import DeleteDialog from '../../components/DeleteDialog';
import { debounce } from 'lodash';

// Timeout utility
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
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
};

interface ClientListProps {
  onEdit: (clientId: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ onEdit }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [clientToCreateAccount, setClientToCreateAccount] = useState<Client | null>(null);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showPassword, setShowPassword] = useState(false);

  // Debounce setDeleteDialogOpen to prevent rapid state changes
  const debouncedSetDeleteDialogOpen = useCallback(
    debounce((open: boolean) => {
      console.log(`Debounced setDeleteDialogOpen: ${open}`);
      setDeleteDialogOpen(open);
    }, 300),
    []
  );

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const { data, error } = await withTimeout(
          supabase.from('clients').select('*').order('created_at', { ascending: false }),
          5000
        );
        if (error) throw new Error(`Failed to fetch clients: ${error.message}`);

        const formatted = data.map((client: any) => ({
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          status: client.status as ClientStatus,
          hasAccount: client.has_account,
          notes: client.notes,
          createdAt: new Date(client.created_at),
          updatedAt: new Date(client.updated_at),
        }));

        setClients(formatted);
        console.log('Clients from Supabase:', formatted);
      } catch (err: any) {
        console.error('Error fetching clients:', err.message, err.stack);
        setError(err.message || 'Failed to load clients');
        toast.error(err.message || 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const getStatusColor = (status: ClientStatus) => {
    const colorMap: Record<ClientStatus, string> = {
      idle: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
      gone: 'bg-red-100 text-red-800 hover:bg-red-200',
      active: 'bg-green-100 text-green-800 hover:bg-green-200',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  };

  const getRowColor = (status: ClientStatus) => {
    const colorMap: Record<ClientStatus, string> = {
      idle: 'border-l-4 border-l-amber-500',
      gone: 'border-l-4 border-l-red-500',
      active: 'border-l-4 border-l-green-500',
    };
    return colorMap[status] || '';
  };

  const confirmDelete = (id: string) => {
    console.log('Opening delete dialog for client:', id);
    setClientToDelete(id);
    debouncedSetDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) {
      console.warn('handleDelete called with no clientToDelete');
      debouncedSetDeleteDialogOpen(false);
      return;
    }
    setIsProcessing(true);
    try {
      console.log('Deleting client:', clientToDelete);
      const { error } = await withTimeout(
        supabase.from('clients').delete().eq('id', clientToDelete),
        5000
      );
      if (error) throw new Error(`Failed to delete client: ${error.message}`);
      setClients(clients.filter(c => c.id !== clientToDelete));
      toast.success('Client deleted successfully');
      debouncedSetDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (err: any) {
      console.error('Error deleting client:', err.message, err.stack);
      toast.error(err.message || 'Failed to delete client');
      debouncedSetDeleteDialogOpen(false);
      setClientToDelete(null);
    } finally {
      setIsProcessing(false);
      console.log('Delete operation completed for client');
    }
  };

  const generateRandomPassword = (length = 10) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  useEffect(() => {
    if (createAccountDialogOpen) {
      setPassword(generateRandomPassword());
    }
  }, [createAccountDialogOpen]);

  const openCreateAccountDialog = (client: Client) => {
    setClientToCreateAccount(client);
    setCreateAccountDialogOpen(true);
  };

  const handleCreateAccount = async () => {
  if (!clientToCreateAccount || !password) return;

  setIsProcessing(true);
  try {
    const response = await fetch('http://localhost:5000/api/client/resend-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: clientToCreateAccount.email,
        password,
        name: clientToCreateAccount.name,
        client_id: clientToCreateAccount.id,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create account');

    toast.success('Account created and credentials sent');
    setClients(prev =>
      prev.map(c =>
        c.id === clientToCreateAccount.id ? { ...c, hasAccount: true } : c
      )
    );
    setCreateAccountDialogOpen(false);
    setPassword('');
  } catch (err: any) {
    console.error('Account creation error:', err.message);
    toast.error(err.message || 'Failed to create account');
  } finally {
    setIsProcessing(false);
  }
};
const handleResendCredentials = async (client) => {
  if (!client.email) {
    toast.error('Email is missing');
    return;
  }

  setIsProcessing(true);
  try {
    const response = await fetch('http://localhost:5000/api/client/resend-credentials-only', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: client.email,
        name: client.name,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to resend credentials');

    toast.success('Credentials resent successfully');
  } catch (err) {
    console.error('Error resending credentials:', err.message);
    toast.error(err.message || 'Failed to resend credentials');
  } finally {
    setIsProcessing(false);
  }
};

  // Paginate clients
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedClients = clients.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-6 w-24" /></TableHead>
              <TableHead><Skeleton className="h-6 w-32" /></TableHead>
              <TableHead><Skeleton className="h-6 w-24" /></TableHead>
              <TableHead><Skeleton className="h-6 w-20" /></TableHead>
              <TableHead><Skeleton className="h-6 w-24" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(rowsPerPage)].map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {error ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-red-600">
                <p>{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
              </TableCell>
            </TableRow>
          ) : paginatedClients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                No clients found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedClients.map((client) => (
              <TableRow key={client.id} className={getRowColor(client.status)}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`rounded-full px-2.5 text-xs font-semibold ${getStatusColor(client.status)}`}
                        disabled={isProcessing}
                      >
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Button>
                    </DropdownMenuTrigger>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={client.hasAccount ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                  >
                    {client.hasAccount ? 'Has Account' : 'No Account'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isProcessing}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(client.id)} disabled={isProcessing}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {client.hasAccount ? (
  <DropdownMenuItem
    onClick={() => handleResendCredentials(client)}
    disabled={isProcessing}
  >
    <Send className="mr-2 h-4 w-4" /> Resend Credentials
  </DropdownMenuItem>
) : (
  <DropdownMenuItem
    onClick={() => openCreateAccountDialog(client)}
    disabled={isProcessing}
  >
    <UserPlus className="mr-2 h-4 w-4" /> Create Account
  </DropdownMenuItem>
)}

                      <DropdownMenuItem
                        onClick={() => confirmDelete(client.id)}
                        className="text-destructive"
                        disabled={isProcessing}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <CustomPagination
        totalItems={clients.length}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={debouncedSetDeleteDialogOpen}
        onDelete={handleDelete}
        entityName="client"
        isProcessing={isProcessing}
      />
      {createAccountDialogOpen && (
        <Dialog open={createAccountDialogOpen} onOpenChange={setCreateAccountDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Client Account</DialogTitle>
              <DialogDescription>
                Create an account for <strong>{clientToCreateAccount?.name}</strong>. Credentials will be emailed to <strong>{clientToCreateAccount?.email}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="username">Email</label>
                <Input id="username" value={clientToCreateAccount?.email || ''} disabled />
              </div>
              <div className="relative">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Temporary password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isProcessing}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-[38px] text-gray-500 hover:text-gray-800"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateAccountDialogOpen(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleCreateAccount} disabled={!password || isProcessing}>
                Create & Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClientList;