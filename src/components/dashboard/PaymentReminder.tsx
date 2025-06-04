// components/PaymentReminder.tsx
import { useEffect, useState } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { supabase } from "../../integrations/supabase/client";
import { AlertCircle, Clock } from "lucide-react";

interface Reminder {
  id: string;
  due_date: string;
  amount: number;
  status: string;
  client: {
    name: string;
  };
}

interface Props {
  clientId: string;
}

export default function PaymentReminder({ clientId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const fetchReminders = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, due_date, amount, status, clients(name)")
        .eq("client_id", clientId);

      if (error) console.error("Error fetching reminders", error);
      else setReminders(data || []);
      console.log("Fetching reminders for client:", data);
      console.log("Fetching reminders for client error:", error);
    };
    fetchReminders();
  }, [clientId]);

const upcoming = reminders.filter((r) => {
  const due = parseISO(r.due_date);
  const days = differenceInDays(due, new Date());
  const status = r.status?.toLowerCase(); // just to be safe
  
  return (
      days <= 10 && 
      (status === "pending" || status === "invoiced")
    );
});


const overdue = reminders.filter((r) => {
    const due = parseISO(r.due_date);
    const status = r.status?.toLowerCase(); // just to be safe
    return (differenceInDays(new Date(), due) > 0 && status === "overdue");
  });

  if (upcoming.length === 0 && overdue.length === 0) return null;
console.log("Upcoming reminders:", upcoming);
    console.log("Overdue reminders:", overdue);

  return (
<div className="col-span-1 lg:col-span-2">
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Payment Reminders</h2>
          <p className="text-sm text-muted-foreground">Alerts for upcoming and overdue payments</p>
        </div>
        <div className="p-4 space-y-4">
          {overdue.map((r) => (
            <div key={r.id} className="flex items-start space-x-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium text-red-600">Overdue: ${r.amount}</p>
                  <span className="text-sm font-medium text-red-500">
                    Due {format(parseISO(r.due_date), "dd MMM yyyy")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Please make the payment as soon as possible.</p>
              </div>
            </div>
          ))}

          {upcoming.map((r) => (
            <div key={r.id} className="flex items-start space-x-4">
              <div className="bg-yellow-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium text-yellow-700">Upcoming: ${r.amount}</p>
                  <span className="text-sm font-medium text-yellow-600">
                    Due {format(parseISO(r.due_date), "dd MMM yyyy")}
                  </span>
                </div>
                 <p className="text-sm text-muted-foreground">Kindly ensure payment by the due date.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
