import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { useNotification } from "@/context/NotificationContext";

export const Notifications = () => {
  const { user } = useAuth();
  const { fetchNotifications } = useNotification();
  const defaultPreferences = {
    email_tasks: true,
    email_clients: true,
    email_payments: true,
    app_tasks: true,
    app_clients: true,
    app_payments: true,
  };
  const [preferences, setPreferences] = React.useState(defaultPreferences);

  useEffect(() => {
    if (user?.notification_preferences) {
      setPreferences({
        ...defaultPreferences,
        ...user.notification_preferences,
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("users")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();
      if (error) {
        return console.error("Failed to fetch preferences:", error);
      }
      setPreferences({
        ...defaultPreferences,
        ...data.notification_preferences,
      });
    };
    fetchPreferences();
  }, [user]);

  const handleToggle = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update preferences.");
    } else {
      fetchNotifications();
      toast.success("Notification preferences updated!");
    }
  };

  const handleReset = async () => {
    await supabase
      .from("users")
      .update({
        notification_preferences: defaultPreferences,
      })
      .eq("id", user.id);
    setPreferences(defaultPreferences);
    fetchNotifications();
    toast.success("Preferences reset to default.");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how and when you receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Email Notifications</h3>
              {["email_tasks", "email_clients", "email_payments"].map((key) => (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <div className="pt-2 pb-4">
                      <Label htmlFor={key}>
                        {key
                          .replace("email_", "")
                          .replace(/^\w/, (c) => c.toUpperCase())}{" "}
                        Updates
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about {key.replace("email_", "")}.
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={preferences[key]}
                      onCheckedChange={() => handleToggle(key)}
                    />
                  </div>
                  <Separator />
                </div>
              ))}

              <h3 className="text-lg font-medium pt-6">In-App Notifications</h3>
              {["app_tasks", "app_clients", "app_payments"].map((key) => (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <div className="pt-2 pb-4">
                      <Label htmlFor={key}>
                        {key
                          .replace("app_", "")
                          .replace(/^\w/, (c) => c.toUpperCase())}{" "}
                        Updates
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive app notifications about{" "}
                        {key.replace("app_", "")}.
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={preferences[key]}
                      onCheckedChange={() => handleToggle(key)}
                    />
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" className="mr-2" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave}>Save Preferences</Button>
        </CardFooter>
      </Card>
    </>
  );
};

// import React, { useEffect, useState } from "react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
//   CardFooter,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
// import { Switch } from "@/components/ui/switch";
// import { toast } from "sonner";
// import { useAuth } from "@/context/AuthContext";
// import { supabase } from "@/integrations/supabase/client";

// export const Notifications = () => {
//   const { user, isAuthenticated } = useAuth();

//   const defaultPreferences = {
//     email_tasks: true,
//     email_clients: true,
//     email_payments: true,
//     app_tasks: true,
//     app_clients: true,
//     app_payments: true,
//   };

//   const [prefs, setPrefs] = useState(defaultPreferences);

//   useEffect(() => {
//     if (user?.notification_preferences) {
//       setPrefs({ ...defaultPreferences, ...user.notification_preferences });
//     }
//   }, [user]);

//   const handleToggle = (key: string) => {
//     setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
//   };

//   const handleSave = async () => {
//     if (!user) return;

//     const { error } = await supabase
//       .from("users")
//       .update({
//         notification_preferences: prefs,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", user.id);

//     if (error) {
//       console.error("Failed to update preferences:", error);
//       toast.error("Failed to update preferences.");
//     } else {
//       toast.success("Notification preferences updated!");
//     }
//   };

//   const handleReset = () => {
//     setPrefs(defaultPreferences);
//   };
//   return (
//     <>
//       <Card>
//         <CardHeader>
//           <CardTitle>Notification Preferences</CardTitle>
//           <CardDescription>
//             Manage how and when you receive notifications.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form className="space-y-6">
//             <div className="space-y-4">
//               <h3 className="text-lg font-medium">Email Notifications</h3>
//               {["email_tasks", "email_clients", "email_payments"].map((key) => (
//                 <div key={key}>
//                   <div className="flex items-center justify-between">
//                     <div className="space-y-0.5">
//                       <Label htmlFor={key}>
//                         {key
//                           .replace("email_", "")
//                           .replace(/^\w/, (c) => c.toUpperCase())}{" "}
//                         Updates
//                       </Label>
//                       <p className="text-sm text-muted-foreground">
//                         Receive emails about {key.replace("email_", "")}.
//                       </p>
//                     </div>
//                     <Switch
//                       id={key}
//                       checked={prefs[key]}
//                       onCheckedChange={() => handleToggle(key)}
//                     />
//                   </div>
//                   <Separator />
//                 </div>
//               ))}

//               <h3 className="text-lg font-medium mt-6">In-App Notifications</h3>
//               {["app_tasks", "app_clients", "app_payments"].map((key) => (
//                 <div key={key}>
//                   <div className="flex items-center justify-between">
//                     <div className="space-y-0.5">
//                       <Label htmlFor={key}>
//                         {key
//                           .replace("app_", "")
//                           .replace(/^\w/, (c) => c.toUpperCase())}{" "}
//                         Updates
//                       </Label>
//                       <p className="text-sm text-muted-foreground">
//                         Receive app notifications about{" "}
//                         {key.replace("app_", "")}.
//                       </p>
//                     </div>
//                     <Switch
//                       id={key}
//                       checked={prefs[key]}
//                       onCheckedChange={() => handleToggle(key)}
//                     />
//                   </div>
//                   <Separator />
//                 </div>
//               ))}
//             </div>
//           </form>
//         </CardContent>
//         <CardFooter className="flex justify-end">
//           <Button variant="outline" className="mr-2" onClick={handleReset}>
//             Reset to Default
//           </Button>
//           <Button onClick={handleSave}>Save Preferences</Button>
//         </CardFooter>
//       </Card>
//     </>
//   );
// };
