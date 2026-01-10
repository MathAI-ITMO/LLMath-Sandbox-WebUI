import { ref, reactive } from 'vue';
import type { Problem } from './useProblemApi';
import type { TaskType } from '@/types/BackendDtos';

export function useProblemForm() {
  // Create form state
  const managementNewProblem = reactive<Omit<Problem, 'id' | 'result'>>({
    title: '',
    statement: '',
    geolin_ans_key: { hash: '', seed: 0 }, // Legacy format for form, converted to geolinHash/geolinSeed in API call
    solution: { steps: [] },
    llm_solution: null, // Legacy format for form, converted to llmSolution string in API call
    theory_link: '', // Legacy format for form, converted to theoryLink in API call
  });

  const managementNewProblemSolutionStepsJson = ref('[]');
  const managementNewProblemLlmSolutionJson = ref('');
  const managementNewProblemType = ref('');

  // Edit form state
  const editingProblem = ref<Problem | null>(null);
  const currentEditProblem = reactive<Omit<Problem, 'id' | 'geolin_ans_key' | 'geolinHash' | 'geolinSeed' | 'result'>>({
    title: '',
    statement: '',
    solution: { steps: [] },
    llm_solution: null, // Legacy format for form, converted to llmSolution string in API call
    theory_link: '', // Legacy format for form, converted to theoryLink in API call
  });

  const currentEditProblemType = ref('');
  const currentEditProblemSolutionStepsJson = ref('[]');
  const currentEditProblemLlmSolutionJson = ref('');

  function resetCreateForm() {
    managementNewProblem.title = '';
    managementNewProblem.statement = '';
    managementNewProblem.geolin_ans_key = { hash: '', seed: 0 };
    managementNewProblemSolutionStepsJson.value = '[]';
    managementNewProblemLlmSolutionJson.value = '';
    managementNewProblem.llm_solution = null;
    managementNewProblem.theory_link = '';
    managementNewProblemType.value = '';
  }

  function resetEditForm() {
    editingProblem.value = null;
    currentEditProblem.title = '';
    currentEditProblem.statement = '';
    currentEditProblem.solution = { steps: [] };
    currentEditProblem.llm_solution = null;
    currentEditProblem.theory_link = '';
    currentEditProblemType.value = '';
    currentEditProblemSolutionStepsJson.value = '[]';
    currentEditProblemLlmSolutionJson.value = '';
  }

  function populateEditForm(problem: Problem, assignedTypes: TaskType[] = []) {
    editingProblem.value = JSON.parse(JSON.stringify(problem)); // Deep copy
    if (editingProblem.value) {
      currentEditProblem.title = editingProblem.value.title || '';
      currentEditProblem.statement = editingProblem.value.statement;
      currentEditProblem.solution = { ...(editingProblem.value.solution || { steps: [] }) };
      
      // Handle llm_solution - could be from llmSolution or llm_solution (legacy)
      const llmSolution = editingProblem.value.llmSolution || editingProblem.value.llm_solution;
      currentEditProblem.llm_solution = llmSolution !== undefined ? llmSolution : null;
      
      // Handle theory_link - could be from theoryLink or theory_link (legacy)
      currentEditProblem.theory_link = editingProblem.value.theoryLink || editingProblem.value.theory_link || '';

      currentEditProblemSolutionStepsJson.value = JSON.stringify(currentEditProblem.solution.steps, null, 2);
      currentEditProblemLlmSolutionJson.value = currentEditProblem.llm_solution
        ? (typeof currentEditProblem.llm_solution === 'string' ? currentEditProblem.llm_solution : JSON.stringify(currentEditProblem.llm_solution, null, 2))
        : '';

      // Convert first TaskType to string for the select dropdown
      currentEditProblemType.value = assignedTypes.length > 0 ? String(assignedTypes[0]) : '';
    }
  }

  function populateFromGeolin(data: { name?: string; condition?: string; hash?: string; seed?: number }) {
    managementNewProblem.title = data.name || '';
    managementNewProblem.statement = data.condition || '';
    managementNewProblem.geolin_ans_key.hash = data.hash || '';

    if (data.seed !== undefined && data.seed !== null) {
      managementNewProblem.geolin_ans_key.seed = Number(data.seed);
    } else {
      managementNewProblem.geolin_ans_key.seed = 0;
    }

    // Clear solution fields
    managementNewProblemSolutionStepsJson.value = '[]';
    managementNewProblem.solution = { steps: [] };
    managementNewProblemLlmSolutionJson.value = '';
    managementNewProblem.llm_solution = null;
  }

  return {
    // Create form
    managementNewProblem,
    managementNewProblemSolutionStepsJson,
    managementNewProblemLlmSolutionJson,
    managementNewProblemType,
    
    // Edit form
    editingProblem,
    currentEditProblem,
    currentEditProblemType,
    currentEditProblemSolutionStepsJson,
    currentEditProblemLlmSolutionJson,
    
    // Functions
    resetCreateForm,
    resetEditForm,
    populateEditForm,
    populateFromGeolin,
  };
}