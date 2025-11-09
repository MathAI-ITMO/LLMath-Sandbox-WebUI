import { onMounted, reactive, ref, watch } from 'vue';
import axios from 'axios';
import type { Problem } from '@/models/Problem';
import type { ProblemWithTypePayload } from '@/models/ProblemWithTypePayload';
import type { CheckResultModalState } from '@/models/CheckResultModalState';
import type { ProblemFormState } from '@/models/ProblemFormState';
import type { Step } from '@/models/Step';

const { VITE_MATHLLM_BACKEND_ADDRESS } = import.meta.env;

const trimTrailingSlash = (value?: string) => (value ? value.replace(/\/+$/, '') : undefined);
const backendBase = trimTrailingSlash(VITE_MATHLLM_BACKEND_ADDRESS) ?? '';

const LLMATH_PROBLEMS_API_URL = backendBase
  ? `${backendBase}/api/v1/problems-proxy`
  : '/api/v1/problems-proxy';

const MATHLLM_BACKEND_API_URL = backendBase || '';

export function useTestLLMathProblems() {
  const activeTab = ref('management');

  const problems = ref<Problem[]>([]);
  const loading = ref(false);
  const error = ref<any>(null);
  const attemptedLoad = ref(false);
  const selectedProblem = ref<Problem | null>(null);

  const problemTypesMap = ref<Record<string, string[]>>({});

  const foundProblemsByTypeList = ref<Problem[]>([]);
  const foundProblemByIdList = ref<Problem[]>([]);

  const apiCallLoading = reactive({
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

  const newProblem = reactive<Omit<Problem, '_id' | 'id'>>({
    title: '',
    statement: '',
    geolin_ans_key: { hash: '', seed: 0 },
    result: '',
    solution: { steps: [] },
    llm_solution: null,
  });
  const newProblemSolutionStepsJson = ref('[]');
  const newProblemLlmSolutionJson = ref('');

  const managementNewProblem = reactive<Omit<Problem, '_id' | 'id' | 'result'>>({
    title: '',
    statement: '',
    geolin_ans_key: { hash: '', seed: 0 },
    solution: { steps: [] },
    llm_solution: null,
  });
  const managementNewProblemSolutionStepsJson = ref('[]');
  const managementNewProblemLlmSolutionJson = ref('');
  const managementNewProblemType = ref('');

  const problemIdToFetch = ref('');
  const updateProblemData = reactive<Problem>({
    _id: '',
    title: '',
    statement: '',
    geolin_ans_key: { hash: '', seed: 0 },
    result: '',
    solution: { steps: [] },
    llm_solution: null,
  });
  const updateProblemSolutionStepsJson = ref('[]');
  const updateProblemLlmSolutionJson = ref('');
  const problemIdToDeleteValue = ref('');

  const typeAssignment = reactive<ProblemWithTypePayload>({
    type_name: '',
    problem_id: '',
  });
  const typeToFetchProblemsBy = ref('');
  const allTypes = ref<string[]>([]);

  const editingProblem = ref<Problem | null>(null);
  const currentEditProblem = reactive<Omit<Problem, '_id' | 'id' | 'geolin_ans_key' | 'result'>>({
    title: '',
    statement: '',
    solution: { steps: [] },
    llm_solution: null,
  });
  const currentEditProblemType = ref('');
  const currentEditProblemSolutionStepsJson = ref('[]');
  const currentEditProblemLlmSolutionJson = ref('');

  const geolinPrefixToLoad = ref('');
  const availableGeolinPrefixes = ref<string[]>([
    'tasks.linalg.linear_operators.matrix_decompositions.LU_decomposition.LU_decomposition_3x3',
    'tasks.linalg.linear_operators.matrix_decompositions.LU_decomposition.LU_decomposition_4x4',
    'tasks.linalg.linear_space.basis_transformation.basis_transformation_vector',
  ]);

  const activeForm = ref<'management' | 'database' | 'update' | null>(null);

  const checkResultModal = reactive<CheckResultModalState>({
    show: false,
    problemStatement: '',
    solution: '',
    extractedAnswer: '',
    checkResult: null,
    hash: '',
    seed: undefined,
  });

  const validationWarning = ref('');
  const llmSolutionError = ref('');
  const checkSolutionError = ref('');
  const geoSeedMessage = ref('');

  watch(activeTab, (newTab) => {
    if (newTab === 'management' && problems.value.length === 0 && !loading.value && !attemptedLoad.value) {
      fetchAllProblems();
    }
    if (newTab === 'management' && allTypes.value.length === 0 && !apiCallLoading.fetchAllTypes) {
      fetchAllTypes();
    }
    if (newTab === 'database') {
      editingProblem.value = null;
    }
  });

  function showEditForm(problem: Problem) {
    editingProblem.value = JSON.parse(JSON.stringify(problem));
    if (editingProblem.value) {
      currentEditProblem.title = editingProblem.value.title || '';
      currentEditProblem.statement = editingProblem.value.statement;
      currentEditProblem.solution = { ...(editingProblem.value.solution || { steps: [] }) };
      currentEditProblem.llm_solution = editingProblem.value.llm_solution !== undefined ? editingProblem.value.llm_solution : null;

      currentEditProblemSolutionStepsJson.value = JSON.stringify(currentEditProblem.solution.steps, null, 2);
      currentEditProblemLlmSolutionJson.value = currentEditProblem.llm_solution
        ? (typeof currentEditProblem.llm_solution === 'string'
          ? currentEditProblem.llm_solution
          : JSON.stringify(currentEditProblem.llm_solution, null, 2))
        : '';

      const assignedTypes = problemTypesMap.value[editingProblem.value._id || editingProblem.value.id || ''] || [];
      currentEditProblemType.value = assignedTypes.length > 0 ? assignedTypes[0] : '';
    }
  }

  function cancelEdit() {
    editingProblem.value = null;
    apiResponse.managementUpdateProblem = null;
  }

  async function updateProblemFromManagementTab() {
    if (!editingProblem.value || !(editingProblem.value._id || editingProblem.value.id)) {
      apiResponse.managementUpdateProblem = { error: true, message: 'ID редактируемой задачи не найден.' };
      return;
    }
    const problemIdToUpdate = editingProblem.value._id || editingProblem.value.id;

    try {
      const payload: Partial<Problem> = {
        title: currentEditProblem.title,
        statement: currentEditProblem.statement,
        solution: { steps: parseSteps(currentEditProblemSolutionStepsJson.value) },
        llm_solution: parseLlmSolution(currentEditProblemLlmSolutionJson.value, currentEditProblem.llm_solution),
        geolin_ans_key: editingProblem.value.geolin_ans_key,
      };

      const updateResponse = await makeApiCall(
        `/problems/${problemIdToUpdate}`,
        'PUT',
        payload,
        'managementUpdateProblem',
        'managementUpdateProblem',
      );

      if (updateResponse && !updateResponse.error) {
        const oldAssignedTypes = problemTypesMap.value[problemIdToUpdate || ''] || [];
        const oldType = oldAssignedTypes.length > 0 ? oldAssignedTypes[0] : '';
        const newType = currentEditProblemType.value.trim();

        if (newType !== oldType && problemIdToUpdate) {
          if (newType) {
            const typePayload: ProblemWithTypePayload = { problem_id: problemIdToUpdate, type_name: newType };
            await makeApiCall('/assign_type', 'POST', typePayload, 'assignType', 'assignType');
          }
        }

        await fetchAllProblems();
        cancelEdit();
      }
    } catch (e) {
      console.error('Ошибка при обновлении задачи (management tab):', e);
      apiResponse.managementUpdateProblem = { error: true, message: 'Ошибка парсинга JSON или API (management tab)', details: e };
    }
  }

  function tryParseJson(jsonString: string, defaultValue: any = null) {
    if (!jsonString || jsonString.trim() === '') return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn('Failed to parse JSON, returning as text: ', jsonString, e);
      return defaultValue ?? jsonString;
    }
  }

  function parseSteps(jsonString: string): Step[] {
    const result = tryParseJson(jsonString, []);
    return Array.isArray(result) ? (result as Step[]) : [];
  }

  function parseLlmSolution(jsonString: string, fallback: any) {
    const parsed = tryParseJson(jsonString, fallback);
    return typeof parsed === 'object' || typeof parsed === 'string' ? parsed : fallback;
  }

  function resetProblemForm(target: ProblemFormState, solutionJsonRef: { value: string }, llmJsonRef: { value: string }) {
    target.title = '';
    target.statement = '';
    target.geolin_ans_key = { hash: '', seed: 0 };
    target.result = target.result !== undefined ? '' : target.result;
    target.solution = { steps: [] };
    target.llm_solution = null;
    solutionJsonRef.value = '[]';
    llmJsonRef.value = '';
  }

  function buildProblemPayload(problem: ProblemFormState, stepsJson: string, llmJson: string, fallbackLlm: any): ProblemFormState {
    return {
      title: problem.title,
      statement: problem.statement,
      geolin_ans_key: { ...problem.geolin_ans_key },
      result: problem.result,
      solution: { steps: parseSteps(stepsJson) },
      llm_solution: parseLlmSolution(llmJson, fallbackLlm),
    };
  }

  async function makeApiCall(
    endpoint: string,
    method: string,
    body?: any,
    loadingKey?: keyof typeof apiCallLoading,
    responseKey?: keyof typeof apiResponse,
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
      const response = await fetch(`${LLMATH_PROBLEMS_API_URL}${endpoint}`, options);

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
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
      } else if (endpoint === '/problems' && method === 'GET' && !loadingKey && !responseKey) {
        error.value = e;
      }
      return { error: true, details: e };
    } finally {
      if (loadingKey) apiCallLoading[loadingKey] = false;
    }
  }

  async function populateProblemTypesMap() {
    if (!apiCallLoading.fetchAllTypes && allTypes.value.length === 0) {
      await fetchAllTypes();
    }

    if (allTypes.value && allTypes.value.length > 0 && !apiResponse.fetchAllTypesError) {
      const tempMap: Record<string, string[]> = {};

      for (const typeStr of allTypes.value) {
        const problemsForTypeResponse = await makeApiCall(
          `/get_problems_by_type?problem_type=${encodeURIComponent(typeStr)}`,
          'GET',
        );

        if (problemsForTypeResponse && !problemsForTypeResponse.error && Array.isArray(problemsForTypeResponse)) {
          const problemsWithType: Problem[] = problemsForTypeResponse;
          for (const problem of problemsWithType) {
            const problemId = problem._id || problem.id;
            if (problemId) {
              if (!tempMap[problemId]) {
                tempMap[problemId] = [];
              }
              if (!tempMap[problemId].includes(typeStr)) {
                tempMap[problemId].push(typeStr);
              }
            }
          }
        }
      }
      problemTypesMap.value = tempMap;
    } else {
      console.warn('Could not fetch all types to build problemTypesMap or no types found.', apiResponse.fetchAllTypesError);
      problemTypesMap.value = {};
    }
  }

  function getProblemAssignedTypes(problemId: string | undefined): string {
    if (!problemId) return '';
    return problemTypesMap.value[problemId]?.join(', ') || '';
  }

  async function fetchAllProblems() {
    loading.value = true;
    error.value = null;
    attemptedLoad.value = true;
    foundProblemByIdList.value = [];
    foundProblemsByTypeList.value = [];
    apiResponse.fetchProblemById = null;
    apiResponse.fetchProblemsByType = null;

    try {
      const response = await fetch(`${LLMATH_PROBLEMS_API_URL}/problems`);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      const data = await response.json();
      problems.value = data;
      await fetchAllTypes();
      if (problems.value.length > 0) {
        await populateProblemTypesMap();
      } else {
        problemTypesMap.value = {};
      }
    } catch (e) {
      console.error('Failed to fetch problems:', e);
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  async function createProblem() {
    try {
      const payload = buildProblemPayload(newProblem, newProblemSolutionStepsJson.value, newProblemLlmSolutionJson.value, null);
      await makeApiCall('/create', 'POST', payload, 'createProblem', 'createProblem');
      fetchAllProblems();
      resetProblemForm(newProblem, newProblemSolutionStepsJson, newProblemLlmSolutionJson);
    } catch (e) {
      console.error('Ошибка парсинга JSON или при создании задачи:', e);
      apiResponse.createProblem = { error: true, message: 'Ошибка парсинга JSON для шагов/LLM решения или API', details: e };
    }
  }

  async function fetchProblemById() {
    if (!problemIdToFetch.value) return;
    foundProblemByIdList.value = [];
    const responseData = await makeApiCall(
      `/problems/${problemIdToFetch.value}`,
      'GET',
      undefined,
      'fetchProblemById',
      'fetchProblemById',
    );
    if (responseData && !responseData.error) {
      foundProblemByIdList.value = [responseData as Problem];
      apiResponse.fetchProblemById = null;
    }
  }

  function setProblemToUpdate(problem: Problem) {
    updateProblemData.id = problem._id || problem.id || '';
    updateProblemData.title = problem.title || '';
    updateProblemData.statement = problem.statement;
    updateProblemData.geolin_ans_key = { ...(problem.geolin_ans_key || { hash: '', seed: 0 }) };
    updateProblemData.result = problem.result || '';
    updateProblemData.solution = { ...(problem.solution || { steps: [] }) };
    updateProblemData.llm_solution = problem.llm_solution !== undefined ? problem.llm_solution : null;

    updateProblemSolutionStepsJson.value = JSON.stringify(problem.solution?.steps || [], null, 2);
    updateProblemLlmSolutionJson.value = problem.llm_solution
      ? (typeof problem.llm_solution === 'string'
        ? problem.llm_solution
        : JSON.stringify(problem.llm_solution, null, 2))
      : '';
  }

  async function loadProblemForUpdate() {
    if (!updateProblemData.id) return;
    apiCallLoading.loadProblemForUpdate = true;
    const problem = await makeApiCall(`/problems/${updateProblemData.id}`, 'GET');
    apiCallLoading.loadProblemForUpdate = false;
    if (problem && !problem.error) {
      setProblemToUpdate(problem);
      apiResponse.updateProblem = null;
    } else {
      apiResponse.updateProblem = { error: true, details: 'Не удалось загрузить задачу для обновления.' };
    }
  }

  async function updateProblem() {
    const idForUpdate = updateProblemData._id || updateProblemData.id;
    if (!idForUpdate) {
      apiResponse.updateProblem = { error: true, message: 'ID для обновления не найден' };
      return;
    }
    try {
      const problemToUpdatePayload: Omit<Problem, '_id' | 'id'> & { id?: string } = {
        ...buildProblemPayload(updateProblemData, updateProblemSolutionStepsJson.value, updateProblemLlmSolutionJson.value, updateProblemData.llm_solution),
      };

      await makeApiCall(`/problems/${idForUpdate}`, 'PUT', problemToUpdatePayload, 'updateProblem', 'updateProblem');
      fetchAllProblems();
    } catch (e) {
      console.error('Ошибка парсинга JSON или при обновлении задачи:', e);
      apiResponse.updateProblem = { error: true, message: 'Ошибка парсинга JSON или API', details: e };
    }
  }

  function setProblemToDelete(id: string | undefined) {
    if (id) {
      problemIdToDeleteValue.value = id;
    } else {
      console.warn('ID для удаления не предоставлен');
      apiResponse.deleteProblem = { error: true, message: 'ID для удаления не предоставлен' };
    }
  }

  async function deleteProblemFromDbTab() {
    if (!problemIdToDeleteValue.value) return;
    await makeApiCall(
      `/problems/${problemIdToDeleteValue.value}`,
      'DELETE',
      undefined,
      'deleteProblem',
      'deleteProblem',
    );
    fetchAllProblems();
    problemIdToDeleteValue.value = '';
  }

  async function deleteProblemByIdAndRefresh(problemId: string | undefined) {
    if (!problemId) {
      console.warn('ID для удаления не предоставлен (management tab)');
      apiResponse.deleteProblem = { error: true, message: 'ID для удаления не предоставлен (management tab)' };
      return;
    }
    await makeApiCall(`/problems/${problemId}`, 'DELETE', undefined, 'deleteProblem', 'deleteProblem');
    await fetchAllProblems();
  }

  async function addProblemFromManagementTab() {
    apiResponse.managementAddProblem = null;
    try {
      const problemToCreatePayload: Omit<Problem, '_id' | 'id' | 'result'> = {
        title: managementNewProblem.title,
        statement: managementNewProblem.statement,
        geolin_ans_key: {
          hash: managementNewProblem.geolin_ans_key.hash,
          seed: Number(managementNewProblem.geolin_ans_key.seed) || 0,
        },
        solution: { steps: parseSteps(managementNewProblemSolutionStepsJson.value) },
        llm_solution: parseLlmSolution(managementNewProblemLlmSolutionJson.value, null),
      };

      const createdProblemResponse = await makeApiCall(
        '/problems',
        'POST',
        problemToCreatePayload,
        'managementAddProblem',
        'managementAddProblem',
      );

      if (createdProblemResponse && !createdProblemResponse.error && (createdProblemResponse._id || createdProblemResponse.id)) {
        const newProblemId = createdProblemResponse._id || createdProblemResponse.id;
        apiResponse.managementAddProblem = { success: true, createdProblem: createdProblemResponse };

        if (managementNewProblemType.value.trim() !== '') {
          const typePayload: ProblemWithTypePayload = {
            problem_id: newProblemId,
            type_name: managementNewProblemType.value.trim(),
          };
          const assignTypeResponse = await makeApiCall('/assign_type', 'POST', typePayload, 'assignType', 'assignType');
          if (assignTypeResponse && !assignTypeResponse.error) {
            if (typeof apiResponse.managementAddProblem === 'object' && apiResponse.managementAddProblem !== null) {
              apiResponse.managementAddProblem.typeAssignment = assignTypeResponse;
            }
          } else {
            console.warn('Ошибка при присвоении типа:', assignTypeResponse?.details || 'Неизвестная ошибка');
            if (typeof apiResponse.managementAddProblem === 'object' && apiResponse.managementAddProblem !== null) {
              apiResponse.managementAddProblem.typeAssignmentError = assignTypeResponse?.details || 'Неизвестная ошибка при присвоении типа';
            }
          }
        }

        await fetchAllProblems();

        resetProblemForm(managementNewProblem, managementNewProblemSolutionStepsJson, managementNewProblemLlmSolutionJson);
        managementNewProblemType.value = '';
      } else {
        console.error('Ошибка при создании задачи (management tab):', createdProblemResponse?.details);
      }
    } catch (e: any) {
      console.error('Ошибка парсинга JSON или другая ошибка при добавлении задачи (management tab):', e);
      apiResponse.managementAddProblem = { error: true, message: 'Ошибка парсинга JSON или API (management tab)', details: e };
    }
  }

  async function assignTypeToProblem() {
    if (!typeAssignment.problem_id || !typeAssignment.type_name) return;
    const response = await makeApiCall('/assign_type', 'POST', typeAssignment, 'assignType', 'assignType');
    if (response && !response.error) {
      typeAssignment.type_name = '';
      typeAssignment.problem_id = '';
      await populateProblemTypesMap();
    }
  }

  async function fetchProblemsByType() {
    if (!typeToFetchProblemsBy.value) return;
    foundProblemsByTypeList.value = [];
    const responseData = await makeApiCall(
      `/get_problems_by_type?problem_type=${encodeURIComponent(typeToFetchProblemsBy.value)}`,
      'GET',
      undefined,
      'fetchProblemsByType',
      'fetchProblemsByType',
    );
    if (responseData && !responseData.error && Array.isArray(responseData)) {
      foundProblemsByTypeList.value = responseData as Problem[];
      apiResponse.fetchProblemsByType = null;
    }
  }

  async function fetchAllTypes() {
    await makeApiCall('/types', 'GET', undefined, 'fetchAllTypes', 'fetchAllTypesError');
  }

  async function fetchFromGeolinProxy(prefix: string) {
    apiCallLoading.loadFromGeolin = true;
    apiResponse.loadFromGeolin = null;
    try {
      const url = `${MATHLLM_BACKEND_API_URL}/api/v1/geolin-proxy/problem-data?prefix=${encodeURIComponent(prefix)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error || `HTTP error! status: ${response.status}`;
        throw new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      }

      apiResponse.loadFromGeolin = data;
      return data;
    } catch (e: any) {
      console.error('Ошибка при загрузке из GeoLin прокси:', e);
      apiResponse.loadFromGeolin = { error: e?.message || 'Неизвестная ошибка при запросе к GeoLin прокси' };
      return null;
    } finally {
      apiCallLoading.loadFromGeolin = false;
    }
  }

  function showProblemDetails(problem: Problem) {
    selectedProblem.value = problem;
  }

  function closeModal() {
    selectedProblem.value = null;
  }

  async function loadFromGeolin() {
    geoSeedMessage.value = '';
    if (!geolinPrefixToLoad.value) {
      apiResponse.loadFromGeolin = { error: 'Префикс GeoLin не может быть пустым.' };
      return;
    }
    const data = await fetchFromGeolinProxy(geolinPrefixToLoad.value);
    if (data && !data.error) {
      managementNewProblem.title = data.name || '';
      managementNewProblem.statement = data.condition || '';
      managementNewProblem.geolin_ans_key = { hash: data.hash || '', seed: Number(data.seed) || 0 };
      managementNewProblem.solution = { steps: parseSteps(data.solution || '[]') };
      managementNewProblem.llm_solution = data.llm_solution;
      managementNewProblemSolutionStepsJson.value = JSON.stringify(managementNewProblem.solution.steps, null, 2);
      managementNewProblemLlmSolutionJson.value = managementNewProblem.llm_solution
        ? (typeof managementNewProblem.llm_solution === 'string'
          ? managementNewProblem.llm_solution
          : JSON.stringify(managementNewProblem.llm_solution, null, 2))
        : '';
      geoSeedMessage.value = data.seed ? `Seed: ${data.seed}` : '';
    } else {
      console.error('Не удалось получить данные из GeoLin:', data?.error || 'неизвестная ошибка');
    }
  }

  async function getLlmSolution(formType: 'management' | 'database' | 'update') {
    validationWarning.value = '';
    llmSolutionError.value = '';
    activeForm.value = formType;

    let problemStatement = '';
    if (formType === 'management') {
      problemStatement = managementNewProblem.statement;
    } else if (formType === 'database') {
      problemStatement = newProblem.statement;
    } else if (formType === 'update') {
      problemStatement = updateProblemData.statement;
    }

    if (!problemStatement) {
      validationWarning.value = 'Поле "Условие" не может быть пустым для получения решения LLM';
      return;
    }

    apiCallLoading.getLlmSolution = true;

    try {
      const client = axios.create({
        baseURL: MATHLLM_BACKEND_API_URL,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await client.post('/api/v1/llm/solve-problem', {
        problemDescription: problemStatement,
      });

      const solution = response.data.solution;

      if (formType === 'management') {
        managementNewProblemLlmSolutionJson.value = solution;
        managementNewProblem.llm_solution = solution;
      } else if (formType === 'database') {
        newProblemLlmSolutionJson.value = solution;
        newProblem.llm_solution = solution;
      } else if (formType === 'update') {
        updateProblemLlmSolutionJson.value = solution;
        updateProblemData.llm_solution = solution;
      }
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
      llmSolutionError.value = `Ошибка при получении решения от LLM: ${errorMessage}`;
    } finally {
      apiCallLoading.getLlmSolution = false;
    }
  }

  async function checkSolution(formType: 'management' | 'database' | 'update' | 'edit') {
    validationWarning.value = '';
    checkSolutionError.value = '';

    let problemStatement = '';
    let solution = '';
    let hash = '';
    let seed: number | undefined;

    if (formType === 'management') {
      problemStatement = managementNewProblem.statement;
      solution = managementNewProblemLlmSolutionJson.value;
      hash = managementNewProblem.geolin_ans_key.hash;
      seed = managementNewProblem.geolin_ans_key.seed;
    } else if (formType === 'database') {
      problemStatement = newProblem.statement;
      solution = newProblemLlmSolutionJson.value;
      hash = newProblem.geolin_ans_key.hash;
      seed = newProblem.geolin_ans_key.seed;
    } else if (formType === 'update') {
      problemStatement = updateProblemData.statement;
      solution = updateProblemLlmSolutionJson.value;
      hash = updateProblemData.geolin_ans_key.hash;
      seed = updateProblemData.geolin_ans_key.seed;
    } else if (formType === 'edit') {
      problemStatement = currentEditProblem.statement;
      solution = currentEditProblemLlmSolutionJson.value;
      hash = editingProblem.value?.geolin_ans_key?.hash || '';
      seed = editingProblem.value?.geolin_ans_key?.seed;
    }

    if (!problemStatement) {
      validationWarning.value = 'Поле "Условие" не может быть пустым для проверки решения';
      return;
    }

    if (!solution) {
      validationWarning.value = 'Поле "Решение LLM" не может быть пустым для проверки';
      return;
    }

    if (!hash) {
      validationWarning.value = 'Hash задачи отсутствует. Невозможно проверить решение.';
      return;
    }

    apiCallLoading.checkSolution = true;

    try {
      const client = axios.create({
        baseURL: MATHLLM_BACKEND_API_URL,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const extractResponse = await client.post('/api/v1/llm/extract-answer', {
        problemStatement,
        solution,
      });

      const extractedAnswer = extractResponse.data.extractedAnswer;
      if (!extractedAnswer) {
        throw new Error('LLM не смог извлечь ответ из решения - получен пустой ответ');
      }

      const checkResponse = await client.post('/api/v1/geolin-proxy/check-answer-direct', {
        hash,
        answerAttempt: extractedAnswer,
        seed,
      });

      const checkResult = checkResponse.data;
      showCheckResultModal({ problemStatement, solution, extractedAnswer, checkResult, hash, seed });
    } catch (error) {
      console.error('❌ Ошибка при проверке решения:', error);

      let errorMessage = 'Неизвестная ошибка';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.status === 401
          ? 'Ошибка авторизации. Возможно, вам нужно выполнить вход в систему.'
          : `Ошибка: ${error.response?.status || 'сетевая ошибка'} - ${JSON.stringify(error.response?.data) || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      checkSolutionError.value = `Ошибка при проверке решения: ${errorMessage}`;
    } finally {
      apiCallLoading.checkSolution = false;
    }
  }

  function showCheckResultModal(data: {
    problemStatement: string;
    solution: string;
    extractedAnswer: string;
    checkResult: any;
    hash: string;
    seed: number | undefined;
  }) {
    checkResultModal.show = true;
    checkResultModal.problemStatement = data.problemStatement;
    checkResultModal.solution = data.solution;
    checkResultModal.extractedAnswer = data.extractedAnswer;
    checkResultModal.checkResult = data.checkResult;
    checkResultModal.hash = data.hash;
    checkResultModal.seed = data.seed;
  }

  function closeCheckResultModal() {
    checkResultModal.show = false;
  }

  const problemsCatalog = {
    list: problems,
    loading,
    attemptedLoad,
    error,
    map: problemTypesMap,
    foundByType: foundProblemsByTypeList,
    foundById: foundProblemByIdList,
    typeQuery: typeToFetchProblemsBy,
    types: allTypes,
    fetchAll: fetchAllProblems,
    fetchById: fetchProblemById,
    fetchByType: fetchProblemsByType,
    fetchTypes: fetchAllTypes,
    getProblemAssignedTypes,
  };

  const managementForms = {
    newProblem: {
      data: newProblem,
      solutionJson: newProblemSolutionStepsJson,
      llmSolutionJson: newProblemLlmSolutionJson,
      create: createProblem,
    },
    management: {
      data: managementNewProblem,
      solutionJson: managementNewProblemSolutionStepsJson,
      llmSolutionJson: managementNewProblemLlmSolutionJson,
      type: managementNewProblemType,
      add: addProblemFromManagementTab,
    },
    editing: {
      record: editingProblem,
      current: currentEditProblem,
      type: currentEditProblemType,
      solutionJson: currentEditProblemSolutionStepsJson,
      llmSolutionJson: currentEditProblemLlmSolutionJson,
      show: showEditForm,
      cancel: cancelEdit,
      update: updateProblemFromManagementTab,
    },
    update: {
      data: updateProblemData,
      solutionJson: updateProblemSolutionStepsJson,
      llmSolutionJson: updateProblemLlmSolutionJson,
      setFromProblem: setProblemToUpdate,
      load: loadProblemForUpdate,
      update: updateProblem,
    },
    removal: {
      id: problemIdToDeleteValue,
      set: setProblemToDelete,
      deleteFromDb: deleteProblemFromDbTab,
      deleteFromList: deleteProblemByIdAndRefresh,
    },
    typeAssignment: {
      form: typeAssignment,
      assign: assignTypeToProblem,
    },
  };

  const geoLinTools = {
    prefix: geolinPrefixToLoad,
    availablePrefixes: availableGeolinPrefixes,
    message: geoSeedMessage,
    load: loadFromGeolin,
  };

  const solutionActions = {
    activeForm,
    validationWarning,
    llmSolutionError,
    checkSolutionError,
    getLlmSolution,
    checkSolution,
    modal: checkResultModal,
    closeModal: closeCheckResultModal,
  };

  const modalState = {
    selectedProblem,
    showProblemDetails,
    closeModal,
  };

  const apiState = {
    apiCallLoading,
    apiResponse,
  };

  onMounted(() => {
    fetchAllProblems();
  });

  return {
    activeTab,
    problemsCatalog,
    managementForms,
    geoLinTools,
    solutionActions,
    modalState,
    apiState,
    problemIdToFetch,
  };
}

