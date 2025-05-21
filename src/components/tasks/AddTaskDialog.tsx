import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TaskForm, { TaskFormRef } from './TaskForm';
import { Task } from '@/types';
import { createTaskObject } from './AddTaskDialog.fix';

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
  const formRef = useRef<TaskFormRef>(null);

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
        console.error('Fetch clients error:', error);
        toast.error('Failed to load clients. Please try again.');
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, [isOpen]);

  const onSubmit = async (data: {
    title: string;
    clientId: string;
    description: string;
    status: string;
    estimatedHours: number;
    estimatedCost: number;
    project_link?: string;
    dueDate?: Date | null;
  }) => {
    console.log('TaskForm submitted with values:', data);
    try {
      const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

      if (taskToEdit) {
        const updatedTask = {
          ...taskToEdit,
          title: data.title,
          clientId: data.clientId,
          description: data.description,
          status: data.status,
          estimatedHours: data.estimatedHours,
          estimatedCost: data.estimatedCost,
          project_link: data.project_link || null,
          dueDate: parsedDueDate,
          updatedAt: new Date(),
        };

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

        toast.success('Task updated successfully');
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

        toast.success('Task created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Task save error:', error);
      toast.error(error.message || 'Failed to save task. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {taskToEdit
              ? 'Update the task details below.'
              : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          ref={formRef}
          onSubmit={onSubmit}
          defaultValues={taskToEdit ? {
            title: taskToEdit.title,
            clientId: taskToEdit.clientId,
            description: taskToEdit.description,
            status: taskToEdit.status,
            estimatedHours: taskToEdit.estimatedHours,
            estimatedCost: taskToEdit.estimatedCost,
            project_link: taskToEdit.project_link || '',
            dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : null,
          } : {
            title: '',
            clientId: '',
            description: '',
            status: 'requirements',
            estimatedHours: 0,
            estimatedCost: 0,
            project_link: '',
            dueDate: null,
          }}
          clients={clients}
          isLoadingClients={isLoadingClients}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log('Submitting TaskForm');
              formRef.current?.submit();
            }}
            disabled={isLoadingClients}
          >
            {taskToEdit ? 'Update Task' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;