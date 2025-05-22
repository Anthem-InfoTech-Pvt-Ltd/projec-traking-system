import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import TaskList from '@/components/tasks/TaskList';
import AddTaskDialog from '@/components/tasks/AddTaskDialog';
import TaskFilterDialog from '@/components/tasks/TaskFilterDialog';
import { Task, TaskStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TaskFilter {
  statuses: TaskStatus[];
  clientId: string | null;
  dueDateStart: Date | null;
  dueDateEnd: Date | null;
}

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilter>({
    statuses: [],
    clientId: null,
    dueDateStart: null,
    dueDateEnd: null,
  });
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('tasks').select('*');
      
      if (user?.role !== 'admin') {
        query = query.eq('client_id', user.clientId);
      } else if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }
      
      if (filters.dueDateStart) {
        query = query.gte('due_date', filters.dueDateStart.toISOString());
      }
      if (filters.dueDateEnd) {
        query = query.lte('due_date', filters.dueDateEnd.toISOString());
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error('Failed to fetch tasks: ' + error.message);
      }
      
      const formattedTasks: Task[] = data.map((task: any) => ({
        id: task.id,
        title: task.title,
        clientId: task.client_id,
        description: task.description,
        status: task.status,
        estimatedHours: task.estimated_hours,
        estimatedCost: task.estimated_cost,
        actualHours: task.actual_hours,
        actualCost: task.actual_cost,
        project: task.project_link,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at),
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
      }));
      
      setTasks(formattedTasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const subscription = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Real-time task event:', payload);
          if (payload.eventType === 'INSERT') {
            const newTask: Task = {
              id: payload.new.id,
              title: payload.new.title,
              clientId: payload.new.client_id,
              description: payload.new.description,
              status: payload.new.status,
              estimatedHours: payload.new.estimated_hours,
              estimatedCost: payload.new.estimated_cost,
              actualHours: payload.new.actual_hours,
              actualCost: payload.new.actual_cost,
              project: payload.new.project_link,
              createdAt: new Date(payload.new.created_at),
              updatedAt: new Date(payload.new.updated_at),
              dueDate: payload.new.due_date ? new Date(payload.new.due_date) : undefined,
              completedAt: payload.new.completed_at ? new Date(payload.new.completed_at) : undefined,
            };
            const matchesFilters =
              (!filters.statuses.length || filters.statuses.includes(newTask.status)) &&
              (!filters.clientId || newTask.clientId === filters.clientId) &&
              (!filters.dueDateStart || (newTask.dueDate && newTask.dueDate >= filters.dueDateStart)) &&
              (!filters.dueDateEnd || (newTask.dueDate && newTask.dueDate <= filters.dueDateEnd)) &&
              (user?.role !== 'admin' ? newTask.clientId === user?.app_metadata.clientId : true);
            if (matchesFilters) {
              setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask: Task = {
              id: payload.new.id,
              title: payload.new.title,
              clientId: payload.new.client_id,
              description: payload.new.description,
              status: payload.new.status,
              estimatedHours: payload.new.estimated_hours,
              estimatedCost: payload.new.estimated_cost,
              actualHours: payload.new.actual_hours,
              actualCost: payload.new.actual_cost,
              project: payload.new.project_link,
              createdAt: new Date(payload.new.created_at),
              updatedAt: new Date(payload.new.updated_at),
              dueDate: payload.new.due_date ? new Date(payload.new.due_date) : undefined,
              completedAt: payload.new.completed_at ? new Date(payload.new.completed_at) : undefined,
            };
            const matchesFilters =
              (!filters.statuses.length || filters.statuses.includes(updatedTask.status)) &&
              (!filters.clientId || updatedTask.clientId === filters.clientId) &&
              (!filters.dueDateStart || (updatedTask.dueDate && updatedTask.dueDate >= filters.dueDateStart)) &&
              (!filters.dueDateEnd || (updatedTask.dueDate && updatedTask.dueDate <= filters.dueDateEnd)) &&
              (user?.role !== 'admin' ? updatedTask.clientId === user?.app_metadata.clientId : true);
            setTasks((prev) => {
              const exists = prev.some((t) => t.id === updatedTask.id);
              if (matchesFilters) {
                return exists
                  ? prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
                  : [updatedTask, ...prev];
              } else if (exists) {
                return prev.filter((t) => t.id !== updatedTask.id);
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            console.log('Processing DELETE event for task:', payload.old.id);
            setTasks((prev) => {
              const updatedTasks = prev.filter((t) => t.id !== payload.old.id);
              console.log('Tasks after DELETE event:', updatedTasks);
              return updatedTasks;
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to tasks table changes');
        } else if (err) {
          console.error('Subscription error:', err);
          toast({
            title: "Error",
            description: "Failed to subscribe to task updates. Changes may not reflect in real-time.",
            variant: "destructive",
          });
        }
      });

    return () => {
      console.log('Unsubscribing from tasks table changes');
      supabase.removeChannel(subscription);
    };
  }, [filters, user]);

  const handleAddTask = async (newTask: Task) => {
    try {
      const supabaseTask = {
        id: newTask.id,
        title: newTask.title,
        client_id: newTask.clientId,
        description: newTask.description,
        status: newTask.status,
        estimated_hours: newTask.estimatedHours,
        estimated_cost: newTask.estimatedCost,
        project_link: newTask.project || null,
        due_date: newTask.dueDate?.toISOString(),
        created_at: newTask.createdAt.toISOString(),
        updated_at: newTask.updatedAt.toISOString(),
      };
      
      const { error } = await supabase
        .from('tasks')
        .insert([supabaseTask]);
      
      if (error) throw new Error(`Failed to create task: ${error.message}`);
      
      const matchesFilters =
        (!filters.statuses.length || filters.statuses.includes(newTask.status)) &&
        (!filters.clientId || newTask.clientId === filters.clientId) &&
        (!filters.dueDateStart || (newTask.dueDate && newTask.dueDate >= filters.dueDateStart)) &&
        (!filters.dueDateEnd || (newTask.dueDate && newTask.dueDate <= filters.dueDateEnd)) &&
        (user?.role !== 'admin' ? newTask.clientId === user?.app_metadata.clientId : true);
      
      if (matchesFilters) {
        setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
      }
      
      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const supabaseTask = {
        title: updatedTask.title,
        client_id: updatedTask.clientId,
        description: updatedTask.description,
        status: updatedTask.status,
        estimated_hours: updatedTask.estimatedHours,
        estimated_cost: updatedTask.estimatedCost,
        project_link: updatedTask.project || null,
        due_date: updatedTask.dueDate?.toISOString(),
        completed_at: updatedTask.completedAt?.toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('tasks')
        .update(supabaseTask)
        .eq('id', updatedTask.id);
      
      if (error) throw new Error(`Failed to update task: ${error.message}`);
      
      setTaskToEdit(null);
      
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const handleDeleteTask = async (taskId: string) => {
    try {
      // Optimistically update the state by removing the task
      const previousTasks = tasks; // Store current tasks for rollback
      setTasks((prev) => {
        const updatedTasks = prev.filter((t) => t.id !== taskId);
        console.log('Optimistically removed task:', taskId, 'New tasks:', updatedTasks);
        return updatedTasks;
      });

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        // Revert optimistic update on error
        setTasks(previousTasks);
        throw new Error(`Failed to delete task: ${error.message}`);
      }
      
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete task. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to inform TaskList
    }
  };
  
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsAddDialogOpen(true);
  };
  
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) throw new Error('Task not found');
      
      const updatedTask = {
        ...taskToUpdate,
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'complete' ? { completedAt: new Date() } : { completedAt: undefined }),
      };
      
      await handleUpdateTask(updatedTask);
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyFilters = (newFilters: TaskFilter) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsFilterDialogOpen(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          {user?.role === 'admin' && (
            <Button onClick={() => {setTaskToEdit(null); setIsAddDialogOpen(true);}}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Task Management</CardTitle>
          <CardDescription>
            {user?.role === 'admin' 
              ? "Manage all project tasks and track their progress."
              : "View your project tasks and their current status."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-gray-500">No tasks found.</p>
            </div>
          ) : (
            <TaskList 
              tasks={tasks}
              onEdit={user?.role === 'admin' ? handleEditTask : undefined}
              onDelete={user?.role === 'admin' ? handleDeleteTask : undefined}
              onStatusChange={user?.role === 'admin' ? handleStatusChange : undefined}
            />
          )}
        </CardContent>
      </Card>
      
      {user?.role === 'admin' && (
        <AddTaskDialog 
          isOpen={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          taskToEdit={taskToEdit}
        />
      )}
      
      <TaskFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApply={handleApplyFilters}
        isAdmin={user?.role === 'admin'}
      />
    </div>
  );
};

export default TasksPage;