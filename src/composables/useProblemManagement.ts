import { ref, reactive } from 'vue';
import { useProblemApi, type Problem, type ProblemWithTypePayload, LLMATH_PROBLEMS_API_URL } from './useProblemApi';

export function useProblemManagement() {
  const { makeApiCall, apiCallLoading, apiResponse, allTypes, fetchAllTypes } = useProblemApi();

  const problems = ref<Problem[]>([]);
  const loading = ref(false);
  const error = ref<any>(null);
  const attemptedLoad = ref(false);
  const problemTypesMap = ref<Record<string, string[]>>({});

  function tryParseJson(jsonString: string, defaultValue: any = null) {
    if (!jsonString || jsonString.trim() === '') return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn("Failed to parse JSON, returning as text: ", jsonString, e);
      return jsonString;
    }
  }

  async function populateProblemTypesMap() {
    if (allTypes.value.length === 0) {
      await fetchAllTypes();
    }

    if (allTypes.value.length > 0 && !apiResponse.fetchAllTypesError) {
      const tempMap: Record<string, string[]> = {};
      for (const typeStr of allTypes.value) {
        const problemsForTypeResponse = await makeApiCall(`/get_problems_by_type?problem_type=${encodeURIComponent(typeStr)}`, 'GET');
        if (problemsForTypeResponse && !problemsForTypeResponse.error && Array.isArray(problemsForTypeResponse)) {
          for (const problem of problemsForTypeResponse as Problem[]) {
            const problemId = problem._id || problem.id;
            if (problemId) {
              if (!tempMap[problemId]) tempMap[problemId] = [];
              if (!tempMap[problemId].includes(typeStr)) tempMap[problemId].push(typeStr);
            }
          }
        }
      }
      problemTypesMap.value = tempMap;
    }
  }

  async function fetchAllProblems() {
    loading.value = true;
    error.value = null;
    attemptedLoad.value = true;
    try {
      const data = await makeApiCall('/problems', 'GET');
      if (data && data.error) {
        throw new Error(data.message || 'Error fetching problems');
      }
      problems.value = data || [];
      await fetchAllTypes();
      if (problems.value.length > 0) {
        await populateProblemTypesMap();
      } else {
        problemTypesMap.value = {};
      }
    } catch (e: any) {
      console.error('Error fetching all problems:', e);
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  function getProblemAssignedTypes(problemId: string | undefined): string {
    if (!problemId) return '';
    return problemTypesMap.value[problemId]?.join(', ') || '';
  }

  async function deleteProblemByIdAndRefresh(id: string | undefined) {
    if (!id) {
      console.warn("ID для удаления не предоставлен");
      apiResponse.deleteProblem = { error: true, message: "ID для удаления не предоставлен" };
      return;
    }
    const result = await makeApiCall(`/problems/${id}`, 'DELETE', undefined, 'deleteProblem', 'deleteProblem');
    if (result && !result.error) {
      await fetchAllProblems();
    }
  }

  async function createProblem(problemData: {
    title: string;
    statement: string;
    geolin_ans_key: { hash: string; seed: number };
    solutionStepsJson: string;
    llmSolutionJson: string;
    theory_link?: string;
    type?: string;
  }) {
    apiResponse.managementAddProblem = null;
    try {
      const steps = JSON.parse(problemData.solutionStepsJson || '[]');
      const llmSolution = tryParseJson(problemData.llmSolutionJson, null);

      const problemToCreatePayload: Omit<Problem, '_id' | 'id' | 'result'> = {
        title: problemData.title,
        statement: problemData.statement,
        geolin_ans_key: {
          hash: problemData.geolin_ans_key.hash,
          seed: Number(problemData.geolin_ans_key.seed) || 0,
        },
        solution: { steps },
        llm_solution: llmSolution,
        theory_link: problemData.theory_link || '',
      };

      const createdProblemResponse = await makeApiCall('/problems', 'POST', problemToCreatePayload, 'managementAddProblem', 'managementAddProblem');

      if (createdProblemResponse && !createdProblemResponse.error && (createdProblemResponse._id || createdProblemResponse.id)) {
        const newProblemId = createdProblemResponse._id || createdProblemResponse.id;
        apiResponse.managementAddProblem = { success: true, createdProblem: createdProblemResponse };

        if (problemData.type && problemData.type.trim() !== '') {
          const typePayload: ProblemWithTypePayload = {
            problem_id: newProblemId,
            type_name: problemData.type.trim(),
          };
          const assignTypeResponse = await makeApiCall('/assign_type', 'POST', typePayload, 'assignType', 'assignType');
          if (assignTypeResponse && !assignTypeResponse.error) {
            console.log("Тип успешно присвоен:", assignTypeResponse);
            if (typeof apiResponse.managementAddProblem === 'object' && apiResponse.managementAddProblem !== null) {
              apiResponse.managementAddProblem.typeAssignment = assignTypeResponse;
            }
          } else {
            console.warn("Ошибка при присвоении типа:", assignTypeResponse?.details || 'Неизвестная ошибка');
            if (typeof apiResponse.managementAddProblem === 'object' && apiResponse.managementAddProblem !== null) {
              apiResponse.managementAddProblem.typeAssignmentError = assignTypeResponse?.details || 'Неизвестная ошибка при присвоении типа';
            }
          }
        }

        await fetchAllProblems();
        return { success: true, createdProblem: createdProblemResponse };
      } else {
        console.error("Ошибка при создании задачи (management tab):", createdProblemResponse?.details);
        return { error: true, details: createdProblemResponse?.details };
      }
    } catch (e: any) {
      console.error("Ошибка парсинга JSON или другая ошибка при добавлении задачи (management tab):", e);
      apiResponse.managementAddProblem = { error: true, message: "Ошибка парсинга JSON или API (management tab)", details: e };
      return { error: true, details: e };
    }
  }

  async function updateProblem(problemId: string, problemData: {
    title: string;
    statement: string;
    geolin_ans_key: { hash: string; seed: number };
    solutionStepsJson: string;
    llmSolutionJson: string;
    theory_link?: string;
    type?: string;
  }) {
    if (!problemId) {
      apiResponse.managementUpdateProblem = { error: true, message: "ID редактируемой задачи не найден." };
      return { error: true, message: "ID редактируемой задачи не найден." };
    }

    try {
      const steps = JSON.parse(problemData.solutionStepsJson || '[]');
      const llmSolution = tryParseJson(problemData.llmSolutionJson, null);

      const payload: Partial<Problem> = {
        title: problemData.title,
        statement: problemData.statement,
        solution: { steps },
        llm_solution: llmSolution,
        theory_link: problemData.theory_link || '',
        geolin_ans_key: problemData.geolin_ans_key
      };

      const updateResponse = await makeApiCall(`/problems/${problemId}`, 'PUT', payload, 'managementUpdateProblem', 'managementUpdateProblem');

      if (updateResponse && !updateResponse.error) {
        // Обновление типа задачи, если он изменился
        const oldAssignedTypes = problemTypesMap.value[problemId] || [];
        const oldType = oldAssignedTypes.length > 0 ? oldAssignedTypes[0] : '';
        const newType = problemData.type?.trim() || '';

        if (newType !== oldType && problemId) {
          if (newType) {
            const typePayload: ProblemWithTypePayload = { problem_id: problemId, type_name: newType };
            await makeApiCall('/assign_type', 'POST', typePayload, 'assignType', 'assignType');
          }
        }

        await fetchAllProblems();
        return { success: true };
      } else {
        return { error: true, details: updateResponse?.details };
      }
    } catch (e) {
      console.error("Ошибка при обновлении задачи (management tab):", e);
      apiResponse.managementUpdateProblem = { error: true, message: "Ошибка парсинга JSON или API (management tab)", details: e };
      return { error: true, details: e };
    }
  }

  return {
    problems,
    loading,
    error,
    attemptedLoad,
    problemTypesMap,
    apiCallLoading,
    apiResponse,
    allTypes,
    fetchAllProblems,
    fetchAllTypes,
    getProblemAssignedTypes,
    deleteProblemByIdAndRefresh,
    createProblem,
    updateProblem,
    makeApiCall,
    tryParseJson,
  };
}
