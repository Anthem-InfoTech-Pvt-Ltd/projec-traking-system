import { CheckCircle, DollarSign, FileText, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";

export default function DashboardHighlights({ user, clientId, isAdmin }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboardHighlights", clientId, isAdmin],
    queryFn: async () => {
  const now = new Date();

  // Fetch clients
  const clientsRes = await supabase.from("clients").select("id, name, created_at, updated_at");
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  const clientMap = new Map(clientsRes.data.map((c) => [c.id, c.name]));

  const [taskRes, paymentRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, created_at, updated_at, due_date, client_id")
      .order("updated_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, invoice_number, amount, status, created_at, updated_at, due_date, client_id")
      .order("updated_at", { ascending: false }),
  ]);

  if (taskRes.error || paymentRes.error) {
    throw new Error(taskRes.error?.message || paymentRes.error?.message);
  }

  // Build activities with clients
  const activities = [
    // Task activities
    ...taskRes.data.map((task) => ({
      type: "task",
      title: task.title,
      subtitle: `Client: ${clientMap.get(task.client_id) || task.client_id}`,
      time: new Date(task.updated_at),
      icon: task.status === "completed" ? CheckCircle : FileText,
      iconColor: task.status === "completed" ? "text-blue-500" : "text-amber-500",
      iconBg: task.status === "completed" ? "bg-blue-100" : "bg-amber-100",
      label:
        task.status === "completed"
          ? "Task completed"
          : new Date(task.updated_at) > new Date(task.created_at)
          ? "Task updated"
          : "New task created",
    })),

    // Payment activities
  ...paymentRes.data.map((payment) => {
  const isUpdated =
    new Date(payment.updated_at).getTime() > new Date(payment.created_at).getTime();

  return {
    type: "payment",
    title: `Invoice #${payment.invoice_number}`,
    subtitle: `$${payment.amount} - Client: ${
      clientMap.get(payment.client_id) || payment.client_id
    }`,
    time: new Date(payment.updated_at),
    icon: DollarSign,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-100",
    label: !isUpdated
      ? "New payment created"
      : `Payment status changed to "${payment.status}"`,
  };
}),

    // Client create/update activities
    ...clientsRes.data.map((client) => ({
      type: "client",
      title: client.name,
      subtitle: ``,
      time: new Date(client.updated_at),
      icon: FileText,
      iconColor:
        new Date(client.updated_at) > new Date(client.created_at)
          ? "text-green-500"
          : "text-cyan-500",
      iconBg:
        new Date(client.updated_at) > new Date(client.created_at)
          ? "bg-green-100"
          : "bg-cyan-100",
      label:
        new Date(client.updated_at) > new Date(client.created_at)
          ? "Client updated"
          : "New client created",
    })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 3);

  // Deadlines logic unchanged
  const deadlines = [
    ...taskRes.data
      .filter((t) => t.due_date && new Date(t.due_date) > now)
      .map((task) => ({
        title: task.title,
        subtitle: `Client: ${clientMap.get(task.client_id) || task.client_id}`,
        due: new Date(task.due_date),
        icon: AlertCircle,
        iconColor: "text-red-500",
        iconBg: "bg-red-100",
      })),
    ...paymentRes.data
      .filter((p) => p.due_date && new Date(p.due_date) > now)
      .map((payment) => ({
        title:payment.invoice_number?`Invoice #${payment.invoice_number}`:"Payment deadline",
        subtitle: `Client: ${clientMap.get(payment.client_id) || payment.client_id} - $${payment.amount}`,
        due: new Date(payment.due_date),
        icon: DollarSign,
        iconColor: "text-amber-500",
        iconBg: "bg-amber-100",
      })),
  ]
    .sort((a, b) => a.due - b.due)
    .slice(0, 3);

  return { activities, deadlines };
},

    enabled: !!user?.id,
  });

  return (
    <>
      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Latest updates from your projects</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4">
              {data.activities.map((item, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className={`${item.iconBg} p-2 rounded-full`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.title.charAt(0).toUpperCase() + item.title.slice(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.time, { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.subtitle.charAt(0).toUpperCase() + item.subtitle.slice(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Tasks and payments due soon</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4">
              {data.deadlines.map((item, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className={`${item.iconBg} p-2 rounded-full`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">{item.title.charAt(0).toUpperCase() + item.title.slice(1)}</p>
                      <span className={`text-sm font-medium ${item.iconColor}`}>
                        {formatDistanceToNow(item.due, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.subtitle.charAt(0).toUpperCase() + item.subtitle.slice(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
