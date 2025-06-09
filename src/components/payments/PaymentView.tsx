import React, { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Button } from "../ui/button";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PaymentViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string | null;
}

interface Payment {
  id: string;
  task_id: string;
  client_id: string;
  amount: number;
  status: string;
  due_date: string;
  invoice_number: string;
  received_at?: string | null;
  notes?: string | null;
  transactionId?: string | null;
  document_url?: string | null;
  document_type?: string | null;
  client_id: string;
  created_at: string;
  task: {
    title: string;
  } | null;
  client: {
    name: string;
  } | null;
}

export const PaymentView: React.FC<PaymentViewProps> = ({
  open,
  onOpenChange,
  paymentId,
}) => {
  const [paymentDetails, setPaymentDetails] = useState<Payment | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPaymentDetails = async (paymentId: string) => {
      if (!paymentId) return;

      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          task:tasks (
            title
          ),
          client:clients (
            name
          )
        `
        )
        .eq("id", paymentId)
        .single();

      if (error) {
        console.error("Error fetching payment details:", error);
      } else {
        console.log("Payment details:", data);
        setPaymentDetails(data);
        console.log("Payment details state updated:", paymentDetails);
      }
    };
    if (paymentId) {
      fetchPaymentDetails(paymentId);
    }
  }, [paymentId]);

  if (!open || !paymentId) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 max-h[105vh] top-[-5vh] bg-black bg-opacity-70"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              Payment Details
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          {paymentDetails ? (
            <div className="p-6 space-y-6 max-h-[75vh] m-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.role === "admin" && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Client
                    </label>
                    <p className="text-gray-900">
                      {paymentDetails.client?.name || "N/A"}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Task
                  </label>
                  <p className="text-gray-900">
                    {paymentDetails.task?.title || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Amount
                  </label>
                  <p className="text-gray-900">${paymentDetails.amount}</p>
                </div>
                {paymentDetails.invoice_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Invoice
                    </label>
                    <p className="text-gray-900">
                      #{paymentDetails.invoice_number}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Due Date
                  </label>
                  <p className="text-gray-900">
                    {new Date(paymentDetails.due_date).toDateString()}
                  </p>
                </div>

                {paymentDetails.transactionId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Transaction ID
                    </label>
                    <p className="text-gray-900">
                      {paymentDetails.transactionId}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <p className="text-gray-900 capitalize">
                  {paymentDetails.status}
                </p>
              </div>

              {paymentDetails.document_url && paymentDetails.document_type && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Document Preview
                    </label>
                    <div className="mt-2 overflow-hidden flex items-center">
                      {paymentDetails.document_type === "image" ? (
                       <div className="max-h-60 w-auto overflow-hidden flex items-center">
                         <img
                          src={paymentDetails.document_url}
                          alt="Document Preview"
                          className="rounded-lg border max-w-full max-h-64 shadow-md cursor-pointer hover:scale-105 transition"
                          onClick={() =>
                            setImagePreviewUrl(
                              paymentDetails.document_url || ""
                            )
                          }
                        />
                       </div>
                      ) : paymentDetails.document_type === "pdf" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              paymentDetails.document_url || "",
                              "_blank"
                            )
                          }
                          className="gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open PDF
                        </Button>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Unsupported document type
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Document Type
                    </label>
                    <p className="text-gray-900 capitalize">
                      {paymentDetails.document_type}
                    </p>
                  </div>
                </div>
              )}

              {paymentDetails.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Note
                  </label>
                  <p className="text-gray-900">{paymentDetails.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-gray-500">No data found</div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Full-screen Image Viewer */}
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 max-h[105vh] top-[-5vh] p-8 bg-black bg-opacity-70 z-50 flex items-center justify-center"
          onClick={() => setImagePreviewUrl(null)}
        >
          <button
            className="absolute top-5 right-5 text-white text-3xl font-bold z-50"
            onClick={() => setImagePreviewUrl(null)}
          >
            ×
          </button>
          <img
            src={imagePreviewUrl}
            alt="Full Preview"
            className="max-w-full rounded max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};
