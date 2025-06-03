import React from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Moon, Settings, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
export const Appearance = () => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Appearance Settings</CardTitle>
          <CardDescription>
            Customize the look and feel of the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <div className="h-20 w-full bg-background border rounded-md"></div>
                  <span className="text-sm font-medium">Light</span>
                </div>

                <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-accent cursor-pointer bg-accent">
                  <div className="h-20 w-full bg-gray-900 border rounded-md"></div>
                  <span className="text-sm font-medium">Dark</span>
                </div>

                <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <div className="h-20 w-full bg-gradient-to-b from-background to-gray-900 border rounded-md"></div>
                  <span className="text-sm font-medium">System</span>
                </div>
              </div>

              <h3 className="text-lg font-medium mt-6">Sidebar</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="collapsed-sidebar">
                      Collapsed by default
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Start with a collapsed sidebar when you login.
                    </p>
                  </div>
                  <Switch id="collapsed-sidebar" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sticky-sidebar">Sticky sidebar</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep the sidebar fixed when scrolling.
                    </p>
                  </div>
                  <Switch id="sticky-sidebar" defaultChecked />
                </div>
              </div>

              <h3 className="text-lg font-medium mt-6">Density</h3>
              <div className="space-y-1">
                <Label>Interface density</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button variant="outline" className="justify-center">
                    Compact
                  </Button>
                  <Button variant="secondary" className="justify-center">
                    Default
                  </Button>
                  <Button variant="outline" className="justify-center">
                    Comfortable
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" className="mr-2">
            Reset to Default
          </Button>
          <Button>Save Settings</Button>
        </CardFooter>
      </Card>
    </>
  );
};
