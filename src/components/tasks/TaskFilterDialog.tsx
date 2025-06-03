import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import SimpleDatePicker from "../ui/customCalendar";

interface TaskFilterForm {
  statuses: TaskStatus[];
  clientId: string | null;
  dueDateStart: Date | null;
  dueDateEnd: Date | null;
}

interface TaskFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: TaskFilterForm) => void;
  isAdmin: boolean;
}

const filterSchema = z
  .object({
    statuses: z
      .array(
        z.enum([
          "requirements",
          "quote",
          "approved",
          "progress",
          "submitted",
          "feedback",
          "complete",
        ])
      )
      .optional(),
    clientId: z.string().nullable().optional(),
    dueDateStart: z.date().nullable().optional(),
    dueDateEnd: z.date().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.dueDateStart && data.dueDateEnd) {
        return data.dueDateStart <= data.dueDateEnd;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["dueDateEnd"],
    }
  );

const TaskFilterDialog: React.FC<TaskFilterDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  isAdmin,
}) => {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const form = useForm<TaskFilterForm>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      statuses: [],
      clientId: null,
      dueDateStart: null,
      dueDateEnd: null,
    },
  });

  useEffect(() => {
    if (isAdmin) {
      const fetchClients = async () => {
        setIsLoadingClients(true);
        try {
          const { data, error } = await supabase
            .from("clients")
            .select("id, name")
            .eq("is_deleted", false)
            .order("name", { ascending: true });
          if (error) throw error;
          setClients(data || []);
        } catch (error: any) {
          console.error("Error fetching clients:", error.message);
        } finally {
          setIsLoadingClients(false);
        }
      };
      fetchClients();
    }
  }, [isAdmin]);

  const onSubmit = (data: TaskFilterForm) => {
    console.log("Applying filters:", data);
    onApply(data);
    onClose();
  };

  const handleClear = () => {
    form.reset({
      statuses: [],
      clientId: null,
      dueDateStart: null,
      dueDateEnd: null,
    });
    onApply({
      statuses: [],
      clientId: null,
      dueDateStart: null,
      dueDateEnd: null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Filter Tasks</DialogTitle>
          <DialogDescription>
            Select criteria to filter tasks. Leave fields empty to include all
            options.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="statuses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange([value as TaskStatus]);
                    }}
                    value={field.value?.[0] || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            field.value?.length
                              ? `${field.value.length} selected`
                              : "Select status"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[
                        "requirements",
                        "quote",
                        "approved",
                        "progress",
                        "submitted",
                        "feedback",
                        "complete",
                      ].map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isAdmin && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "all" ? null : value)
                      }
                      value={field.value || "all"}
                      disabled={isLoadingClients}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingClients ? "Loading..." : "Select client"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
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
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDateStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date Start</FormLabel>
                    <FormControl>
                      <SimpleDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDateEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date End</FormLabel>
                    <FormControl>
                      <SimpleDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select end date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear Filters
              </Button>
              <Button type="submit">Apply Filters</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskFilterDialog;
