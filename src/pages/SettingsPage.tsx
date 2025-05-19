
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Moon, Settings, User, Eye, EyeOff } from 'lucide-react';


const SettingsPage: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { user } = useAuth();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile settings saved');
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Notification preferences saved');
  };

  const handleSaveAppearance = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Appearance settings saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account information.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex flex-col items-center space-y-2">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src="/placeholder.svg" alt={user?.name || 'User'} />
                      <AvatarFallback>{user?.name?.substring(0, 2) || 'U'}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm">Change Avatar</Button>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" defaultValue={user?.name || 'Admin User'} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email || 'admin@example.com'} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" defaultValue="(555) 123-4567" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input id="role" defaultValue="Administrator" disabled />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Current Password */}
  <div className="space-y-2">
    <Label htmlFor="current-password">Current Password</Label>
    <div className="relative">
      <Input
        id="current-password"
        type={showCurrentPassword ? 'text' : 'password'}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowCurrentPassword((prev) => !prev)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
        tabIndex={-1}
      >
        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>

  {/* Spacer for alignment (can be removed or used as needed) */}
  <div></div>

  {/* New Password */}
  <div className="space-y-2">
    <Label htmlFor="new-password">New Password</Label>
    <div className="relative">
      <Input
        id="new-password"
        type={showNewPassword ? 'text' : 'password'}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowNewPassword((prev) => !prev)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
        tabIndex={-1}
      >
        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>

  {/* Confirm New Password */}
  <div className="space-y-2">
    <Label htmlFor="confirm-password">Confirm New Password</Label>
    <div className="relative">
      <Input
        id="confirm-password"
        type={showConfirmPassword ? 'text' : 'password'}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowConfirmPassword((prev) => !prev)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
        tabIndex={-1}
      >
        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>
</div>

                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" className="mr-2">Cancel</Button>
              <Button onClick={handleSaveProfile}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how and when you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-tasks">Task Updates</Label>
                        <p className="text-sm text-muted-foreground">Receive emails when tasks are updated or completed.</p>
                      </div>
                      <Switch id="email-tasks" defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-clients">Client Activity</Label>
                        <p className="text-sm text-muted-foreground">Receive emails about client actions and feedback.</p>
                      </div>
                      <Switch id="email-clients" defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-payments">Payment Updates</Label>
                        <p className="text-sm text-muted-foreground">Receive emails about payment status changes.</p>
                      </div>
                      <Switch id="email-payments" defaultChecked />
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mt-6">In-App Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="app-tasks">Task Updates</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications when tasks are updated or completed.</p>
                      </div>
                      <Switch id="app-tasks" defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="app-clients">Client Activity</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications about client actions and feedback.</p>
                      </div>
                      <Switch id="app-clients" defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="app-payments">Payment Updates</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications about payment status changes.</p>
                      </div>
                      <Switch id="app-payments" defaultChecked />
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" className="mr-2">Reset to Default</Button>
              <Button onClick={handleSaveNotifications}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAppearance} className="space-y-6">
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
                        <Label htmlFor="collapsed-sidebar">Collapsed by default</Label>
                        <p className="text-sm text-muted-foreground">Start with a collapsed sidebar when you login.</p>
                      </div>
                      <Switch id="collapsed-sidebar" />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sticky-sidebar">Sticky sidebar</Label>
                        <p className="text-sm text-muted-foreground">Keep the sidebar fixed when scrolling.</p>
                      </div>
                      <Switch id="sticky-sidebar" defaultChecked />
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mt-6">Density</h3>
                  <div className="space-y-1">
                    <Label>Interface density</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button variant="outline" className="justify-center">Compact</Button>
                      <Button variant="secondary" className="justify-center">Default</Button>
                      <Button variant="outline" className="justify-center">Comfortable</Button>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" className="mr-2">Reset to Default</Button>
              <Button onClick={handleSaveAppearance}>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
