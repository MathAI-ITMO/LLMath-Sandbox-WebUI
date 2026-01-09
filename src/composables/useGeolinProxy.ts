import { ref, reactive } from 'vue';
import axios from 'axios';
import { type GeolinProblemData } from './useProblemApi';

export function useGeolinProxy() {
  const isCheckResultModalOpen = ref(false);
  const checkResultModal = reactive({
    isValid: false,
    message: '',
    extractedAnswer: '',
    seed: null as number | null,
    solution: '',
    hash: '',
    checkResult: null as any
  });

  async function loadFromGeolin(prefix: string) {
    if (!prefix) return { error: true, message: 'Укажите префикс GeoLin' };
    try {
      const response = await axios.get<GeolinProblemData>('/app/api/v1/geolin-proxy/problem-data', {
        params: { prefix },
        withCredentials: true
      });
      return response.data;
    } catch (e: any) {
      console.error('Error loading from GeoLin:', e);
      return { error: true, details: e };
    }
  }

  async function checkSolution(statement: string, solution: string, hash: string, seed?: number) {
    try {
      const client = axios.create({
        baseURL: '/app',
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

      checkResultModal.isValid = checkResult.isCorrect;
      checkResultModal.message = checkResult.message || (checkResult.isCorrect ? 'Решение верно!' : 'Решение неверно.');
      checkResultModal.extractedAnswer = extractedAnswer;
      checkResultModal.seed = seed || null;
      checkResultModal.solution = solution;
      checkResultModal.hash = hash;
      checkResultModal.checkResult = checkResult;
      isCheckResultModalOpen.value = true;

      return checkResult;
    } catch (e: any) {
      console.error('Error checking solution:', e);
      return { error: true, details: e };
    }
  }

  return {
    isCheckResultModalOpen,
    checkResultModal,
    loadFromGeolin,
    checkSolution,
  };
}
