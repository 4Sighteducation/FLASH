import { supabase } from '../services/supabase';

export const handleOAuthCallback = async (url: string): Promise<{ success: boolean; error?: any }> => {
  try {
    console.log('Processing OAuth callback URL:', url);
    
    // Handle different URL formats
    let hashFragment = '';
    
    if (url.includes('#')) {
      // Standard format: scheme://path#fragment
      hashFragment = url.split('#')[1];
    } else if (url.includes('?')) {
      // Sometimes the params come as query params
      const queryString = url.split('?')[1];
      hashFragment = queryString;
    }
    
    if (!hashFragment) {
      console.error('No hash fragment found in URL');
      return { success: false, error: 'No authentication data found' };
    }
    
    // Parse the URL parameters
    const params = new URLSearchParams(hashFragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const error = params.get('error');
    const error_description = params.get('error_description');
    
    // Check for errors from the OAuth provider
    if (error) {
      console.error('OAuth error:', error, error_description);
      return { success: false, error: error_description || error };
    }
    
    // Validate tokens
    if (!access_token || !refresh_token) {
      console.error('Missing tokens:', { access_token: !!access_token, refresh_token: !!refresh_token });
      return { success: false, error: 'Invalid authentication response' };
    }
    
    console.log('Setting session with tokens...');
    
    // Set the session
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });
    
    if (sessionError) {
      console.error('Error setting session:', sessionError);
      return { success: false, error: sessionError };
    }
    
    console.log('Session set successfully:', data);
    return { success: true };
    
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return { success: false, error };
  }
};

export const extractOAuthParams = (url: string): { 
  access_token?: string; 
  refresh_token?: string; 
  error?: string; 
  error_description?: string; 
} => {
  try {
    let hashFragment = '';
    
    if (url.includes('#')) {
      hashFragment = url.split('#')[1];
    } else if (url.includes('?')) {
      hashFragment = url.split('?')[1];
    }
    
    if (!hashFragment) return {};
    
    const params = new URLSearchParams(hashFragment);
    
    return {
      access_token: params.get('access_token') || undefined,
      refresh_token: params.get('refresh_token') || undefined,
      error: params.get('error') || undefined,
      error_description: params.get('error_description') || undefined,
    };
  } catch (error) {
    console.error('Error extracting OAuth params:', error);
    return {};
  }
}; 