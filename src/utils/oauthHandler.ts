import { supabase } from '../services/supabase';

export const handleOAuthCallback = async (url: string): Promise<{ success: boolean; error?: any }> => {
  try {
    console.log('Processing OAuth callback URL:', url);
    
    // Supabase OAuth in React Native should use PKCE (flowType: 'pkce'), which returns a `code` that must be exchanged.
    // Some legacy/implicit flows may still return tokens directly. We support both.
    let queryParams: URLSearchParams | null = null;
    let fragmentParams: URLSearchParams | null = null;

    // Parse query params (e.g. ?code=...&state=... or ?error=...)
    if (url.includes('?')) {
      const queryString = url.split('?')[1]?.split('#')[0] ?? '';
      queryParams = new URLSearchParams(queryString);
    }

    // Parse hash params (e.g. #access_token=...&refresh_token=...)
    if (url.includes('#')) {
      const hashFragment = url.split('#')[1] ?? '';
      fragmentParams = new URLSearchParams(hashFragment);
    }

    const getParam = (key: string) =>
      queryParams?.get(key) ?? fragmentParams?.get(key);

    const error = getParam('error');
    const error_description = getParam('error_description');
    const code = getParam('code');
    const access_token = getParam('access_token');
    const refresh_token = getParam('refresh_token');
    
    // Check for errors from the OAuth provider
    if (error) {
      console.error('OAuth error:', error, error_description);
      return { success: false, error: error_description || error };
    }
    
    // Preferred: PKCE code exchange
    if (code) {
      console.log('Exchanging OAuth code for session...');
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError);
        return { success: false, error: exchangeError };
      }

      console.log('Session established successfully (PKCE):', data?.session?.user?.email);
      return { success: true };
    }

    // Fallback: implicit flow tokens
    if (access_token && refresh_token) {
      console.log('Setting session with tokens (implicit flow)...');

      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        console.error('Error setting session:', sessionError);
        return { success: false, error: sessionError };
      }

      console.log('Session set successfully (implicit):', data?.session?.user?.email);
      return { success: true };
    }

    console.error('Missing auth params:', {
      hasCode: !!code,
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      url,
    });
    return { success: false, error: 'Invalid authentication response' };
    
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return { success: false, error };
  }
};

export const extractOAuthParams = (url: string): { 
  access_token?: string; 
  refresh_token?: string; 
  code?: string;
  error?: string; 
  error_description?: string; 
} => {
  try {
    let queryParams: URLSearchParams | null = null;
    let fragmentParams: URLSearchParams | null = null;

    if (url.includes('?')) {
      const queryString = url.split('?')[1]?.split('#')[0] ?? '';
      queryParams = new URLSearchParams(queryString);
    }

    if (url.includes('#')) {
      const hashFragment = url.split('#')[1] ?? '';
      fragmentParams = new URLSearchParams(hashFragment);
    }

    const getParam = (key: string) =>
      queryParams?.get(key) ?? fragmentParams?.get(key);
    
    return {
      access_token: getParam('access_token') || undefined,
      refresh_token: getParam('refresh_token') || undefined,
      code: getParam('code') || undefined,
      error: getParam('error') || undefined,
      error_description: getParam('error_description') || undefined,
    };
  } catch (error) {
    console.error('Error extracting OAuth params:', error);
    return {};
  }
}; 