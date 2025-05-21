import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import CustomPagination from '@/components/CustomPagination';
import DeleteDialog from '../../components/DeleteDialog';
import { debounce } from 'lodash';
import { toast } from 'sonner';

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

interface TaskListProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => Promise<void> | void;
}

// Skeleton component for TaskList
const TaskListSkeleton: React.FC<{ rowsPerPage: number }> = ({ rowsPerPage }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Skeleton className="h-6 w-24" /></TableHead>
          <TableHead><Skeleton className="h-6 w-20" /></TableHead>
          <TableHead><Skeleton className="h-6 w-28" /></TableHead>
          <TableHead><Skeleton className="h-6 w-32" /></TableHead>
          <TableHead><Skeleton className="h-6 w-28" /></TableHead>
          <TableHead><Skeleton className="h-6 w-20" /></TableHead>
          <TableHead className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(rowsPerPage)].map((_, index) => (
          <TableRow key={index}>
            <TableCell><Skeleton className="h-6 w-48" /></TableCell>
            <TableCell><Skeleton className="h-6 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-36" /></TableCell>
            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-6 w-8 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const TaskList: React.FC<TaskListProps> = ({ tasks, onEdit, onDelete }) => {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Debounce setDeleteDialogOpen
  const debouncedSetDeleteDialogOpen = useCallback(
    debounce((open: boolean) => {
      console.log(`Debounced setDeleteDialogOpen: ${open}`);
      setDeleteDialogOpen(open);
    }, 300),
    []
  );

  // Fetch clients to display names in the table
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const { data, error } = await withTimeout(
          supabase.from('clients').select('id, name'),
          5000
        );
        if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
        setClients(data || []);
      } catch (error: any) {
        console.error('Error fetching clients:', error.message, error.stack);
        toast.error(error.message || 'Failed to fetch clients');
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Reset currentPage to 1 when tasks change
  useEffect(() => {
    setCurrentPage(1);
  }, [tasks]);

  const confirmDelete = (taskId: string) => {
    console.log('Opening delete dialog for task:', taskId);
    setTaskToDelete(taskId);
    debouncedSetDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!taskToDelete || !onDelete) {
      console.warn('handleDelete called with no taskToDelete or onDelete');
      debouncedSetDeleteDialogOpen(false);
      return;
    }
    setIsProcessing(true);
    try {
      console.log('Deleting task:', taskToDelete);
      await withTimeout(Promise.resolve(onDelete(taskToDelete)), 5000);
      toast.success('Task deleted successfully');
      debouncedSetDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error: any) {
      console.error('Error deleting task:', error.message, error.stack);
      toast.error(error.message || 'Failed to delete task');
      debouncedSetDeleteDialogOpen(false);
      setTaskToDelete(null);
    } finally {
      setIsProcessing(false);
      console.log('Delete operation completed for task');
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      requirements: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      quote: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      approved: 'bg-green-100 text-green-800 hover:bg-green-200',
      progress: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      submitted: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      feedback: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
      complete: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Paginate tasks
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedTasks = tasks.slice(startIndex, endIndex);

  if (isLoadingClients) {
    return (
      <div>
        <TaskListSkeleton rowsPerPage={rowsPerPage} />
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
            <TableHead>Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Estimated Hours</TableHead>
            <TableHead>Estimated Cost</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                No tasks match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            paginatedTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>{getClientName(task.clientId)}</TableCell>
                <TableCell>{task.dueDate ? format(task.dueDate, 'PPP') : '-'}</TableCell>
                <TableCell>{task.estimatedHours}</TableCell>
                <TableCell>${task.estimatedCost}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(onEdit || onDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isProcessing}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(task)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => confirmDelete(task.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <CustomPagination
        totalItems={tasks.length}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={debouncedSetDeleteDialogOpen}
        onDelete={handleDelete}
        entityName="task"
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default TaskList;