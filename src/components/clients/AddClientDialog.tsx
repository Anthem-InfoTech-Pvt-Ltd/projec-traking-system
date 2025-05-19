// AddClientDialog.tsx
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientStatus } from '@/types';
import { supabase } from '../../integrations/supabase/client'; // make sure this is properly configured

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['active', 'idle', 'gone']),
  notes: z.string().optional(),
});

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onClientSaved: () => void;
}

const AddClientDialog: React.FC<AddClientDialogProps> = ({
  open,
  onOpenChange,
  clientId,
  onClientSaved,
}) => {
  const isEditing = !!clientId;
  const [loading, setLoading] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<ClientStatus>('active');

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
      notes: '',
    },
  });

  useEffect(() => {
    if (isEditing && clientId) {
      const fetchClient = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error || !data) {
          toast.error('Failed to load client');
          return;
        }

        form.reset({
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          status: data.status,
          notes: data.notes || '',
        });

        setPreviousStatus(data.status);
        setLoading(false);
      };

      fetchClient();
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
        notes: '',
      });
    }
  }, [clientId, isEditing, form]);

  const onSubmit = async (values: z.infer<typeof clientSchema>) => {
    setLoading(true);

    const payload = {
      ...values,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEditing && clientId) {
        const { error } = await supabase
          .from('clients')
          .update({ ...payload })
          .eq('id', clientId);

        if (error) throw new Error(error.message);
        toast.success('Client updated successfully');
      } else {
        const { error } = await supabase.from('clients').insert([payload]);
        if (error) throw new Error(error.message);
        toast.success('Client added successfully');
      }

      onOpenChange(false);
      onClientSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the client information below.'
              : 'Fill in the client information to add a new client.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client name" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="client@example.com" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="idle">Idle</SelectItem>
                        <SelectItem value="gone">Gone</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Client address" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Client' : 'Add Client')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;