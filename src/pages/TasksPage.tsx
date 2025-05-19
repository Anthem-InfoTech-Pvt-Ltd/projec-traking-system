import React, { useState, useEffect } from 'react';
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
import { Task, TaskStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Fetch tasks from Supabase
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        
        let query = supabase.from('tasks').select('*');
        
        // If user is not admin, filter tasks by client ID
        if (user?.role !== 'admin') {
          query = query.eq('client_id', user.app_metadata.clientId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw new Error('Failed to fetch tasks');
        }
        
        // Transform the data to match our Task interface
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
          project: task.project,
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
    };
    
    fetchTasks();
  }, [user]);
  
  const handleAddTask = async (newTask: Task) => {
    try {
      // Transform task to match Supabase schema
      const supabaseTask = {
        id: newTask.id,
        title: newTask.title,
        client_id: newTask.clientId,
        description: newTask.description,
        status: newTask.status,
        estimated_hours: newTask.estimatedHours,
        estimated_cost: newTask.estimatedCost,
        project: newTask.project,
        due_date: newTask.dueDate?.toISOString(),
        created_at: newTask.createdAt.toISOString(),
        updated_at: newTask.updatedAt.toISOString(),
      };
      
      // Insert task into Supabase
      const { error } = await supabase
        .from('tasks')
        .insert([supabaseTask]);
      
      if (error) throw error;
      
      // Add to local state
      setTasks([...tasks, newTask]);
      
      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      // Transform task to match Supabase schema
      const supabaseTask = {
        title: updatedTask.title,
        client_id: updatedTask.clientId,
        description: updatedTask.description,
        status: updatedTask.status,
        estimated_hours: updatedTask.estimatedHours,
        estimated_cost: updatedTask.estimatedCost,
        project: updatedTask.project,
        due_date: updatedTask.dueDate?.toISOString(),
        completed_at: updatedTask.completedAt?.toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Update task in Supabase
      const { error } = await supabase
        .from('tasks')
        .update(supabaseTask)
        .eq('id', updatedTask.id);
      
      if (error) throw error;
      
      // Update local state
      setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
      setTaskToEdit(null);
      
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteTask = async (taskId: string) => {
    try {
      // Delete task from Supabase
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      // Update local state
      setTasks(tasks.filter(task => task.id !== taskId));
      
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsAddDialogOpen(true);
  };
  
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) return;
      
      const updatedTask = {
        ...taskToUpdate,
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'complete' ? { completedAt: new Date() } : {})
      };
      
      await handleUpdateTask(updatedTask);
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
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
              {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-anthem-purple"></div> */}
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
    </div>
  );
};

export default TasksPage;