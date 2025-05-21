import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '../../integrations/supabase/client';
import ClientForm, { ClientFormRef } from './ClientForm';
import { ClientStatus } from '@/types';

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
  const [defaultValues, setDefaultValues] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    status: ClientStatus;
    notes?: string;
  }>({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    notes: '',
  });
  const formRef = useRef<ClientFormRef>(null);

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
          setLoading(false);
          return;
        }

        setDefaultValues({
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          status: data.status,
          notes: data.notes || '',
        });
        setLoading(false);
      };

      fetchClient();
    } else {
      setDefaultValues({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
        notes: '',
      });
    }
  }, [clientId, isEditing]);

  const onSubmit = async (values: {
    name: string;
    email: string;
    phone: string;
    address: string;
    status: ClientStatus;
    notes?: string;
  }) => {
    setLoading(true);
    const payload = {
      ...values,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEditing && clientId) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
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
      console.error('Client save error:', err);
      toast.error(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the client information below.'
              : 'Fill in the client information to add a new client.'}
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          ref={formRef}
          onSubmit={onSubmit}
          defaultValues={defaultValues}
          isLoading={loading}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log('Submitting ClientForm');
              formRef.current?.submit();
            }}
            disabled={loading}
          >
            {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Client' : 'Add Client')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;