import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// Spinner Component
const Spinner = () => (
  <div className="flex justify-center items-center py-4">
    <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const clientId = user?.app_metadata?.clientId;
console.log('User:', user);
  // Timeout utility
  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const timeout = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
    return Promise.race([promise, timeout]);
  };

  // Admin dashboard queries
  const { data: totalClients, isLoading: clientsLoading } = useQuery({
    queryKey: ['totalClients'],
    queryFn: async () => {
      const { count, error } = await withTimeout(
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        5000
      );
      if (error) throw new Error(`Failed to fetch total clients: ${error.message}`);
      console.log('Total Clients:', count);
      return count || 0;
    },
    enabled: isAdmin,
  });

  const { data: activeTasks, isLoading: activeTasksLoading } = useQuery({
    queryKey: ['activeTasks'],
    queryFn: async () => {
      const { count, error } = await withTimeout(
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'complete'),
        5000
      );
      if (error) throw new Error(`Failed to fetch active tasks: ${error.message}`);
      console.log('Active Tasks:', count);
      return count || 0;
    },
    enabled: isAdmin,
  });

  const { data: completedTasks, isLoading: completedTasksLoading } = useQuery({
    queryKey: ['completedTasks'],
    queryFn: async () => {
      const { count, error } = await withTimeout(
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'complete'),
        5000
      );
      if (error) throw new Error(`Failed to fetch completed tasks: ${error.message}`);
      console.log('Completed Tasks:', count);
      return count || 0;
    },
    enabled: isAdmin,
  });

  const { data: pendingPayments, isLoading: pendingPaymentsLoading } = useQuery({
    queryKey: ['pendingPayments'],
    queryFn: async () => {
      const { count, error } = await withTimeout(
        supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'due', 'invoiced']),
        5000
      );
      if (error) throw new Error(`Failed to fetch pending payments: ${error.message}`);
      console.log('Pending Payments:', count);
      return count || 0;
    },
    enabled: isAdmin,
  });

  const { data: overduePayments, isLoading: overduePaymentsLoading } = useQuery({
    queryKey: ['overduePayments'],
    queryFn: async () => {
      const { count, error } = await withTimeout(
        supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'overdue'),
        5000
      );
      if (error) throw new Error(`Failed to fetch overdue payments: ${error.message}`);
      console.log('Overdue Payments:', count);
      return count || 0;
    },
    enabled: isAdmin,
  });

  const { data: clientStatusData, isLoading: clientStatusLoading, error: clientStatusError } = useQuery({
    queryKey: ['clientStatus'],
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from('clients')
          .select('status')
          .in('status', ['active', 'idle', 'gone']),
        5000
      );
      if (error) throw new Error(`Failed to fetch client status: ${error.message}`);
      console.log('Client Status Raw Data:', data);
      const counts = data?.reduce(
        (acc, { status }) => ({
          ...acc,
          [status]: (acc[status] || 0) + 1,
        }),
        { active: 0, idle: 0, gone: 0 }
      ) || { active: 0, idle: 0, gone: 0 };
      console.log('Client Status Counts:', counts);
      return counts;
    },
    enabled: isAdmin,
  });

  const { data: taskStatusData, isLoading: taskStatusLoading, error: taskStatusError } = useQuery({
    queryKey: ['taskStatus'],
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from('tasks')
          .select('status')
          .in('status', ['requirements', 'quote', 'approved', 'progress', 'submitted', 'feedback', 'complete']),
        5000
      );
      if (error) throw new Error(`Failed to fetch task status: ${error.message}`);
      console.log('Task Status Raw Data:', data);
      const counts = data?.reduce(
        (acc, { status }) => ({
          ...acc,
          [status]: (acc[status] || 0) + 1,
        }),
        {
          requirements: 0,
          quote: 0,
          approved: 0,
          progress: 0,
          submitted: 0,
          feedback: 0,
          complete: 0,
        }
      ) || {
        requirements: 0,
        quote: 0,
        approved: 0,
        progress: 0,
        submitted: 0,
        feedback: 0,
        complete: 0,
      };
      console.log('Task Status Counts:', counts);
      return counts;
    },
    enabled: isAdmin,
  });

  const { data: paymentStatusData, isLoading: paymentStatusLoading, error: paymentStatusError } = useQuery({
    queryKey: ['paymentStatus'],
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from('payments')
          .select('status')
          .in('status', ['due', 'invoiced', 'pending', 'received', 'overdue']),
        5000
      );
      if (error) throw new Error(`Failed to fetch payment status: ${error.message}`);
      console.log('Payment Status Raw Data:', data);
      const counts = data?.reduce(
        (acc, { status }) => ({
          ...acc,
          [status]: (acc[status] || 0) + 1,
        }),
        { due: 0, invoiced: 0, pending: 0, received: 0, overdue: 0 }
      ) || { due: 0, invoiced: 0, pending: 0, received: 0, overdue: 0 };
      console.log('Payment Status Counts:', counts);
      return counts;
    },
    enabled: isAdmin,
  });

  // Client dashboard queries
  const { data: clientTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['clientTasks', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await withTimeout(
        supabase.from('tasks').select('*').eq('client_id', clientId),
        5000
      );
      if (error) throw new Error(`Failed to fetch client tasks: ${error.message}`);
      console.log('Client Tasks:', data);
      return (
        data?.map(task => ({
          ...task,
          due_date: task.due_date ? new Date(task.due_date) : null,
          created_at: new Date(task.created_at),
          updated_at: new Date(task.updated_at),
        })) || []
      );
    },
    enabled: !!clientId,
  });

  const { data: clientPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['clientPayments', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await withTimeout(
        supabase.from('payments').select('*').eq('client_id', clientId),
        5000
      );
      if (error) throw new Error(`Failed to fetch client payments: ${error.message}`);
      console.log('Client Payments:', data);
      return (
        data?.map(payment => ({
          ...payment,
          due_date: payment.due_date ? new Date(payment.due_date) : null,
          invoiced_at: payment.invoiced_at ? new Date(payment.invoiced_at) : null,
          received_at: payment.received_at ? new Date(payment.received_at) : null,
          created_at: new Date(payment.created_at),
          updated_at: new Date(payment.updated_at),
        })) || []
      );
    },
    enabled: !!clientId,
  });

  // Admin stat cards
  const statCards = React.useMemo(
    () => [
      {
        title: 'Total Clients',
        value: totalClients || 0,
        change: 0,
        trend: 'neutral',
        icon: <Users className="h-5 w-5 text-blue-500" />,
        color: 'bg-blue-50',
      },
      {
        title: 'Active Tasks',
        value: activeTasks || 0,
        change: 0,
        trend: 'neutral',
        icon: <FileText className="h-5 w-5 text-purple-500" />,
        color: 'bg-purple-50',
      },
      {
        title: 'Pending Payments',
        value: pendingPayments || 0,
        change: 0,
        trend: 'neutral',
        icon: <DollarSign className="h-5 w-5 text-green-500" />,
        color: 'bg-green-50',
      },
      {
        title: 'Completed Tasks',
        value: completedTasks || 0,
        change: 0,
        trend: 'neutral',
        icon: <CheckCircle className="h-5 w-5 text-amber-500" />,
        color: 'bg-amber-50',
      },
      {
        title: 'Overdue Payments',
        value: overduePayments || 0,
        change: 0,
        trend: 'neutral',
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        color: 'bg-red-50',
      },
    ],
    [totalClients, activeTasks, pendingPayments, completedTasks, overduePayments]
  );

  // Client stat cards
  const clientStatCards = React.useMemo(() => {
    if (!clientTasks || !clientPayments) return [];

    const activeTasksCount = clientTasks.filter(task => task.status !== 'complete').length;
    const completedTasksCount = clientTasks.filter(task => task.status === 'complete').length;
    const pendingPaymentsCount = clientPayments.filter(payment =>
      ['pending', 'due', 'invoiced'].includes(payment.status)
    ).length;
    const overduePaymentsCount = clientPayments.filter(payment => payment.status === 'overdue').length;

    return [
      {
        title: 'Your Active Tasks',
        value: activeTasksCount,
        icon: <FileText className="h-5 w-5 text-purple-500" />,
        color: 'bg-purple-50',
      },
      {
        title: 'Completed Tasks',
        value: completedTasksCount,
        icon: <CheckCircle className="h-5 w-5 text-amber-500" />,
        color: 'bg-amber-50',
      },
      {
        title: 'Pending Payments',
        value: pendingPaymentsCount,
        icon: <DollarSign className="h-5 w-5 text-green-500" />,
        color: 'bg-green-50',
      },
      {
        title: 'Overdue Payments',
        value: overduePaymentsCount,
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        color: 'bg-red-50',
      },
    ];
  }, [clientTasks, clientPayments]);

  const renderClientTask = (task: any) => {
    const getStatusClass = (status: string) => {
      switch (status) {
        case 'requirements': return 'bg-purple-100 text-purple-800';
        case 'quote': return 'bg-blue-100 text-blue-800';
        case 'approved': return 'bg-green-100 text-green-800';
        case 'progress': return 'bg-amber-100 text-amber-800';
        case 'submitted': return 'bg-cyan-100 text-cyan-800';
        case 'feedback': return 'bg-pink-100 text-pink-800';
        case 'complete': return 'bg-emerald-100 text-emerald-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div key={task.id} className="p-4 border-b last:border-b-0">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{task.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          </div>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(task.status)}`}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <div>Due: {task.due_date ? format(task.due_date, 'MMM d, yyyy') : 'Not set'}</div>
          <div>Est. Hours: {task.estimated_hours || 'N/A'}</div>
        </div>
      </div>
    );
  };

  const renderClientInvoice = (payment: any) => {
    const getStatusClass = (status: string) => {
      switch (status) {
        case 'received': return 'bg-green-100 text-green-800';
        case 'pending': return 'bg-amber-100 text-amber-800';
        case 'due': return 'bg-blue-100 text-blue-800';
        case 'invoiced': return 'bg-purple-100 text-purple-800';
        case 'overdue': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
      <div key={payment.id} className="p-4 border-b last:border-b-0">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Invoice #{payment.invoice_number || payment.id.slice(-5)}</h3>
            <p className="text-sm text-gray-500 mt-1">
              For: {clientTasks?.find(task => task.id === payment.task_id)?.title || 'Unknown Task'}
            </p>
          </div>
          <div className="text-right">
            <div className="font-semibold">{formatCurrency(payment.amount)}</div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(payment.status)}`}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <div>Due: {payment.due_date ? format(payment.due_date, 'MMM d, yyyy') : 'Not set'}</div>
          {payment.status !== 'received' && (
            <button
              onClick={() => handlePayInvoice(payment)}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-1 px-2 rounded"
            >
              Pay Now
            </button>
          )}
        </div>
      </div>
    );
  };

  const handlePayInvoice = (payment: any) => {
    window.open(`https://www.paypal.com/checkoutnow?token=demo-${payment.id}`, '_blank');
  };

  if (isAdmin) {
    // Admin dashboard
    const isStatsLoading =
      clientsLoading ||
      activeTasksLoading ||
      completedTasksLoading ||
      pendingPaymentsLoading ||
      overduePaymentsLoading;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Welcome back, {user?.name}!</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.title} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`${stat.color} p-2 rounded-full`}>{stat.icon}</div>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <Spinner />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">Compared to last month</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Client Status */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Client Status</CardTitle>
              <CardDescription>Distribution of clients by status</CardDescription>
            </CardHeader>
            <CardContent>
              {clientStatusLoading ? (
                <Spinner />
              ) : clientStatusError ? (
                <div className="text-red-500 text-sm">Failed to load client status</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className="status-dot"
                        style={{ backgroundColor: '#10B981', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '8px' }}
                      ></span>
                      <span>Active</span>
                    </div>
                    <span className="font-semibold">{clientStatusData?.active || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className="status-dot"
                        style={{ backgroundColor: '#F59E0B', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '8px' }}
                      ></span>
                      <span>Idle</span>
                    </div>
                    <span className="font-semibold">{clientStatusData?.idle || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className="status-dot"
                        style={{ backgroundColor: '#EF4444', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '8px' }}
                      ></span>
                      <span>Gone</span>
                    </div>
                    <span className="font-semibold">{clientStatusData?.gone || 0}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Status */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Task Status</CardTitle>
              <CardDescription>Distribution of tasks by status</CardDescription>
            </CardHeader>
            <CardContent>
              {taskStatusLoading ? (
                <Spinner />
              ) : taskStatusError ? (
                <div className="text-red-500 text-sm">Failed to load task status</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(taskStatusData || {}).map(([status, value]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span
                          className={`status-dot bg-status-${status}`}
                          style={{
                            backgroundColor: {
                              requirements: '#8B5CF6',
                              quote: '#3B82F6',
                              approved: '#10B981',
                              progress: '#F59E0B',
                              submitted: '#06B6D4',
                              feedback: '#EC4899',
                              complete: '#059669',
                            }[status] || '#6B7280',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            display: 'inline-block',
                            marginRight: '8px',
                          }}
                        ></span>
                        <span className="capitalize">{status.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Distribution of payments by status</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentStatusLoading ? (
                <Spinner />
              ) : paymentStatusError ? (
                <div className="text-red-500 text-sm">Failed to load payment status</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(paymentStatusData || {}).map(([status, value]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span
                          className={`status-dot bg-status-${status}`}
                          style={{
                            backgroundColor: {
                              due: '#3B82F6',
                              invoiced: '#8B5CF6',
                              pending: '#F59E0B',
                              received: '#10B981',
                              overdue: '#EF4444',
                            }[status] || '#6B7280',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            display: 'inline-block',
                            marginRight: '8px',
                          }}
                        ></span>
                        <span className="capitalize">{status}</span>
                      </div>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities and Upcoming Deadlines (static) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest updates from your projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Task completed</p>
                    <p className="text-sm text-muted-foreground">Website redesign for Client XYZ</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <DollarSign className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">Payment received</p>
                    <p className="text-sm text-muted-foreground">$1,200 from Client ABC</p>
                    <p className="text-xs text-muted-foreground">Yesterday</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">New task created</p>
                    <p className="text-sm text-muted-foreground">Mobile app development for Client LMN</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Tasks and payments due soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-red-100 p-2 rounded-full">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">E-commerce website</p>
                      <span className="text-sm text-red-500 font-medium">Tomorrow</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Client PQR</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">Invoice #INV-2023-042</p>
                      <span className="text-sm text-amber-500 font-medium">3 days</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Client ABC - $2,500</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">CRM Integration</p>
                      <span className="text-sm text-blue-500 font-medium">Next week</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Client XYZ</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } else {
    // Client dashboard
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Dashboard</h2>
            <p className="text-muted-foreground">Welcome back, {user?.name}!</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {clientStatCards.map((stat) => (
            <Card key={stat.title} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`${stat.color} p-2 rounded-full`}>{stat.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* My Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Your current projects and their status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {tasksLoading ? (
                <Spinner />
              ) : clientTasks && clientTasks.length > 0 ? (
                <div className="divide-y">{clientTasks.map(renderClientTask)}</div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  You don't have any tasks yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle>My Payments</CardTitle>
              <CardDescription>Your billing history and pending payments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <Spinner />
              ) : clientPayments && clientPayments.length > 0 ? (
                <div className="divide-y">{clientPayments.map(renderClientInvoice)}</div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  You don't have any payments yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
};

export default DashboardPage;