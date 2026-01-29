import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * This component handles the redirect from password recovery emails.
 * It captures the recovery tokens from the URL and redirects to /auth with the proper mode.
 */
const ResetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleRecoveryRedirect = async () => {
      // Get hash from URL
      const hash = window.location.hash;
      
      if (hash) {
        // Redirect to /auth with the hash intact so Auth can process it
        navigate(`/auth${hash}`, { replace: true });
      } else {
        // No recovery tokens, redirect to auth with reset-password mode
        // This handles the case where the link might have been processed already
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User has a session, redirect to auth in reset-password mode
          navigate('/auth?mode=reset-password', { replace: true });
        } else {
          // No session, redirect to login
          navigate('/auth', { replace: true });
        }
      }
    };

    handleRecoveryRedirect();
  }, [navigate]);

  // This component just handles the redirect, shows nothing
  return null;
};

export default ResetPassword;
