import { useAuth } from '../contexts/AuthContext';

const ADMIN_EMAILS = [
  'tony@vespa.academy',
  'admin@vespa.academy',
  'tonyden10@gmail.com',
];

export function useAdminAccess() {
  const { user } = useAuth();

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  return {
    isAdmin,
    adminEmail: user?.email,
  };
}

