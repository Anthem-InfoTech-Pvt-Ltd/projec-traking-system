
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user, isAuthenticated } = useAuth();
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };
  console.log('User:', user);
  console.log('Is Authenticated:', isAuthenticated);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="bg-red-100 p-4 inline-block rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-12 h-12 text-red-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold">Unauthorized Access</h1>
        <p className="text-gray-600">
          You don't have permission to access this page. This could be because you don't have the required role or privileges.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button 
            onClick={handleBackToDashboard}
            className="bg-anthem-purple hover:bg-anthem-darkPurple"
          >
            Back to Dashboard
          </Button>
          <Button 
            variant="outline"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
