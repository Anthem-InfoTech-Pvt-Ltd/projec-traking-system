import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface MarkPaidDialogProps {
  open: boolean;
  onClose: () => void;
  paymentId: string | null;
  onSuccess: () => void;
}

const MarkPaidDialog: React.FC<MarkPaidDialogProps> = ({
  open,
  onClose,
  paymentId,
  onSuccess,
}) => {
  const [transactionId, setTransactionId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

 const handleSubmit = async () => {
  if (!paymentId || !user) {
    toast.error("Missing payment or user info");
    return;
  }

  try {
    setIsSubmitting(true);
    let documentUrl = null;

    // 1. Validate file and type
    if (selectedFile && documentType) {
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
      const validImageTypes = ["jpg", "jpeg", "png", "gif"];
      const isPdf = fileExtension === "pdf";
      const isImage = validImageTypes.includes(fileExtension || "");

      if (
        (documentType === "pdf" && !isPdf) ||
        (documentType === "image" && !isImage)
      ) {
        toast.error(`Please upload a valid ${documentType} file.`);
        setIsSubmitting(false); 
        return;
      }

      // 2. Upload file
      const filePath = `payments/${paymentId}_${Date.now()}.${fileExtension}`;
      const { data, error } = await supabase.storage
        .from("payments")
        .upload(filePath, selectedFile);

      if (error) {
        console.error("Upload error:", error.message);
        toast.error("Failed to upload file.");
        return;
      }

      const { data: file } = await supabase.storage
        .from("payments")
        .getPublicUrl(filePath);

      documentUrl = file?.publicUrl;
    }

    // 3. Fetch payment details
    const { data: paymentData, error: paymentFetchError } = await supabase
      .from("payments")
      .select("task_id, client_id")
      .eq("id", paymentId).eq("is_deleted", false)
      .single();

    if (paymentFetchError || !paymentData) {
      throw paymentFetchError || new Error("Payment not found");
    }

    const { task_id, client_id } = paymentData;

    // 4. Fetch client and task
    const [{ data: taskData }, { data: clientData }] = await Promise.all([
      supabase.from("tasks").select("title").eq("id", task_id).eq("is_deleted", false).single(),
      supabase.from("clients").select("name").eq("id", client_id).eq("is_deleted", false).single(),
    ]);

    const taskTitle = taskData?.title || "Unknown Task";
    const clientName = clientData?.name || "Unknown Client";

    // 5. Update payment
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "received",
        transactionId,
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_url: documentUrl,
        document_type: documentType || null,
      })
      .eq("id", paymentId).eq("is_deleted", false);

    if (paymentUpdateError) throw paymentUpdateError;

    // 6. Send notification to admin
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        receiver_role: "admin",
        sender_role: "client",
        type: "payment",
        title: "Payment Received",
        message: `Payment received from ${clientName} for task "${taskTitle}".`,
        triggered_by: user.id,
      });

    if (notificationError) throw notificationError;

    toast.success("Payment marked as paid.");
    onSuccess();
    onClose();
    setTransactionId("");
    setDocumentType("");
    setSelectedFile(null);
  } catch (error: any) {
    console.error(error);
    toast.error("Failed to mark payment as paid.");
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Payment as Paid</DialogTitle>
        </DialogHeader>

        <div>
          <label htmlFor="transactionId" className="block font-medium mb-1">
            Transaction ID
          </label>
          <input
            type="text"
            id="transactionId"
            required
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="w-full border rounded px-2 py-2"
            placeholder="Enter transaction ID"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="documentType" className="block font-medium mb-1">
            Document type (optional)
          </label>
          <select
            id="documentType"
            className="w-full border rounded px-2 py-2"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">--Select document type--</option>
            <option value="image">Image</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        <div>
          <label htmlFor="documentFile" className="block font-medium mb-1">
            Related document (optional)
          </label>
          <input
            type="file"
            id="documentFile"
            accept={documentType === "pdf" ? ".pdf" : "image/*"}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            disabled={!documentType || isSubmitting}
            className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0 file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !transactionId.trim()}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkPaidDialog;