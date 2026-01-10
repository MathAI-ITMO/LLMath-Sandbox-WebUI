import { ref, reactive } from 'vue';
import axios from 'axios';
import { type GeolinProblemData } from './useProblemApi';

const MATHLLM_BACKEND_API_URL = '/app';

export function useGeolinProxy() {
  const loading = ref(false);
  const response = reactive<{ loadFromGeolin: GeolinProblemData | null }>({
    loadFromGeolin: null
  });

  const checkResultModal = reactive({
    show: false,
    problemStatement: '',
    solution: '',
    extractedAnswer: '',
    checkResult: null as any,
    hash: '',
    seed: undefined as number | undefined
  });

  async function loadFromGeolin(prefix: string) {
    if (!prefix) {
      response.loadFromGeolin = { error: "Префикс GeoLin не может быть пустым." };
      return response.loadFromGeolin;
    }

    loading.value = true;
    response.loadFromGeolin = null;

    try {
      const url = `${MATHLLM_BACKEND_API_URL}/api/tasks/problems?prefix=${encodeURIComponent(prefix)}`
      const fetchResponse = await fetch(url, {
        credentials: 'include'
      });
      const data = await fetchResponse.json();

      if (!fetchResponse.ok) {
        const errorMsg = data.error || `HTTP error! status: ${fetchResponse.status}`;
        console.error("Ошибка от GeoLin API:", data);
        throw new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      }

      response.loadFromGeolin = data;
      return data;
    } catch (e: any) {
      console.error("Ошибка при загрузке из GeoLin прокси:", e);
      response.loadFromGeolin = { error: e.message || 'Неизвестная ошибка при запросе к GeoLin прокси' };
      return response.loadFromGeolin;
    } finally {
      loading.value = false;
    }
  }

  async function checkSolution(statement: string, solution: string, hash: string, seed?: number) {
    if (!statement) {
      throw new Error('Поле "Условие" не может быть пустым для проверки решения');
    }

    if (!solution) {
      throw new Error('Поле "Решение LLM" не может быть пустым для проверки');
    }

    if (!hash) {
      throw new Error('Hash задачи отсутствует. Невозможно проверить решение.');
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

      // Шаг 1: Извлекаем ответ из решения с помощью LLM
      const extractRequestData = {
        problemStatement: statement,
        solution: solution
      };

      const extractResponse = await client.post('/api/v1/llm/extract-answer', extractRequestData);
      const extractedAnswer = extractResponse.data.extractedAnswer;

      if (!extractedAnswer) {
        throw new Error('LLM не смог извлечь ответ из решения - получен пустой ответ');
      }

      // Шаг 2: Проверяем извлеченный ответ через GeoLin
      const checkRequestData = {
        hash: hash,
        answerAttempt: extractedAnswer,
        seed: seed
      };

      const checkResponse = await client.post('/api/v1/geolin-proxy/check-answer-direct', checkRequestData);
      const checkResult = checkResponse.data;

      // Обновляем модальное окно результатов
      checkResultModal.show = true;
      checkResultModal.problemStatement = statement;
      checkResultModal.solution = solution;
      checkResultModal.extractedAnswer = extractedAnswer;
      checkResultModal.checkResult = checkResult;
      checkResultModal.hash = hash;
      checkResultModal.seed = seed;

      return checkResult;
    } catch (error) {
      console.error('❌ Ошибка при проверке решения:', error);

      if (axios.isAxiosError(error)) {
        console.error('📋 Детали ошибки axios:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }

      let errorMessage = 'Неизвестная ошибка';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.status === 401
          ? 'Ошибка авторизации. Возможно, вам нужно выполнить вход в систему.'
          : `Ошибка: ${error.response?.status || 'сетевая ошибка'} - ${JSON.stringify(error.response?.data) || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(`Ошибка при проверке решения: ${errorMessage}`);
    } finally {
      loading.value = false;
    }
  }

  function closeCheckResultModal() {
    checkResultModal.show = false;
  }

  return {
    loading,
    response,
    checkResultModal,
    loadFromGeolin,
    checkSolution,
    closeCheckResultModal,
  };
}
