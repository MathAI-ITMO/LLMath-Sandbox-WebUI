import { ref, reactive } from 'vue';
import type { Problem } from './useProblemApi';

export function useProblemForm() {
  // Create form state
  const managementNewProblem = reactive<Omit<Problem, '_id' | 'id' | 'result'>>({
    title: '',
    statement: '',
    geolin_ans_key: { hash: '', seed: 0 },
    solution: { steps: [] },
    llm_solution: null,
    theory_link: '',
  });

  const managementNewProblemSolutionStepsJson = ref('[]');
  const managementNewProblemLlmSolutionJson = ref('');
  const managementNewProblemType = ref('');

  // Edit form state
  const editingProblem = ref<Problem | null>(null);
  const currentEditProblem = reactive<Omit<Problem, '_id' | 'id' | 'geolin_ans_key' | 'result'>>({
    title: '',
    statement: '',
    solution: { steps: [] },
    llm_solution: null,
    theory_link: '',
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

  function populateEditForm(problem: Problem, assignedTypes: string[] = []) {
    editingProblem.value = JSON.parse(JSON.stringify(problem)); // Deep copy
    if (editingProblem.value) {
      currentEditProblem.title = editingProblem.value.title || '';
      currentEditProblem.statement = editingProblem.value.statement;
      currentEditProblem.solution = { ...(editingProblem.value.solution || { steps: [] }) };
      currentEditProblem.llm_solution = editingProblem.value.llm_solution !== undefined ? editingProblem.value.llm_solution : null;
      currentEditProblem.theory_link = editingProblem.value.theory_link || '';

      currentEditProblemSolutionStepsJson.value = JSON.stringify(currentEditProblem.solution.steps, null, 2);
      currentEditProblemLlmSolutionJson.value = currentEditProblem.llm_solution
        ? (typeof currentEditProblem.llm_solution === 'string' ? currentEditProblem.llm_solution : JSON.stringify(currentEditProblem.llm_solution, null, 2))
        : '';

      currentEditProblemType.value = assignedTypes.length > 0 ? assignedTypes[0] : '';
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