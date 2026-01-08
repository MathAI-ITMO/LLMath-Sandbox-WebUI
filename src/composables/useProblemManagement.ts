import { ref } from 'vue';
import { useProblemApi, type Problem, LLMATH_PROBLEMS_API_URL } from './useProblemApi';

export function useProblemManagement() {
  const { makeApiCall, apiCallLoading, apiResponse, allTypes, fetchAllTypes } = useProblemApi();

  const problems = ref<Problem[]>([]);
  const loading = ref(false);
  const error = ref<any>(null);
  const attemptedLoad = ref(false);
  const problemTypesMap = ref<Record<string, string[]>>({});

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

  async function deleteProblemByIdAndRefresh(id: string) {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    const result = await makeApiCall(`/problems/${id}`, 'DELETE', undefined, 'deleteProblem', 'deleteProblem');
    if (result && !result.error) {
      await fetchAllProblems();
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
    makeApiCall,
  };
}
