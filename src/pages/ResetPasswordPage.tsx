import React, { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, EyeIcon, EyeOffIcon } from 'lucide-react';
import Cookies from 'js-cookie';

const ResetPasswordPage: React.FC = () => {
  const { isAuthenticated, resetPassword, isLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{password?: string; confirmPassword?: string}>({});
  
  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Extract token from URL
  useEffect(() => {
    const hash = window.location.hash; // e.g. "#access_token=xyz"
    const params = new URLSearchParams(hash.slice(1)); // remove the "#"
    const accessToken = params.get('access_token');
  
    if (accessToken) {
      Cookies.set('auth_token', accessToken);
      setToken(accessToken); // Optional if you still want to use token in state
    }
  }, []);
  
  
  const validateForm = () => {
    const newErrors: {password?: string; confirmPassword?: string} = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await resetPassword(token, password);
      setIsSubmitted(true);
      toast({
        title: 'Password reset successful',
        description: 'You can now login with your new password',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reset password',
      });
    }
  };
  
  // Token is required to reset password
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Invalid or Missing Token</CardTitle>
            <CardDescription className="text-center">
              The password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="link" asChild className="w-full">
              <Link to="/forgot-password" className="flex items-center justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to forgot password
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img
              src="images\6123bc56-fe6c-4d47-a531-d13782c5f5c0.png"
              alt="Anthem Infotech"
              className="h-16"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            {!isSubmitted 
              ? "Create a new password for your account" 
              : "Your password has been reset successfully"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="password">New Password</Label>
                   <div className="relative">
                     <Input
                       id="password"
                       type={isPasswordVisible ? "text" : "password"}
                       placeholder="********"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       disabled={isLoading}
                       aria-invalid={!!errors.password}
                       className="pr-10"
                     />
                     <button
                       type="button"
                       onClick={() => setIsPasswordVisible((prev) => !prev)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                       tabIndex={-1}
                     >
                       {isPasswordVisible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                     </button>
                   </div>
                   {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                 </div>
           
                 {/* Confirm Password Field */}
                 <div className="space-y-2">
                   <Label htmlFor="confirmPassword">Confirm Password</Label>
                   <div className="relative">
                     <Input
                       id="confirmPassword"
                       type={isConfirmPasswordVisible ? "text" : "password"}
                       placeholder="********"
                       value={confirmPassword}
                       onChange={(e) => setConfirmPassword(e.target.value)}
                       disabled={isLoading}
                       aria-invalid={!!errors.confirmPassword}
                       className="pr-10"
                     />
                     <button
                       type="button"
                       onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                       tabIndex={-1}
                     >
                       {isConfirmPasswordVisible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                     </button>
                   </div>
                   {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                 </div>
           
                 {/* Submit Button */}
                 <Button
                   type="submit"
                   className="w-full bg-anthem-purple hover:bg-anthem-darkPurple"
                   disabled={isLoading}
                 >
                   {isLoading ? (
                     <span className="flex items-center justify-center">
                       <svg
                         className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                         xmlns="http://www.w3.org/2000/svg"
                         fill="none"
                         viewBox="0 0 24 24"
                       >
                         <circle
                           className="opacity-25"
                           cx="12"
                           cy="12"
                           r="10"
                           stroke="currentColor"
                           strokeWidth="4"
                         ></circle>
                         <path
                           className="opacity-75"
                           fill="currentColor"
                           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                         ></path>
                       </svg>
                       Resetting password...
                     </span>
                   ) : (
                     "Reset Password"
                   )}
                 </Button>
               </form>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4">
                Your password has been reset successfully.
              </p>
              <Button
                variant="default"
                className="mt-4 bg-anthem-purple hover:bg-anthem-darkPurple"
                asChild
              >
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
        {!isSubmitted && (
          <CardFooter>
            <Button variant="link" asChild className="w-full">
              <Link to="/login" className="flex items-center justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default ResetPasswordPage;