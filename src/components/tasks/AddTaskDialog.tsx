import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TaskForm, { TaskFormRef } from "./TaskForm";
import { Task } from "@/types";
import { createTaskObject } from "./AddTaskDialog.fix";
import { useAuth } from "@/context/AuthContext";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => Promise<void>;
  onUpdateTask: (task: Task) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state
  const formRef = useRef<TaskFormRef>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .eq("is_deleted", false)
          .order("name", { ascending: true });

        if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
        setClients(data || []);
      } catch (error: any) {
        console.error("Fetch clients error:", error);
        // Defer error handling to parent component
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
    setIsSubmitting(true);
    try {
      const parsedDueDate = data.dueDate ? new Date(data.dueDate) : undefined;

      if (taskToEdit) {
        const updatedTask = {
          ...taskToEdit,
          title: data.title,
          clientId: data.clientId,
          description: data.description,
          status: data.status as TaskStatus,
          estimatedHours: data.estimatedHours,
          estimatedCost: data.estimatedCost,
          project: data.project_link || null,
          dueDate: parsedDueDate,
          updatedAt: new Date(),
        };

        await onUpdateTask(updatedTask);

        // 🔔 Send update notification
        await supabase.from("notifications").insert({
          receiver_id: data.clientId,
          receiver_role: "client",
          sender_role: "admin",
          type: "task",
          title: "Task Updated",
          message: `The task "${data.title}" has been updated.`,
          triggered_by: user.id,
        });
      } else {
        const newTask = createTaskObject({
          id: `task-${Date.now()}`,
          title: data.title,
          clientId: data.clientId,
          description: data.description,
          status: data.status as TaskStatus,
          estimatedHours: data.estimatedHours,
          estimatedCost: data.estimatedCost,
          project: data.project_link,
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: parsedDueDate,
        });

        await onAddTask(newTask);

        // 🔔 Send create notification
        await supabase.from("notifications").insert({
          receiver_id: data.clientId,
          receiver_role: "client",
          type: "task",
          sender_role: "admin",
          title: "New Task Assigned",
          message: `A new task "${data.title}" has been created for you.`,
          triggered_by: user.id,
        });
      }

      onClose();
    } catch (error: any) {
      console.error("Task save error:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 top-[-5vh] max-h[105vh] z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={onClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl  p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                {taskToEdit ? "Edit Task" : "Create New Task"}
              </h2>
              <p className="text-sm text-gray-500">
                {taskToEdit
                  ? "Update the task details below."
                  : "Fill in the details to create a new task."}
              </p>
            </div>

            {/* Task Form */}
            <TaskForm
              ref={formRef}
              onSubmit={onSubmit}
              defaultValues={
                taskToEdit
                  ? {
                      title: taskToEdit.title,
                      clientId: taskToEdit.clientId,
                      description: taskToEdit.description,
                      status: taskToEdit.status,
                      estimatedHours: taskToEdit.estimatedHours,
                      estimatedCost: taskToEdit.estimatedCost,
                      project_link: taskToEdit.project || "",
                      dueDate: taskToEdit.dueDate
                        ? new Date(taskToEdit.dueDate)
                        : null,
                    }
                  : {
                      title: "",
                      clientId: "",
                      description: "",
                      status: "requirements",
                      estimatedHours: 0,
                      estimatedCost: 0,
                      project_link: "",
                      dueDate: null,
                    }
              }
              clients={clients}
              isLoadingClients={isLoadingClients}
            />

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={() => {
                  console.log("Submitting TaskForm");
                  formRef.current?.submit();
                }}
                disabled={isLoadingClients || isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : taskToEdit
                  ? "Update Task"
                  : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    // <Dialog open={isOpen} onOpenChange={onClose}>
    //   <DialogContent className="sm:max-w-[600px] w-full max-w-lg max-h-[95vh] overflow-y-auto">
    //     <DialogHeader>
    //       <DialogTitle>{taskToEdit ? 'Edit Task' : 'Create New Task'}</DialogTitle>
    //       <DialogDescription>
    //         {taskToEdit
    //           ? 'Update the task details below.'
    //           : 'Fill in the details to create a new task.'}
    //       </DialogDescription>
    //     </DialogHeader>
    //     <TaskForm
    //       ref={formRef}
    //       onSubmit={onSubmit}
    //       defaultValues={taskToEdit ? {
    //         title: taskToEdit.title,
    //         clientId: taskToEdit.clientId,
    //         description: taskToEdit.description,
    //         status: taskToEdit.status,
    //         estimatedHours: taskToEdit.estimatedHours,
    //         estimatedCost: taskToEdit.estimatedCost,
    //         project_link: taskToEdit.project || '',
    //         dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : null,
    //       } : {
    //         title: '',
    //         clientId: '',
    //         description: '',
    //         status: 'requirements',
    //         estimatedHours: 0,
    //         estimatedCost: 0,
    //         project_link: '',
    //         dueDate: null,
    //       }}
    //       clients={clients}
    //       isLoadingClients={isLoadingClients}
    //     />
    //     <DialogFooter>
    //       <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
    //         Cancel
    //       </Button>
    //       <Button
    //         onClick={() => {
    //           console.log('Submitting TaskForm');
    //           formRef.current?.submit();
    //         }}
    //         disabled={isLoadingClients || isSubmitting}
    //       >
    //         {isSubmitting ? 'Saving...' : taskToEdit ? 'Update Task' : 'Create Task'}
    //       </Button>
    //     </DialogFooter>
    //   </DialogContent>
    // </Dialog>
  );
};

export default AddTaskDialog;
