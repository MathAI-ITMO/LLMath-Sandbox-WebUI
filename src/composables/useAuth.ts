import { ref } from 'vue';
import Cookies from 'js-cookie';
import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { LoginRequestDto } from '@/types/BackendDtos';

interface RegisterErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: {
    [key: string]: string[];
  };
  [key: string]: any;
}

interface RegisterRequestDto {
  email: string;
  password: string;
  inviteCode: string;
}

const baseUrl = import.meta.env.VITE_MATHLLM_BACKEND_ADDRESS;

const isAuthenticatedState = ref(false);

export function useAuth() {
  const client: AxiosInstance = axios.create({
    baseURL: baseUrl,
  });

  async function checkAuth(): Promise<boolean> {
    try {
      await client.get('/api/Auth/me', { withCredentials: true });
      isAuthenticatedState.value = true;
      return true;
    } catch (error) {
      isAuthenticatedState.value = false;
      return false;
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const dto: LoginRequestDto = { email, password };
    await client.post('/api/auth/login', dto, { withCredentials: true });
    isAuthenticatedState.value = true;
  }

  async function register(email: string, password: string, inviteCode: string): Promise<{ success: boolean; error?: RegisterErrorResponse }> {
    try {
      const dto: RegisterRequestDto = { email, password, inviteCode };
      await client.post('/api/auth/register', dto);
      await login(email, password);
      return { success: true };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<RegisterErrorResponse>;
        if (axiosError.response?.data) {
          return {
            success: false,
            error: axiosError.response.data
          };
        }
      }
      throw error;
    }
  }

  async function logout(): Promise<void> {
    try {
      await client.post('/api/Auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      Cookies.remove('.AspNetCore.Identity.Application');
      isAuthenticatedState.value = false;
    }
  }

  checkAuth();

  return {
    login,
    logout,
    register,
    checkAuth,
    isAuthenticated: isAuthenticatedState
  };
}
