import React, { useEffect } from 'react';
import { useFacebook } from '../../hooks/useFacebook';

interface FacebookLoginProps {
  onLoginSuccess: (response: any) => void;
}

export const FacebookLoginButton: React.FC<FacebookLoginProps> = ({ onLoginSuccess }) => {
  const { isReady, login } = useFacebook();

  const handleLogin = () => {
    if (isReady) {
      login((response: any) => {
        if (response.status === 'connected') {
          onLoginSuccess(response);
        } else {
          console.log('User cancelled login or did not fully authorize.');
        }
      });
    }
  };

  if (!isReady) {
    return <button disabled className="bg-gray-400 text-white font-bold py-2 px-4 rounded">Loading...</button>;
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-[#4267B2] hover:bg-[#365899] text-white font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
      Login with Facebook
    </button>
  );
};
