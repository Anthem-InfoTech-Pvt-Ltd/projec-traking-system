import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  entityName: string;
  isProcessing?: boolean;
  title?: string;
  description?: string;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  onOpenChange,
  onDelete,
  entityName,
  isProcessing = false,
  title = 'Confirm Deletion',
  description,
}) => {
  const defaultDescription = `Are you sure you want to delete this ${entityName}? This action cannot be undone.`;

  const handleDeleteClick = () => {
    console.log(`Initiating delete for ${entityName}`);
    try {
      onDelete();
    } catch (error) {
      console.error(`Error in onDelete for ${entityName}:`, error);
      onOpenChange(false); // Close dialog on error
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        console.log(`DeleteDialog onOpenChange: ${isOpen} for ${entityName}`);
        try {
          onOpenChange(isOpen);
        } catch (error) {
          console.error(`Error in onOpenChange for ${entityName}:`, error);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description || defaultDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              console.log(`Cancel clicked for ${entityName} delete dialog`);
              onOpenChange(false);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteClick}
            disabled={isProcessing}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDialog;