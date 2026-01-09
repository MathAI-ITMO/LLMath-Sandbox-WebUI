import { ref } from 'vue';
import axios from 'axios';

const MATHLLM_BACKEND_API_URL = '/app';

export function useLlmSolution() {
  const loading = ref(false);
  const activeForm = ref<'management' | 'database' | 'update' | 'edit' | null>(null);

  async function getLlmSolution(problemStatement: string) {
    if (!problemStatement) {
      throw new Error('Поле "Условие" не может быть пустым для получения решения LLM');
    }

    loading.value = true;

    try {
      const client = axios.create({
        baseURL: MATHLLM_BACKEND_API_URL,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await client.post('/api/v1/llm/solve-problem', {
        problemDescription: problemStatement
      });

      return response.data.solution;
    } catch (error) {
      console.error('Ошибка при получении решения от LLM:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.status === 401
          ? 'Ошибка авторизации. Возможно, вам нужно выполнить вход в систему.'
          : `Ошибка: ${error.response?.status || 'сетевая ошибка'} - ${error.response?.data || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      throw new Error(`Ошибка при получении решения от LLM: ${errorMessage}`);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    activeForm,
    getLlmSolution
  };
}