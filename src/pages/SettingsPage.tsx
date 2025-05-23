import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Moon, Settings, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

const SettingsPage: React.FC = () => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    avatar_url: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          return;
        }

        if (data) {
          setProfileData({
            name: data.name || user.user_metadata?.name || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            role: data.role || "",
            avatar_url: data.avatar_url || user.user_metadata?.avatar_url || "",
          });
        }
      };

      fetchUserProfile();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "projectclientmanagemnetsystem");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dmyq2ymj9/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      throw error;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);

    try {
      let avatarUrl = profileData.avatar_url;

      // Upload new avatar if selected
      if (selectedFile) {
        avatarUrl = await uploadToCloudinary(selectedFile);
        // Immediately update the local state with the new URL
        setProfileData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      }

      // Update user profile in Supabase
      const updates = {
        id: user?.id,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        role: profileData.role,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("users").upsert(updates);

      if (error) throw error;

      if (profileData.email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profileData.email,
        });

        if (authError) throw authError;
      }

      toast.success("Profile updated successfully");
      setSelectedFile(null); // Clear the selected file after successful upload
      setUploadProgress(0);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsSubmittingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [id]: value,
    }));
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
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
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
              <CardDescription>
                Manage your account information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 relative">
                      <Avatar className="w-full h-full">
                        {/* Show selected file preview OR saved avatar URL */}
                        {selectedFile ? (
                          <AvatarImage
                            src={URL.createObjectURL(selectedFile)}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <AvatarImage
                            src={profileData.avatar_url || "/placeholder.svg"}
                            className="object-cover w-full h-full"
                          />
                        )}
                        <AvatarFallback>
                          {profileData.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>

                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {uploadProgress}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Label
                        htmlFor="avatar-upload"
                        className="text-sm bg-blue-900 px-3 py-2 rounded hover:underline text-white cursor-pointer"
                      >
                        {selectedFile ? "Change Image" : "Change Avatar"}
                      </Label>
                    </div>

                    {selectedFile && (
                      <p className="text-xs text-muted-foreground text-center max-w-[150px] truncate">
                        {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          value={profileData.role}
                          onChange={handleProfileChange}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmittingProfile}>
                    {isSubmittingProfile ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </form>

              <Separator className="my-6" />

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        className="pr-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        className="pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmittingPassword}>
                    {isSubmittingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ... (keep the existing notifications and appearance tabs) ... */}
      </Tabs>
    </div>
  );
};

export default SettingsPage;

// <TabsContent value="notifications">
//           <Card>
//             <CardHeader>
//               <CardTitle>Notification Preferences</CardTitle>
//               <CardDescription>Manage how and when you receive notifications.</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
//                 <div className="space-y-4">
//                   <h3 className="text-lg font-medium">Email Notifications</h3>
//                   <div className="space-y-4">
//                     <div className="flex items-center justify-between">
//                       <div className="space-y-0.5">
//                         <Label htmlFor="email-tasks">Task Updates</Label>
//                         <p className="text-sm text-muted-foreground">
//                           Receive emails when tasks are updated or completed.
//                         </p>
//                       </div>
//                       <Switch id="email-tasks" defaultChecked />
//                     </div>
//                     <Separator />
//                     <div className="flex items-center justify-between">
//                       <div className="space-y-0.5">
//                         <Label htmlFor="email-clients">Client Activity</Label>
//                         <p className="text-sm text-muted-foreground">
//                           Receive emails about client actions and feedback.
//                         </p>
//                       </div>
//                       <Switch id="email-clients" defaultChecked />
//                     </div>
//                     <Separator />
//                     <div className="flex items-center justify-between">
//                       <div className="space-y-0.5">
//                         <Label htmlFor="email-payments">Payment Updates</Label>
//                         <p className="text-sm text-muted-foreground">
//                           Receive emails about payment status changes.
//                         </p>
//                       </div>
//                       <Switch id="email-payments" defaultChecked />
//                     </div>
//                   </div>
//                 </div>
//               </form>
//             </CardContent>
//             <CardFooter className="flex justify-end">
//               <Button variant="outline" className="mr-2">
//                 Reset to Default
//               </Button>
//               <Button>Save Preferences</Button>
//             </CardFooter>
//           </Card>
//         </TabsContent>

//         <TabsContent value="appearance">
//           <Card>
//             <CardHeader>
//               <CardTitle>Appearance Settings</CardTitle>
//               <CardDescription>Customize the look and feel of the application.</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
//                 <div className="space-y-4">
//                   <h3 className="text-lg font-medium">Theme</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                     <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
//                       <div className="h-20 w-full bg-background border rounded-md"></div>
//                       <span className="text-sm font-medium">Light</span>
//                     </div>
//                     <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-accent cursor-pointer bg-accent">
//                       <div className="h-20 w-full bg-gray-900 border rounded-md"></div>
//                       <span className="text-sm font-medium">Dark</span>
//                     </div>
//                     <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
//                       <div className="h-20 w-full bg-gradient-to-b from-background to-gray-900 border rounded-md"></div>
//                       <span className="text-sm font-medium">System</span>
//                     </div>
//                   </div>
//                 </div>
//               </form>
//             </CardContent>
//             <CardFooter className="flex justify-end">
//               <Button variant="outline" className="mr-2">
//                 Reset to Default
//               </Button>
//               <Button>Save Settings</Button>
//             </CardFooter>
//           </Card>
//         </TabsContent>
