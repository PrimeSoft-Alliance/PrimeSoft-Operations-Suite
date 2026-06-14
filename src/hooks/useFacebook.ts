import { useEffect, useState } from 'react';

declare global {
  interface Window {
    FB: any;
  }
}

export const useFacebook = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initFacebook = () => {
      if (window.FB) {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });
        setIsReady(true);
      }
    };

    if (window.FB) {
      initFacebook();
    } else {
      window.addEventListener('fbAsyncInit', initFacebook);
    }
    
    return () => {
      window.removeEventListener('fbAsyncInit', initFacebook);
    };
  }, []);

  const checkLoginStatus = (callback: (response: any) => void) => {
    if (window.FB) {
      window.FB.getLoginStatus((response: any) => {
        callback(response);
      });
    }
  };

  const login = (callback: (response: any) => void) => {
    if (window.FB) {
      window.FB.login((response: any) => {
        callback(response);
      }, {scope: 'public_profile,email'});
    }
  };

  return { isReady, checkLoginStatus, login };
};
