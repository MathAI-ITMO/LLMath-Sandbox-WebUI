import { reactive, ref } from 'vue';

export const LLMATH_PROBLEMS_API_URL = '/problems/api';

export interface GeoilonAnsKey {
  hash: string;
  seed: number;
}

export interface Step {
  order: number;
  prerequisites?: Record<string, any>;
  transition?: Record<string, any>;
  outcomes?: Record<string, any>;
}

export interface Solution {
  steps: Step[];
}

export interface Problem {
  _id?: string;
  id?: string;
  title?: string;
  statement: string;
  geolin_ans_key: GeoilonAnsKey;
  result?: string;
  solution: Solution;
  llm_solution?: any;
  theory_link?: string;
}

export interface ProblemWithTypePayload {
  type_name: string;
  problem_id: string;
}

export interface GeolinProblemData {
  name?: string;
  hash?: string;
  condition?: string;
  seed?: number;
  error?: string;
  problemParams?: string;
}

export function useProblemApi() {
  const apiCallLoading = reactive<Record<string, boolean>>({
    createProblem: false,
    fetchProblemById: false,
    updateProblem: false,
    deleteProblem: false,
    assignType: false,
    fetchProblemsByType: false,
    fetchAllTypes: false,
    loadProblemForUpdate: false,
    managementAddProblem: false,
    managementUpdateProblem: false,
    loadFromGeolin: false,
    getLlmSolution: false,
    checkSolution: false,
  });

  const apiResponse = reactive<Record<string, any>>({
    createProblem: null,
    fetchProblemById: null,
    updateProblem: null,
    deleteProblem: null,
    assignType: null,
    fetchProblemsByType: null,
    fetchAllTypesError: null,
    managementAddProblem: null,
    managementUpdateProblem: null,
    loadFromGeolin: null,
    checkSolution: null,
  });

  const allTypes = ref<string[]>([]);

  async function makeApiCall(
    endpoint: string,
    method: string,
    body?: any,
    loadingKey?: string,
    responseKey?: string
  ) {
    if (loadingKey) apiCallLoading[loadingKey] = true;
    if (responseKey) apiResponse[responseKey] = null;
    if (responseKey === 'fetchAllTypesError' || loadingKey === 'fetchAllTypes') {
      apiResponse.fetchAllTypesError = null;
    }

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(`${LLMATH_PROBLEMS_API_URL}${endpoint}`, {
        ...options,
        credentials: 'include'
      });

      let responseData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const errorDetail = typeof responseData === 'object' ? responseData : { message: responseData, status: response.status };
        throw errorDetail;
      }

      if (responseKey && responseKey !== 'fetchAllTypesError') {
        apiResponse[responseKey] = responseData;
      } else if (endpoint === '/types' && method === 'GET') {
        allTypes.value = responseData as string[];
      }
      return responseData;
    } catch (e: any) {
      console.error(`Ошибка при вызове ${method} ${LLMATH_PROBLEMS_API_URL}${endpoint}:`, e);
      if (responseKey && responseKey !== 'fetchAllTypesError') {
        apiResponse[responseKey] = { error: true, details: e };
      } else if (loadingKey === 'fetchAllTypes' || responseKey === 'fetchAllTypesError') {
        apiResponse.fetchAllTypesError = { error: true, details: e };
      }
      return { error: true, details: e };
    } finally {
      if (loadingKey) apiCallLoading[loadingKey] = false;
    }
  }

  async function fetchAllTypes() {
    return makeApiCall('/types', 'GET', undefined, 'fetchAllTypes');
  }

  return {
    apiCallLoading,
    apiResponse,
    allTypes,
    makeApiCall,
    fetchAllTypes,
  };
}
