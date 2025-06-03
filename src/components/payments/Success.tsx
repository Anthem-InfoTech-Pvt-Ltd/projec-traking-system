import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const handleVerification = async () => {
      const sessionId = searchParams.get("session_id");
      const paymentId = searchParams.get("paymentId");

      if (!sessionId || !paymentId) {
        setLoading(false);
        return;
      }

      try {
        const { data: paymentData, error: paymentFetchError } = await supabase
          .from("payments")
          .select("task_id, client_id")
          .eq("id", paymentId)
          .single();

        if (paymentFetchError || !paymentData) {
          throw paymentFetchError || new Error("Payment not found");
        }

        const { task_id, client_id } = paymentData;

        const [{ data: taskData }, { data: clientData }] = await Promise.all([
          supabase
            .from("tasks")
            .select("title")
            .eq("id", task_id)
            .eq("is_deleted", false)
            .single(),
          supabase
            .from("clients")
            .select("name")
            .eq("id", client_id)
            .eq("is_deleted", false)
            .single(),
        ]);

        const taskTitle = taskData?.title || "Unknown Task";
        const clientName = clientData?.name || "Unknown Client";

        await verifyPayment(sessionId, taskTitle, clientName);
      } catch (err) {
        console.error("Verification error:", err.message);
        setLoading(false);
      }
    };

    handleVerification();
  }, []);

  const verifyPayment = async (sessionId, taskTitle, clientName) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/payments/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, taskTitle, clientName }),
          credentials: "include",
        }
      );

      const data = await res.json();

      if (data.success) {
        setVerified(true);
      } else {
        console.error("Verification failed:", data.message);
      }
    } catch (err) {
      console.error("Payment verification failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[82vh]">
        Verifying payment...
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="flex justify-center items-center min-h-[82vh]">
        <div className="text-red-500">Payment could not be verified.</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[82vh]">
      <div className="bg-white p-8 rounded-lg shadow text-center max-w-md w-full">
        <CheckCircle className="text-green-700 mx-auto h-16 w-16 mb-4" />
        <h1 className="text-3xl font-bold text-green-700 mb-2">
          Transaction Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Your transaction has been completed. Thank you for your payment!
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full bg-green-700 text-white shadow rounded px-1 py-2"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};