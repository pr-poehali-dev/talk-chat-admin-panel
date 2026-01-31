export const API_URLS = {
  AUTH: 'https://functions.poehali.dev/02e6ae02-1454-4fba-9531-4a331c6dfe2e',
  USERS: 'https://functions.poehali.dev/5af04b84-eb6c-4267-827e-f8e8b0d9427f',
  CHATS: 'https://functions.poehali.dev/2a51f162-9e0a-4c84-838b-f2f718282d63',
  UPLOAD: 'https://functions.poehali.dev/dee48011-b3b2-44a3-a44d-de5b1c60c479'
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
};

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
