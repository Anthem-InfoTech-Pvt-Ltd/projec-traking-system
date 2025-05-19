import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createTaskObject } from './AddTaskDialog.fix';

const taskFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }).max(100),
  clientId: z.string().min(1, { message: 'Please select a client' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }).max(500),
  status: z.enum(['requirements', 'quote', 'approved', 'progress', 'submitted', 'feedback', 'complete'] as const),
  estimatedHours: z.coerce.number().positive({ message: 'Hours must be positive' }),
  estimatedCost: z.coerce.number().positive({ message: 'Cost must be positive' }),
  project_link: z.string().optional(),
  dueDate: z.date().nullable().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  taskToEdit: Task | null;
}

const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onUpdateTask,
  taskToEdit,
}) => {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;

        setClients(data || []);
      } catch (error: any) {
        console.error('Error fetching clients:', error);
        toast({
          title: "Error",
          description: "Failed to load clients. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, [isOpen]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      clientId: '',
      description: '',
      status: 'requirements',
      estimatedHours: 0,
      estimatedCost: 0,
      project_link: '',
      dueDate: null,
    },
  });

  useEffect(() => {
    if (taskToEdit) {
      form.reset({
        title: taskToEdit.title,
        clientId: taskToEdit.clientId,
        description: taskToEdit.description,
        status: taskToEdit.status,
        estimatedHours: taskToEdit.estimatedHours,
        estimatedCost: taskToEdit.estimatedCost,
        project_link: taskToEdit.project_link || '',
        dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : null,
      });
    } else {
      form.reset({
        title: '',
        clientId: '',
        description: '',
        status: 'requirements',
        estimatedHours: 0,
        estimatedCost: 0,
        project_link: '',
        dueDate: null,
      });
    }
  }, [taskToEdit, form, isOpen]);

  const onSubmit = async (data: TaskFormValues) => {
    try {
      const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

      if (taskToEdit) {
        const updatedTask = {
          ...taskToEdit,
          title: data.title,
          client_id: data.clientId,
          description: data.description,
          status: data.status,
          estimated_hours: data.estimatedHours,
          estimated_cost: data.estimatedCost,
          project_link: data.project_link || null,
          due_date: parsedDueDate,
          updated_at: new Date(),
        };

        console.log('Updating task with payload:', updatedTask);

        const { error } = await supabase
          .from('tasks')
          .update({
            title: data.title,
            client_id: data.clientId,
            description: data.description,
            status: data.status,
            estimated_hours: data.estimatedHours,
            estimated_cost: data.estimatedCost,
            project_link: data.project_link || null,
            due_date: parsedDueDate ? parsedDueDate.toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskToEdit.id);

        if (error) {
          console.error('Supabase update error:', error);
          throw new Error(`Failed to update task: ${error.message}`);
        }

        await onUpdateTask(updatedTask);

        toast({
          title: "Task updated",
          description: "The task has been successfully updated.",
        });
      } else {
        const newTask = createTaskObject({
          id: `task-${Date.now()}`,
          title: data.title,
          clientId: data.clientId,
          description: data.description,
          status: data.status,
          estimatedHours: data.estimatedHours,
          estimatedCost: data.estimatedCost,
          project_link: data.project_link,
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: parsedDueDate,
        });

        const { error } = await supabase.from('tasks').insert({
          id: newTask.id,
          title: newTask.title,
          client_id: newTask.clientId,
          description: newTask.description,
          status: newTask.status,
          estimated_hours: newTask.estimatedHours,
          estimated_cost: newTask.estimatedCost,
          project_link: newTask.project_link || null,
          created_at: newTask.createdAt.toISOString(),
          updated_at: newTask.updatedAt.toISOString(),
          due_date: newTask.dueDate ? newTask.dueDate.toISOString() : null,
        });

        if (error) {
          console.error('Supabase insert error:', error);
          throw new Error(`Failed to create task: ${error.message}`);
        }

        await onAddTask(newTask);

        toast({
          title: "Task created",
          description: "The new task has been successfully created.",
        });
      }
      onClose();
    } catch (error: any) {
      console.error('Error submitting task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save task. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {taskToEdit
              ? 'Update the task details below.'
              : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={isLoadingClients}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="project_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Link</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project link" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the task in detail"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="requirements">Requirements</SelectItem>
                        <SelectItem value="quote">Quote Sent</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="progress">In Progress</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && 'text-muted-foreground'
                            }`}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Hours</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
              name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {taskToEdit ? 'Update Task' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;