import axios from 'axios';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

interface LoginResponse {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
    blocked: boolean;
  };
}

const getFromStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const setInStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
};

const removeFromStorage = (key: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
};

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const { data } = await axios.post(`${STRAPI_URL}/api/auth/local`, {
        identifier: email,
        password: password,
      });
      
      if (data.jwt) {
        setInStorage('strapi_jwt', data.jwt);
      }
      
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Login failed');
    }
  },

  register: async (username: string, email: string, password: string) => {
    try {
      const { data } = await axios.post(`${STRAPI_URL}/api/auth/local/register`, {
        username,
        email,
        password,
      });
      
      if (data.jwt) {
        setInStorage('strapi_jwt', data.jwt);
      }
      
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Registration failed');
    }
  },

  getCurrentUser: async () => {
    const jwt = getFromStorage('strapi_jwt');
    
    if (!jwt) {
      return null;
    }

    try {
      const { data } = await axios.get(`${STRAPI_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
      
      return data;
    } catch (error) {
      removeFromStorage('strapi_jwt');
      return null;
    }
  },

  logout: () => {
    removeFromStorage('strapi_jwt');
  },

  getToken: (): string | null => {
    return getFromStorage('strapi_jwt');
  },
};