<template>
  <div class="llmath-problems-view">
    <!-- Tabs Navigation -->
    <div class="tabs-nav">
      <button 
        :class="['tab-btn', { active: activeTab === 'management' }]" 
        @click="activeTab = 'management'">
        <span class="tab-icon">📝</span>
        Управление задачами
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'videos' }]" 
        @click="activeTab = 'videos'">
        <span class="tab-icon">📹</span>
        Управление видео
      </button>
    </div>

    <!-- Вкладка 1: Управление задачами -->
    <div v-if="activeTab === 'management'" class="tab-content management-tab">
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="btn btn-primary" @click="showGeolinImportModal = true">
          <span class="btn-icon">📥</span>
          Импорт из GeoLin
        </button>
        <button class="btn btn-success" @click="showCreateModal = true">
          <span class="btn-icon">➕</span>
          Создать задачу
        </button>
      </div>

      <!-- Problems List -->
      <div class="problems-section">
        <div class="section-header">
          <h2>Список задач ({{ problems.length }})</h2>
          <div v-if="totalPages > 1" class="pagination">
            <button 
              class="pagination-btn" 
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1">
              ‹
            </button>
            <button 
              v-for="page in totalPages" 
              :key="page"
              class="pagination-btn"
              :class="{ active: page === currentPage }"
              @click="goToPage(page)">
              {{ page }}
            </button>
            <button 
              class="pagination-btn" 
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages">
              ›
            </button>
          </div>
        </div>

        <div v-if="loading && !problems.length" class="loading-message">Загрузка списка задач...</div>
        <div v-if="!loading && problems.length === 0 && attemptedLoad" class="info-message">
          Задачи не найдены. Используйте кнопки выше для добавления задач.
        </div>

        <table v-if="problems.length > 0" class="problems-table">
          <thead>
            <tr>
              <th style="width: 150px;">Тип задачи</th>
              <th style="width: 200px;">Название</th>
              <th>Условие (фрагмент)</th>
              <th style="width: 180px;">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="problem in paginatedProblems" :key="problem._id || problem.id">
              <td>
                <span class="problem-type">{{ getProblemAssignedTypes(problem._id || problem.id) || 'Без типа' }}</span>
              </td>
              <td>
                <div class="problem-title">{{ problem.title || 'Без названия' }}</div>
              </td>
              <td>
                <div class="problem-statement" v-html="renderTruncatedStatement(problem.statement, 450)"></div>
              </td>
              <td>
                <div class="action-btns">
                  <button @click="editProblem(problem)" class="btn-icon-small btn-edit" title="Редактировать">
                    ✏️
                  </button>
                  <button @click="deleteProblemByIdAndRefresh(problem._id || problem.id)" 
                          class="btn-icon-small btn-delete" 
                          title="Удалить"
                          :disabled="apiCallLoading.deleteProblem">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- GeoLin Import Modal -->
    <ProblemModal
      :show="showGeolinImportModal"
      title="Импорт задачи из GeoLin"
      submitText="Загрузить"
      :submitDisabled="!geolinPrefixToLoad || apiCallLoading.loadFromGeolin"
      @close="showGeolinImportModal = false"
      @submit="handleGeolinImport"
    >
      <div class="modal-form">
        <div class="form-group">
          <label for="geolinPrefix">Префикс GeoLin *</label>
          <input 
            type="text" 
            id="geolinPrefix" 
            v-model="geolinPrefixToLoad" 
            list="geolinPrefixesDatalist"
            placeholder="tasks.linalg.linear_operators..."
            class="form-input"
          />
          <datalist id="geolinPrefixesDatalist">
            <option v-for="prefix in availableGeolinPrefixes" :key="prefix" :value="prefix"></option>
          </datalist>
          <small class="form-hint">Выберите префикс из списка или введите свой</small>
        </div>

        <div v-if="apiCallLoading.loadFromGeolin" class="loading-indicator">
          <div class="spinner"></div>
          <p>Загрузка задачи из GeoLin...</p>
        </div>

        <div v-if="apiResponse.loadFromGeolin?.error" class="error-box">
          <strong>Ошибка:</strong> {{ apiResponse.loadFromGeolin.error }}
        </div>
      </div>
    </ProblemModal>

    <!-- Create Problem Modal -->
    <ProblemModal
      :show="showCreateModal"
      title="Создать задачу"
      submitText="Создать задачу"
      :submitDisabled="!managementNewProblem.statement || !managementNewProblem.title || apiCallLoading.managementAddProblem"
      @close="closeCreateModal"
      @submit="handleCreateProblem"
    >
      <div class="modal-form">
        <!-- Название -->
        <div class="form-group">
          <label for="newTitle">Название задачи *</label>
          <input 
            type="text" 
            id="newTitle" 
            v-model="managementNewProblem.title"
            placeholder="Введите название задачи"
            class="form-input"
          />
        </div>

        <!-- Тип -->
        <div class="form-group">
          <label for="newType">Тип задачи</label>
          <input 
            type="text" 
            id="newType" 
            v-model="managementNewProblemType"
            list="existingTypesDatalistModal"
            placeholder="Выберите или введите тип"
            class="form-input"
          />
          <datalist id="existingTypesDatalistModal">
            <option v-for="type in allTypes" :key="type" :value="type"></option>
          </datalist>
          <small class="form-hint">Необязательное поле. Можно выбрать из списка или ввести новый тип</small>
        </div>

        <!-- Видео теории -->
        <div class="form-group">
          <label for="newTheoryLink">Видео теории</label>
          <select 
            id="newTheoryLink" 
            v-model="managementNewProblem.theory_link"
            class="form-select"
            @focus="fetchAvailableVideos"
          >
            <option value="">-- Не выбрано --</option>
            <option v-for="video in availableVideos" :key="video" :value="video">
              {{ video }}
            </option>
          </select>
          <small class="form-hint">Выберите видео из списка</small>
        </div>

        <!-- Условие (MathEditor) -->
        <div class="form-group">
          <label>Условие задачи *</label>
          <MathEditor 
            v-model="managementNewProblem.statement"
            placeholder="Введите условие задачи. Используйте $ для формул, например: $x^2 + y^2 = 1$"
            :rows="8"
          />
        </div>

        <!-- Решение LLM (MathEditor) -->
        <div class="form-group">
          <div class="form-group-header">
            <label>Решение LLM</label>
            <div class="form-actions">
              <button 
                @click.prevent="getLlmSolution('management')" 
                class="btn btn-sm btn-secondary"
                :disabled="apiCallLoading.getLlmSolution || !managementNewProblem.statement">
                <span v-if="apiCallLoading.getLlmSolution && activeForm === 'management'">⏳ Получение...</span>
                <span v-else>🤖 Получить решение LLM</span>
              </button>
              <button 
                @click.prevent="checkSolution('management')" 
                class="btn btn-sm btn-secondary"
                :disabled="apiCallLoading.checkSolution || !managementNewProblem.statement || !managementNewProblemLlmSolutionJson || !managementNewProblem.geolin_ans_key.hash">
                ✅ Проверить решение
              </button>
            </div>
          </div>
          <MathEditor 
            v-model="managementNewProblemLlmSolutionJson"
            placeholder="Решение появится здесь после нажатия кнопки 'Получить решение LLM'"
            :rows="10"
          />
          <div v-if="apiCallLoading.getLlmSolution && activeForm === 'management'" class="loading-indicator">
            <div class="spinner"></div>
            <p>Получаем решение от LLM...</p>
          </div>
        </div>

        <!-- GeoLin данные (мелким шрифтом) -->
        <div class="form-group form-group-meta">
          <div class="meta-info">
            <div class="meta-item">
              <span class="meta-label">GeoLin Hash:</span>
              <span class="meta-value">{{ managementNewProblem.geolin_ans_key.hash || 'не указан' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">GeoLin Seed:</span>
              <span class="meta-value">{{ managementNewProblem.geolin_ans_key.seed || 0 }}</span>
            </div>
          </div>
          <small class="form-hint">Эти данные заполняются автоматически при импорте из GeoLin</small>
        </div>

        <!-- Решение (шаги) - неактивное -->
        <div class="form-group form-group-disabled">
          <label>Решение (шаги, JSON) - в разработке</label>
          <textarea 
            v-model="managementNewProblemSolutionStepsJson"
            rows="3"
            disabled
            class="form-textarea"
            placeholder="Функционал в разработке"
          ></textarea>
          <small class="form-hint">Эта функция будет доступна в будущих версиях</small>
        </div>

      </div>
    </ProblemModal>

    <!-- Edit Problem Modal -->
    <ProblemModal
      :show="showEditModal"
      title="Редактировать задачу"
      submitText="Сохранить изменения"
      :submitDisabled="!currentEditProblem.statement || !currentEditProblem.title || apiCallLoading.managementUpdateProblem"
      @close="closeEditModal"
      @submit="handleUpdateProblem"
    >
      <div class="modal-form">
        <!-- Название -->
        <div class="form-group">
          <label for="editTitle">Название задачи *</label>
          <input 
            type="text" 
            id="editTitle" 
            v-model="currentEditProblem.title"
            placeholder="Введите название задачи"
            class="form-input"
          />
        </div>

        <!-- Тип -->
        <div class="form-group">
          <label for="editType">Тип задачи</label>
          <input 
            type="text" 
            id="editType" 
            v-model="currentEditProblemType"
            list="existingTypesDatalistEdit"
            placeholder="Выберите или введите тип"
            class="form-input"
          />
          <datalist id="existingTypesDatalistEdit">
            <option v-for="type in allTypes" :key="type" :value="type"></option>
          </datalist>
          <small class="form-hint">Необязательное поле. Можно выбрать из списка или ввести новый тип</small>
        </div>

        <!-- Видео теории -->
        <div class="form-group">
          <label for="editTheoryLink">Видео теории</label>
          <select 
            id="editTheoryLink" 
            v-model="currentEditProblem.theory_link"
            class="form-select"
            @focus="fetchAvailableVideos"
          >
            <option value="">-- Не выбрано --</option>
            <option v-for="video in availableVideos" :key="video" :value="video">
              {{ video }}
            </option>
          </select>
          <small class="form-hint">Выберите видео из списка</small>
        </div>

        <!-- Условие (MathEditor) -->
        <div class="form-group">
          <label>Условие задачи *</label>
          <MathEditor 
            v-model="currentEditProblem.statement"
            placeholder="Введите условие задачи. Используйте $ для формул, например: $x^2 + y^2 = 1$"
            :rows="8"
          />
        </div>

        <!-- Решение LLM (MathEditor) -->
        <div class="form-group">
          <div class="form-group-header">
            <label>Решение LLM</label>
            <div class="form-actions">
              <button 
                @click.prevent="getLlmSolution('edit')" 
                class="btn btn-sm btn-secondary"
                :disabled="apiCallLoading.getLlmSolution || !currentEditProblem.statement">
                <span v-if="apiCallLoading.getLlmSolution && activeForm === 'edit'">⏳ Получение...</span>
                <span v-else>🤖 Получить решение LLM</span>
              </button>
              <button 
                @click.prevent="checkSolution('edit')" 
                class="btn btn-sm btn-secondary"
                :disabled="apiCallLoading.checkSolution || !currentEditProblem.statement || !currentEditProblemLlmSolutionJson || !editingProblem?.geolin_ans_key?.hash">
                ✅ Проверить решение
              </button>
            </div>
          </div>
          <MathEditor 
            v-model="currentEditProblemLlmSolutionJson"
            placeholder="Решение LLM"
            :rows="10"
          />
          <div v-if="apiCallLoading.getLlmSolution && activeForm === 'edit'" class="loading-indicator">
            <div class="spinner"></div>
            <p>Получаем решение от LLM...</p>
          </div>
        </div>

        <!-- GeoLin данные (только для чтения) -->
        <div class="form-group form-group-meta" v-if="editingProblem">
          <div class="meta-info">
            <div class="meta-item">
              <span class="meta-label">GeoLin Hash:</span>
              <span class="meta-value">{{ editingProblem.geolin_ans_key?.hash || 'не указан' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">GeoLin Seed:</span>
              <span class="meta-value">{{ editingProblem.geolin_ans_key?.seed || 0 }}</span>
            </div>
          </div>
          <small class="form-hint">GeoLin данные нельзя изменить после создания</small>
        </div>

        <!-- Решение (шаги) - неактивное -->
        <div class="form-group form-group-disabled">
          <label>Решение (шаги, JSON) - в разработке</label>
          <textarea 
            v-model="currentEditProblemSolutionStepsJson"
            rows="3"
            disabled
            class="form-textarea"
            placeholder="Функционал в разработке"
          ></textarea>
          <small class="form-hint">Эта функция будет доступна в будущих версиях</small>
        </div>

      </div>
    </ProblemModal>

    <!-- Вкладка 2: Управление видео -->
    <div v-if="activeTab === 'videos'" class="tab-content videos-tab">
      <div class="video-iframe-container">
        <iframe 
          :src="videoAppUrl" 
          frameborder="0"
          class="video-iframe"
          title="Управление видео">
        </iframe>
      </div>
    </div>

    <div v-if="selectedProblem" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <button class="close-button" @click="closeModal">×</button>
        <h2>Детали задачи: {{ selectedProblem._id }}</h2>
        <div>
          <strong>Название задачи:</strong>
          <pre>{{ selectedProblem.title || 'N/A' }}</pre>
        </div>
        <div>
          <strong>Условие:</strong>
          <pre>{{ selectedProblem.statement }}</pre>
        </div>
        <div>
          <strong>GeoLin Ans Key:</strong>
          <pre>{{ JSON.stringify(selectedProblem.geolin_ans_key, null, 2) }}</pre>
        </div>
        <div>
          <strong>Результат:</strong>
          <pre>{{ selectedProblem.result || 'N/A' }}</pre>
        </div>
        <div>
          <strong>Решение (шаги):</strong>
          <div v-if="selectedProblem.solution && selectedProblem.solution.steps && selectedProblem.solution.steps.length > 0">
            <ul>
              <li v-for="(step, index) in selectedProblem.solution.steps" :key="index">
                <strong>Шаг {{ step.order }}:</strong>
                <pre>{{ JSON.stringify(step, null, 2) }}</pre>
              </li>
            </ul>
          </div>
          <div v-else>
            <p>Решение отсутствует или не содержит шагов.</p>
          </div>
        </div>
         <div>
          <strong>Решение LLM:</strong>
          <pre>{{ selectedProblem.llm_solution ? JSON.stringify(selectedProblem.llm_solution, null, 2) : 'N/A' }}</pre>
        </div>
      </div>
    </div>

    <!-- Модальное окно результатов проверки решения -->
    <div v-if="checkResultModal.show" class="modal-overlay" @click.self="closeCheckResultModal">
      <div class="modal-content check-result-modal">
        <button class="close-button" @click="closeCheckResultModal">×</button>
        <h2>Результат проверки решения</h2>
        
        <div class="check-result-section">
          <h3>📝 Проверенное решение:</h3>
          <div class="solution-preview">
            <pre>{{ checkResultModal.solution.substring(0, 300) }}{{ checkResultModal.solution.length > 300 ? '...' : '' }}</pre>
          </div>
        </div>

        <div class="check-result-section">
          <h3>🎯 Извлеченный ответ:</h3>
          <div class="extracted-answer">
            <pre>{{ checkResultModal.extractedAnswer }}</pre>
          </div>
        </div>

        <div class="check-result-section">
          <h3>✅ Результат проверки:</h3>
          <div class="check-result" :class="{ 'correct': checkResultModal.checkResult?.isCorrect, 'incorrect': !checkResultModal.checkResult?.isCorrect }">
            <div class="result-status">
              <span v-if="checkResultModal.checkResult?.isCorrect" class="status-icon">✅</span>
              <span v-else class="status-icon">❌</span>
              <strong>{{ checkResultModal.checkResult?.isCorrect ? 'ПРАВИЛЬНО' : 'НЕПРАВИЛЬНО' }}</strong>
            </div>
            <div v-if="checkResultModal.checkResult?.message" class="result-message">
              {{ checkResultModal.checkResult.message }}
            </div>
          </div>
        </div>

        <div class="check-result-section">
          <h3>🔧 Детали проверки:</h3>
          <div class="check-details">
            <p><strong>Hash задачи:</strong> {{ checkResultModal.hash }}</p>
            <p><strong>Seed:</strong> {{ checkResultModal.seed || 'не указан' }}</p>
            <p><strong>Отправленный ответ в GeoLin:</strong> <code>{{ checkResultModal.extractedAnswer }}</code></p>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <Transition name="toast">
      <div v-if="errorToast.show" class="error-toast">
        {{ errorToast.message }}
      </div>
    </Transition>

    <!-- Success Toast -->
    <Transition name="toast">
      <div v-if="successToast.show" class="success-toast">
        {{ successToast.message }}
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import { servicesConfig } from '@/config/services.config';
import MathEditor from '@/components/MathEditor.vue';
import ProblemModal from '@/components/ProblemModal.vue';
import { renderMessage } from '@/utils/renderMessage';

const activeTab = ref('management'); // По умолчанию открыта первая вкладка

// Modal states
const showGeolinImportModal = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);

// Toast state
const errorToast = ref({
  show: false,
  message: ''
});

const successToast = ref({
  show: false,
  message: ''
});

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

// Video app URL - direct connection to VideoApp service
const videoAppUrl = computed(() => servicesConfig.videoServiceUrl);

// Video list from VideoApp
const availableVideos = ref<string[]>([]);
const loadingVideos = ref(false);

// Fetch available videos from VideoApp
async function fetchAvailableVideos() {
  loadingVideos.value = true;
  try {
    const response = await axios.get(`${servicesConfig.videoServiceUrl}/videos`);
    availableVideos.value = response.data.map((v: any) => v.name);
  } catch (error) {
    console.error('Error fetching videos:', error);
    availableVideos.value = [];
  } finally {
    loadingVideos.value = false;
  }
}

// Show error toast
function showErrorToast(message: string) {
  errorToast.value.message = message;
  errorToast.value.show = true;
  setTimeout(() => {
    errorToast.value.show = false;
  }, 3000);
}

// Show success toast
function showSuccessToast(message: string) {
  successToast.value.message = message;
  successToast.value.show = true;
  setTimeout(() => {
    successToast.value.show = false;
  }, 2000);
}

watch(activeTab, (newTab) => {
  if (newTab === 'management' && problems.value.length === 0 && !loading.value && !attemptedLoad.value) {
    // Если переключились на "Управление задачами" и задачи еще не загружались, загружаем их.
    // Это нужно, чтобы список задач на этой вкладке был актуален при первом открытии.
    fetchAllProblems();
  }
  if (newTab === 'management' && allTypes.value.length === 0 && !apiCallLoading.fetchAllTypes) {
    fetchAllTypes(); // Также загружаем типы, если их нет, при переключении на вкладку
  }
  if (newTab === 'database') {
    editingProblem.value = null; // Скрываем форму редактирования, если уходим с вкладки управления
  }
});

const LLMATH_PROBLEMS_API_URL = '/problems/api';
const MATHLLM_BACKEND_API_URL = '/app'; // Relative path for backend API

interface GeoilonAnsKey {
  hash: string;
  seed: number;
}

interface Step {
  order: number;
  prerequisites?: Record<string, any>;
  transition?: Record<string, any>;
  outcomes?: Record<string, any>;
}

interface Solution {
  steps: Step[];
}

interface Problem {
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

interface ProblemWithTypePayload {
  type_name: string;
  problem_id: string;
}

// Интерфейс для ответа от GeoLin прокси
interface GeolinProblemData {
  name?: string;
  hash?: string;
  condition?: string;
  seed?: number;
  error?: string;
  problemParams?: string; // Добавляем поле для полного объекта problem_params
}

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
  theory_link: '',
});
const newProblemSolutionStepsJson = ref('[]');
const newProblemLlmSolutionJson = ref('');

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

const problemIdToFetch = ref('');
const updateProblemData = reactive<Problem>({
  _id: '',
  title: '',
  statement: '',
  geolin_ans_key: { hash: '', seed: 0 },
  result: '',
  solution: { steps: [] },
  llm_solution: null,
  theory_link: '',
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
  theory_link: '',
});
const currentEditProblemType = ref('');
const currentEditProblemSolutionStepsJson = ref('[]');
const currentEditProblemLlmSolutionJson = ref('');

const geolinPrefixToLoad = ref('');
const availableGeolinPrefixes = ref<string[]>([
  "tasks.linalg.linear_operators.matrix_decompositions.LU_decomposition.LU_decomposition_3x3",
  "tasks.linalg.linear_operators.matrix_decompositions.LU_decomposition.LU_decomposition_4x4",
  "tasks.linalg.linear_space.basis_transformation.basis_transformation_vector",
]);

const activeForm = ref<'management' | 'database' | 'update' | 'edit' | null>(null);

// Pagination computed properties
const totalPages = computed(() => Math.ceil(problems.value.length / itemsPerPage));
const paginatedProblems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return problems.value.slice(start, end);
});

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

// Helper function for rendering truncated statements with math
function renderTruncatedStatement(statement: string, maxLength: number): string {
  if (!statement) return ''
  
  let text = statement;
  
  // 1. Обрезаем по ключевым фразам (с учётом \textbf{})
  const cutoffPhrases = ['Пример ввода', 'Пример ответа', 'Ответ'];
  let earliestCutIndex = -1;
  
  for (const phrase of cutoffPhrases) {
    // Ищем фразу с префиксом \textbf{
    const withPrefix = `\\textbf{${phrase}`;
    const prefixIndex = text.indexOf(withPrefix);
    
    if (prefixIndex !== -1) {
      // Нашли с префиксом - обрезаем по префиксу
      if (earliestCutIndex === -1 || prefixIndex < earliestCutIndex) {
        earliestCutIndex = prefixIndex;
      }
    } else {
      // Ищем без префикса
      const phraseIndex = text.indexOf(phrase);
      if (phraseIndex !== -1) {
        if (earliestCutIndex === -1 || phraseIndex < earliestCutIndex) {
          earliestCutIndex = phraseIndex;
        }
      }
    }
  }
  
  // Обрезаем по самой ранней найденной фразе
  if (earliestCutIndex !== -1) {
    text = text.substring(0, earliestCutIndex);
  }
  
  // 2. Убираем множественные переносы строк (различные варианты)
  // Заменяем все варианты двойных переносов на одинарные
  text = text
    // HTML переносы
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>') // двойной <br>
    .replace(/<\/span>\s*<br\s*\/?>\s*<br\s*\/?>/gi, '</span><br>') // </span><br><br>
    .replace(/<br\s*\/?>\s*<\/span>\s*<br\s*\/?>/gi, '<br></span>') // <br></span><br>
    // Текстовые переносы
    .replace(/\r?\n\s*\r?\n/g, '\n') // двойной \n или \r\n
    .replace(/\r\n\s*\r\n/g, '\r\n') // двойной \r\n
    // Смешанные варианты
    .replace(/<br\s*\/?>\s*\n/gi, '<br>') // <br> + \n
    .replace(/\n\s*<br\s*\/?>/gi, '<br>') // \n + <br>
    // Тройные и более переносы
    .replace(/(<br\s*\/?>){3,}/gi, '<br><br>') // три и более <br>
    .replace(/(\r?\n){3,}/g, '\n\n') // три и более \n
    // Убираем лишние пробелы вокруг переносов
    .replace(/\s*<br\s*\/?>\s*/gi, '<br>')
    .trim();
  
  // 3. Обрезаем до maxLength
  const truncated = text.length <= maxLength ? text : text.substring(0, maxLength);
  
  // 4. Рендерим с KaTeX
  try {
    return renderMessage(truncated + (text.length > maxLength ? '...' : ''));
  } catch (e) {
    // Fallback если рендеринг не удался
    return truncated + (text.length > maxLength ? '...' : '');
  }
}

// Open edit modal
function editProblem(problem: Problem) {
  showEditForm(problem)
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingProblem.value = null
  if (apiResponse.managementUpdateProblem) {
    apiResponse.managementUpdateProblem = null
  }
}

async function handleUpdateProblem() {
  await updateProblemFromManagementTab()
  if (apiResponse.managementUpdateProblem) {
    if (!apiResponse.managementUpdateProblem.error) {
      // Успешно обновлено
      showSuccessToast('✅ Задача успешно сохранена!')
      // Закрываем модалку сразу
      closeEditModal()
      // Перезагружаем список после закрытия
      await fetchAllProblems()
    } else {
      // Показываем ошибку в toast на 3 секунды
      showErrorToast(apiResponse.managementUpdateProblem.message || 'Не удалось обновить задачу')
    }
  }
}

function showEditForm(problem: Problem) {
  editingProblem.value = JSON.parse(JSON.stringify(problem)); // Глубокое копирование
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

    // Получаем текущий тип задачи для редактирования
    const assignedTypes = problemTypesMap.value[editingProblem.value._id || editingProblem.value.id || ''] || [];
    currentEditProblemType.value = assignedTypes.length > 0 ? assignedTypes[0] : ''; // Берем первый тип, если их несколько (для простоты формы)
  }
}

function cancelEdit() {
  editingProblem.value = null;
  apiResponse.managementUpdateProblem = null;
}

async function updateProblemFromManagementTab() {
  if (!editingProblem.value || !(editingProblem.value._id || editingProblem.value.id)) {
    apiResponse.managementUpdateProblem = { error: true, message: "ID редактируемой задачи не найден." };
    return;
  }
  const problemIdToUpdate = editingProblem.value._id || editingProblem.value.id;

  try {
    const steps = JSON.parse(currentEditProblemSolutionStepsJson.value || '[]');
    const llmSolution = tryParseJson(currentEditProblemLlmSolutionJson.value, currentEditProblem.llm_solution);

    // В PUT запросе отправляем только те поля, которые редактируются на этой вкладке + GeoLin (т.к. он часть Problem)
    // Не отправляем result, т.к. его нет в форме редактирования на этой вкладке.
    const payload: Partial<Problem> = {
      title: currentEditProblem.title,
      statement: currentEditProblem.statement,
      solution: { steps },
      llm_solution: llmSolution,
      theory_link: currentEditProblem.theory_link,
      // Важно: geolin_ans_key нужно взять из оригинального editingProblem.value, т.к. оно не редактируется в этой форме
      geolin_ans_key: editingProblem.value.geolin_ans_key
    };

    const updateResponse = await makeApiCall(`/problems/${problemIdToUpdate}`, 'PUT', payload, 'managementUpdateProblem', 'managementUpdateProblem');

    if (updateResponse && !updateResponse.error) {
      // Обновление типа задачи, если он изменился
      const oldAssignedTypes = problemTypesMap.value[problemIdToUpdate || ''] || [];
      const oldType = oldAssignedTypes.length > 0 ? oldAssignedTypes[0] : '';
      const newType = currentEditProblemType.value.trim();

      if (newType !== oldType && problemIdToUpdate) {
        // Логика удаления старого типа (если он был) и присвоения нового
        // Это упрощенная логика: API не поддерживает удаление конкретной привязки тип-задача.
        // Мы просто присвоим новый тип. Если API /assign_type перезаписывает или добавляет, это ок.
        // Если нужно именно "изменить" тип, то бэкенд должен поддерживать удаление старой связи.
        // Пока предполагаем, что присвоение нового типа достаточно, или пользователь должен будет вручную управлять типами через вкладку "База задач"
        if (newType) { // Если новый тип не пустой
            const typePayload: ProblemWithTypePayload = { problem_id: problemIdToUpdate, type_name: newType };
            await makeApiCall('/assign_type', 'POST', typePayload, 'assignType', 'assignType'); // Можно использовать общий assignType ключ
        }
      }
    }
  } catch (e) {
    console.error("Ошибка при обновлении задачи (management tab):", e);
    apiResponse.managementUpdateProblem = { error: true, message: "Ошибка парсинга JSON или API (management tab)", details: e };
  }
}


async function makeApiCall(endpoint: string, method: string, body?: any, loadingKey?: keyof typeof apiCallLoading, responseKey?: keyof typeof apiResponse) {
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
    } else if (endpoint === '/problems' && method === 'GET' && !loadingKey && !responseKey) {
        error.value = e;
    }
    return { error: true, details: e };
  } finally {
    if (loadingKey) apiCallLoading[loadingKey] = false;
  }
}

async function populateProblemTypesMap() {
  console.log("Attempting to populate problem types map...");
  if (!apiCallLoading.fetchAllTypes && allTypes.value.length === 0) {
      await fetchAllTypes(); // Убедимся, что типы загружены
  }

  if (allTypes.value && allTypes.value.length > 0 && !apiResponse.fetchAllTypesError) {
    console.log("Fetched unique types for map:", allTypes.value);

    const tempMap: Record<string, string[]> = {};

    for (const typeStr of allTypes.value) {
      const problemsForTypeResponse = await makeApiCall(`/get_problems_by_type?problem_type=${encodeURIComponent(typeStr)}`, 'GET');

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
    console.log("Problem types map populated:", problemTypesMap.value);
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
    const response = await fetch(`${LLMATH_PROBLEMS_API_URL}/problems`, {
      credentials: 'include'
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }
    const data = await response.json();
    problems.value = data;
    await fetchAllTypes(); // Загружаем типы
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

function tryParseJson(jsonString: string, defaultValue: any = null) {
  if (!jsonString || jsonString.trim() === '') return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn("Failed to parse JSON, returning as text: ", jsonString, e);
    return jsonString;
  }
}

async function createProblem() {
  try {
    const steps = JSON.parse(newProblemSolutionStepsJson.value || '[]');
    const llmSolution = tryParseJson(newProblemLlmSolutionJson.value, null);

    const problemToCreate: Omit<Problem, '_id' | 'id'> = {
      ...newProblem,
      solution: { steps },
      llm_solution: llmSolution,
    };
    await makeApiCall('/problems', 'POST', problemToCreate, 'createProblem', 'createProblem');
    fetchAllProblems();
    newProblem.title = '';
    newProblem.statement = '';
    newProblem.geolin_ans_key = { hash: '', seed: 0 };
    newProblem.result = '';
    newProblemSolutionStepsJson.value = '[]';
    newProblemLlmSolutionJson.value = '';
    newProblem.llm_solution = null;
    newProblem.theory_link = '';

  } catch (e) {
    console.error("Ошибка парсинга JSON или при создании задачи:", e);
    apiResponse.createProblem = { error: true, message: "Ошибка парсинга JSON для шагов/LLM решения или API", details: e };
  }
}

async function fetchProblemById() {
  if (!problemIdToFetch.value) return;
  foundProblemByIdList.value = [];
  const responseData = await makeApiCall(`/problems/${problemIdToFetch.value}`, 'GET', undefined, 'fetchProblemById', 'fetchProblemById');
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
  updateProblemData.theory_link = problem.theory_link || '';

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
    apiResponse.updateProblem = { error: true, details: "Не удалось загрузить задачу для обновления." };
  }
}

async function updateProblem() {
  const idForUpdate = updateProblemData._id || updateProblemData.id;
  if (!idForUpdate) {
    apiResponse.updateProblem = { error: true, message: "ID для обновления не найден" };
    return;
  }
  try {
    const steps = JSON.parse(updateProblemSolutionStepsJson.value || '[]');
    const llmSolution = tryParseJson(updateProblemLlmSolutionJson.value, updateProblemData.llm_solution);

    const problemToUpdatePayload: Omit<Problem, '_id' | 'id'> & { id?: string } = {
      title: updateProblemData.title,
      statement: updateProblemData.statement,
      geolin_ans_key: updateProblemData.geolin_ans_key,
      result: updateProblemData.result,
      solution: { steps },
      llm_solution: llmSolution,
      theory_link: updateProblemData.theory_link,
    };

    await makeApiCall(`/problems/${idForUpdate}`, 'PUT', problemToUpdatePayload, 'updateProblem', 'updateProblem');
    fetchAllProblems();
  } catch (e) {
     console.error("Ошибка парсинга JSON или при обновлении задачи:", e);
    apiResponse.updateProblem = { error: true, message: "Ошибка парсинга JSON или API", details: e };
  }
}

function setProblemToDelete(id: string | undefined) {
    if (id) {
        problemIdToDeleteValue.value = id;
    } else {
        console.warn("ID для удаления не предоставлен");
        apiResponse.deleteProblem = { error: true, message: "ID для удаления не предоставлен" };
    }
}

async function deleteProblemFromDbTab() {
  if (!problemIdToDeleteValue.value) return;
  await makeApiCall(`/problems/${problemIdToDeleteValue.value}`, 'DELETE', undefined, 'deleteProblem', 'deleteProblem');
  fetchAllProblems();
  problemIdToDeleteValue.value = '';
}

async function deleteProblemByIdAndRefresh(problemId: string | undefined) {
  if (!problemId) {
    console.warn("ID для удаления не предоставлен (management tab)");
    apiResponse.deleteProblem = { error: true, message: "ID для удаления не предоставлен (management tab)" };
    return;
  }
  await makeApiCall(`/problems/${problemId}`, 'DELETE', undefined, 'deleteProblem', 'deleteProblem');
  await fetchAllProblems();
}

async function addProblemFromManagementTab() {
  apiResponse.managementAddProblem = null;
  try {
    const steps = JSON.parse(managementNewProblemSolutionStepsJson.value || '[]');
    const llmSolution = tryParseJson(managementNewProblemLlmSolutionJson.value, null);

    const problemToCreatePayload: Omit<Problem, '_id' | 'id' | 'result'> = {
      title: managementNewProblem.title,
      statement: managementNewProblem.statement,
      geolin_ans_key: {
        hash: managementNewProblem.geolin_ans_key.hash,
        seed: Number(managementNewProblem.geolin_ans_key.seed) || 0,
      },
      solution: { steps },
      llm_solution: llmSolution,
      theory_link: managementNewProblem.theory_link,
    };

    const createdProblemResponse = await makeApiCall('/problems', 'POST', problemToCreatePayload, 'managementAddProblem', 'managementAddProblem');

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

      managementNewProblem.title = '';
      managementNewProblem.statement = '';
      managementNewProblem.geolin_ans_key = { hash: '', seed: 0 };
      managementNewProblemSolutionStepsJson.value = '[]';
      managementNewProblemLlmSolutionJson.value = '';
      managementNewProblem.llm_solution = null;
      managementNewProblem.theory_link = '';
      managementNewProblemType.value = '';


    } else {
      console.error("Ошибка при создании задачи (management tab):", createdProblemResponse?.details);
    }

  } catch (e: any) {
    console.error("Ошибка парсинга JSON или другая ошибка при добавлении задачи (management tab):", e);
    apiResponse.managementAddProblem = { error: true, message: "Ошибка парсинга JSON или API (management tab)", details: e };
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
  const responseData = await makeApiCall(`/get_problems_by_type?problem_type=${encodeURIComponent(typeToFetchProblemsBy.value)}`, 'GET', undefined, 'fetchProblemsByType', 'fetchProblemsByType');
  if (responseData && !responseData.error && Array.isArray(responseData)) {
    foundProblemsByTypeList.value = responseData as Problem[];
    apiResponse.fetchProblemsByType = null;
  }
}

async function fetchAllTypes() {
 await makeApiCall('/types', 'GET', undefined, 'fetchAllTypes', 'fetchAllTypesError');
}

function showProblemDetails(problem: Problem) {
  selectedProblem.value = problem;
}

function closeModal() {
  selectedProblem.value = null;
}

// Функция для вызова GeoLin прокси эндпоинта
async function fetchFromGeolinProxy(prefix: string) {
  apiCallLoading.loadFromGeolin = true;
  apiResponse.loadFromGeolin = null;
  try {
    // Запрашиваем задачу со случайным seed, генерируемым на сервере
    const url = `${MATHLLM_BACKEND_API_URL}/api/v1/geolin-proxy/problem-data?prefix=${encodeURIComponent(prefix)}`;
    console.log("Запрашиваем задачу со случайным seed");

    const response = await fetch(url, {
      credentials: 'include'
    });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error || `HTTP error! status: ${response.status}`;
      console.error("Ошибка от GeoLin API:", data);
      throw new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    }

    // Добавляем проверку полученных данных
    console.log("Получены данные от GeoLin:", data);

    apiResponse.loadFromGeolin = data;
    return data;
  } catch (e: any) {
    console.error("Ошибка при загрузке из GeoLin прокси:", e);
    apiResponse.loadFromGeolin = { error: e.message || 'Неизвестная ошибка при запросе к GeoLin прокси' };
    return null;
  } finally {
    apiCallLoading.loadFromGeolin = false;
  }
}

// Modal handlers
async function handleGeolinImport() {
  await loadFromGeolin()
  if (apiResponse.loadFromGeolin && !apiResponse.loadFromGeolin.error) {
    showGeolinImportModal.value = false
    showCreateModal.value = true // Открываем форму создания с загруженными данными
  }
}

function closeCreateModal() {
  showCreateModal.value = false
  // Опционально: очистить сообщения об ошибках
  if (apiResponse.managementAddProblem) {
    apiResponse.managementAddProblem = null
  }
}

async function handleCreateProblem() {
  await addProblemFromManagementTab()
  if (apiResponse.managementAddProblem) {
    if (apiResponse.managementAddProblem.success) {
      // Успешно создано
      showSuccessToast('✅ Задача успешно создана!')
      // Закрываем модалку
      showCreateModal.value = false
      // Очищаем форму
      managementNewProblem.title = ''
      managementNewProblem.statement = ''
      managementNewProblem.geolin_ans_key = { hash: '', seed: 0 }
      managementNewProblemSolutionStepsJson.value = '[]'
      managementNewProblemLlmSolutionJson.value = ''
      managementNewProblem.llm_solution = null
      managementNewProblem.theory_link = ''
      managementNewProblemType.value = ''
      apiResponse.managementAddProblem = null
      // Перезагружаем список после закрытия
      await fetchAllProblems()
    } else if (apiResponse.managementAddProblem.error) {
      // Показываем ошибку в toast на 3 секунды
      showErrorToast(apiResponse.managementAddProblem.message || 'Не удалось создать задачу')
    }
  }
}

async function loadFromGeolin() {
  if (!geolinPrefixToLoad.value) {
    apiResponse.loadFromGeolin = { error: "Префикс GeoLin не может быть пустым." };
    return;
  }
  const data = await fetchFromGeolinProxy(geolinPrefixToLoad.value);
  if (data && !data.error) {
    console.log("Успешно получены данные от GeoLin:", data);

    managementNewProblem.title = data.name || '';
    managementNewProblem.statement = data.condition || '';
    managementNewProblem.geolin_ans_key.hash = data.hash || '';

    // Обновленная логика работы с seed - приоритет отдаём непосредственно seed из ответа
    if (data.seed !== undefined && data.seed !== null) {
      managementNewProblem.geolin_ans_key.seed = Number(data.seed);
      console.log("Полученный seed из GeoLin API:", data.seed);

      // Добавляем сообщение для пользователя
      const seedDiv = document.createElement('div');
      seedDiv.innerHTML = `<div style="color: green; margin-top: 10px; font-weight: bold;">Загружена задача с уникальным seed: ${data.seed}</div>`;
      setTimeout(() => {
        try {
          const seedField = document.getElementById('mgmtNewGeoSeed');
          if (seedField && seedField.parentNode) {
            seedField.parentNode.appendChild(seedDiv);
            setTimeout(() => {
              if (seedField.parentNode && seedDiv.parentNode === seedField.parentNode) {
                seedField.parentNode.removeChild(seedDiv);
              }
            }, 5000); // Убираем сообщение через 5 секунд
          }
        } catch (e) {
          console.error("Ошибка при создании уведомления о seed:", e);
        }
      }, 100);
    } else if (data.problemParams) {
      try {
        const paramObj = JSON.parse(data.problemParams);
        if (paramObj && typeof paramObj.seed === 'number') {
          managementNewProblem.geolin_ans_key.seed = paramObj.seed;
          console.log("Извлечён seed из problem_params:", paramObj.seed);
        } else {
          managementNewProblem.geolin_ans_key.seed = 0;
          console.log("В problem_params нет поля seed, устанавливаем значение по умолчанию: 0");
        }
      } catch (e) {
        console.error("Ошибка при парсинге problem_params:", e, data.problemParams);
        managementNewProblem.geolin_ans_key.seed = 0;
        console.log("Невозможно разобрать problem_params, устанавливаем seed=0");
      }
    } else {
      managementNewProblem.geolin_ans_key.seed = 0;
      console.log("Ни seed, ни problem_params не получены от GeoLin, устанавливаем значение по умолчанию: 0");
    }

    // Очищаем поля решения, так как они не приходят от GeoLin
    managementNewProblemSolutionStepsJson.value = '[]';
    managementNewProblem.solution = { steps: [] };
    managementNewProblemLlmSolutionJson.value = '';
    managementNewProblem.llm_solution = null;
  } else {
    console.error("Не удалось получить данные из GeoLin:", data?.error || "неизвестная ошибка");
  }
}

// Функция для получения решения от LLM
async function getLlmSolution(formType: 'management' | 'database' | 'update' | 'edit') {
  activeForm.value = formType;
  let problemStatement = '';

  if (formType === 'management') {
    problemStatement = managementNewProblem.statement;
  } else if (formType === 'database') {
    problemStatement = newProblem.statement;
  } else if (formType === 'update') {
    problemStatement = updateProblemData.statement;
  } else if (formType === 'edit') {
    problemStatement = currentEditProblem.statement;
  }

  if (!problemStatement) {
    alert('Поле "Условие" не может быть пустым для получения решения LLM');
    return;
  }

  apiCallLoading.getLlmSolution = true;

  try {
    // Создаем клиент axios с базовым URL и настройками для авторизации
    const client = axios.create({
      baseURL: MATHLLM_BACKEND_API_URL,
      withCredentials: true, // Важно для передачи cookies аутентификации
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Отправляем запрос через axios
    const response = await client.post('/api/v1/llm/solve-problem', {
      problemDescription: problemStatement
    });

    const solution = response.data.solution;

    // Обновляем соответствующее поле в зависимости от типа формы
    if (formType === 'management') {
      managementNewProblemLlmSolutionJson.value = solution;
      managementNewProblem.llm_solution = solution;
    } else if (formType === 'database') {
      newProblemLlmSolutionJson.value = solution;
      newProblem.llm_solution = solution;
    } else if (formType === 'update') {
      updateProblemLlmSolutionJson.value = solution;
      updateProblemData.llm_solution = solution;
    } else if (formType === 'edit') {
      currentEditProblemLlmSolutionJson.value = solution;
      currentEditProblem.llm_solution = solution;
    }
  } catch (error) {
    console.error('Ошибка при получении решения от LLM:', error);
    // Более информативное сообщение об ошибке
    let errorMessage = 'Неизвестная ошибка';
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.status === 401
        ? 'Ошибка авторизации. Возможно, вам нужно выполнить вход в систему.'
        : `Ошибка: ${error.response?.status || 'сетевая ошибка'} - ${error.response?.data || error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    alert(`Ошибка при получении решения от LLM: ${errorMessage}`);
  } finally {
    apiCallLoading.getLlmSolution = false;
  }
}

async function checkSolution(formType: 'management' | 'database' | 'update' | 'edit') {
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
  
  console.log('🔍 CheckSolution - Входные данные:', {
    formType,
    problemStatement: problemStatement.substring(0, 200) + '...',
    solution: solution.substring(0, 200) + '...',
    hash,
    seed
  });
  
  if (!problemStatement) {
    alert('Поле "Условие" не может быть пустым для проверки решения');
    return;
  }
  
  if (!solution) {
    alert('Поле "Решение LLM" не может быть пустым для проверки');
    return;
  }
  
  if (!hash) {
    alert('Hash задачи отсутствует. Невозможно проверить решение.');
    return;
  }
  
  apiCallLoading.checkSolution = true;
  
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
      problemStatement: problemStatement,
      solution: solution
    };
    
    console.log('📤 Отправляем запрос на extract-answer:', extractRequestData);
    
    const extractResponse = await client.post('/api/v1/llm/extract-answer', extractRequestData);
    
    console.log('📥 Ответ от extract-answer:', extractResponse.data);
    
    const extractedAnswer = extractResponse.data.extractedAnswer;
    
    if (!extractedAnswer) {
      throw new Error('LLM не смог извлечь ответ из решения - получен пустой ответ');
    }
    
    console.log('🎯 Извлеченный ответ:', extractedAnswer);
    
    // Шаг 2: Проверяем извлеченный ответ через GeoLin
    const checkRequestData = {
      hash: hash,
      answerAttempt: extractedAnswer,
      seed: seed
    };
    
    console.log('📤 Отправляем запрос на check-answer-direct:', checkRequestData);
    
    const checkResponse = await client.post('/api/v1/geolin-proxy/check-answer-direct', checkRequestData);
    
    console.log('📥 Ответ от check-answer-direct:', checkResponse.data);
    
    const checkResult = checkResponse.data;
    
    // Показываем результат во всплывающем окне
    showCheckResultModal({
      problemStatement,
      solution,
      extractedAnswer,
      checkResult,
      hash,
      seed
    });
    
  } catch (error) {
    console.error('❌ Ошибка при проверке решения:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('📋 Детали ошибки axios:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
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
    alert(`Ошибка при проверке решения: ${errorMessage}`);
  } finally {
    apiCallLoading.checkSolution = false;
  }
}

// Состояние для модального окна результатов проверки
const checkResultModal = reactive({
  show: false,
  problemStatement: '',
  solution: '',
  extractedAnswer: '',
  checkResult: null as any,
  hash: '',
  seed: undefined as number | undefined
});

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

onMounted(() => {
  fetchAllProblems(); // Это также вызовет fetchAllTypes и populateProblemTypesMap
});

</script>

<style scoped>
.llmath-problems-view {
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
}

/* Modern Tabs Navigation */
.tabs-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0;
  background: white;
  border-radius: 8px 8px 0 0;
  padding: 8px 8px 0 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  text-decoration: none;
  border-radius: 6px 6px 0 0;
}

.tab-btn:hover {
  color: #1976d2;
  background: #f5f5f5;
}

.tab-btn.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
  background: #f8f9ff;
}

.tab-icon {
  font-size: 18px;
}

.tab-link {
  margin-left: auto;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover {
  background: #1565c0;
}

.btn-success {
  background: #4caf50;
  color: white;
}

.btn-success:hover {
  background: #45a049;
}

.btn-icon {
  font-size: 16px;
}

/* Problems Section */
.problems-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.problems-section h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

/* Pagination */
.pagination {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #1976d2;
  color: #1976d2;
}

.pagination-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Modern Table */
.problems-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.problems-table thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.problems-table th {
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.problems-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.problems-table tbody tr:hover {
  background: #e8f0fe;
}

.problems-table tbody tr:last-child {
  border-bottom: none;
}

.problems-table td {
  padding: 16px;
  vertical-align: middle;
}

.problem-type {
  display: inline-block;
  padding: 6px 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.problem-title {
  font-weight: 600;
  color: #333;
  line-height: 1.5;
  font-size: 15px;
}

.problem-statement {
  color: #666;
  line-height: 1.7;
  font-size: 14px;
}

.problem-statement :deep(.katex) {
  font-size: 1em;
  color: #1976d2;
}

.action-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-icon-small {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit {
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
}

.btn-edit:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 4px 12px rgba(253, 203, 110, 0.4);
}

.btn-delete {
  background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
  color: white;
}

.btn-delete:hover:not(:disabled) {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 4px 12px rgba(214, 48, 49, 0.4);
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Messages */
.loading-message,
.info-message {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}

.loading-message {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1976d2;
}

.info-message {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  color: #f57c00;
}

/* Legacy styles (keep for compatibility) */
.video-app-link {
  display: inline-block;
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.video-app-link:hover {
  background-color: #1976D2;
}

.tabs {
  margin-bottom: 20px;
  border-bottom: 2px solid #ccc;
}

.tabs button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #00318b;
  color: white;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-right: 5px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
}

.tabs button.active {
  background-color: #fff;
  color: #00318b;
  border-left: 1px solid #ccc;
  border-top: 1px solid #ccc;
  border-right: 1px solid #ccc;
  border-bottom: 2px solid #fff;
  font-weight: bold;
}

.tab-content {
  padding-top: 20px;
}

.controls {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.controls button {
  padding: 10px 15px;
  font-size: 16px;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
}

.controls button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.error-message {
  color: red;
  background-color: #ffe0e0;
  border: 1px solid red;
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.error-message pre, .api-response pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  padding: 8px;
  border-radius: 4px;
}

.error-message pre {
  background-color: #f8f8f8;
  border: 1px solid #eee;
}

.problems-list table, .problems-list-simple table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.problems-list th,
.problems-list td,
.problems-list-simple th,
.problems-list-simple td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.problems-list th, .problems-list-simple th {
  background-color: #00318b;
  color: #fff;
}

.problems-list-simple td {
  background-color: #2e2e2e;
  color: #f0f0f0;
  border: 1px solid #555;
}
.problems-list td {
  background-color: #3a3a3a;
  color: #f0f0f0;
  border: 1px solid #555;
}

.statement, .result, .llm-solution-preview, .llm-solution-preview-simple {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 100px;
  overflow-y: auto;
  background-color: #004b3b;
  color: #f0f0f0;
  padding: 5px;
  border-radius: 3px;
  font-size: 0.9em;
}
.llm-solution-preview, .llm-solution-preview-simple {
  max-height: 70px;
  background-color: #3b004b;
}
.llm-solution-preview-simple {
    background-color: #4a003b; /* Немного другой оттенок для simple таблицы, если нужно */
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #466579;
  color: #f0f0f0;
  padding: 30px;
  border-radius: 8px;
  width: 80%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: #fff;
}

.modal-content pre {
  background-color: #000000;
  color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.api-section {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #444;
  border-radius: 8px;
  background-color: #333;
  color: #f0f0f0;
}
.api-section h2 {
  margin-top: 0;
  border-bottom: 1px solid #555;
  padding-bottom: 10px;
  margin-bottom: 20px;
  color: #fff;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #e0e0e0;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #555;
  border-radius: 4px;
  box-sizing: border-box;
  background-color: #fff;
  color: #333;
}
.form-group textarea {
  min-height: 70px;
  resize: vertical;
}
.form-group small {
  font-size: 0.85em;
  color: #bbb;
}
.api-section button {
   padding: 10px 15px;
   font-size: 15px;
   background-color: #007bff;
   color: white;
   border: none;
   border-radius: 4px;
   cursor: pointer;
   margin-top:10px;
   margin-right: 10px;
}

.api-section button.btn-cancel {
    background-color: #6c757d;
}

.api-section button:disabled {
  background-color: #555;
  color: #999;
}
.api-response {
  margin-top: 20px;
  padding: 15px;
  background-color: #282c34;
  border: 1px solid #444;
  border-radius: 4px;
  color: #f0f0f0;
}
.api-response pre {
  background-color: #1e1e1e;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #383838;
  color: #d4d4d4;
}

.btn-details {
  background-color: #007bff !important;
  color: white !important;
}
.btn-edit {
  background-color: #ffc107 !important;
  color: #212529 !important;
}
.btn-delete {
    background-color: #dc3545 !important;
    color: white !important;
}
.small-btn {
    padding: 4px 8px !important;
    font-size: 0.8em !important;
    margin-right: 5px;
    margin-left: 0;
}
.small-btn:last-of-type {
    margin-right: 0;
}
.result-table {
  margin-top: 15px;
}
.result-table table {
    width: 100%;
    border-collapse: collapse;
}

.statement-simple {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 60px;
  overflow-y: auto;
  font-size: 0.9em;
  color: #ddd;
  margin: 0;
  padding: 0;
  background-color: transparent;
}

.form-section {
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #444;
}

.edit-form-section {
  margin-bottom: 30px; /* Добавим отступ снизу для формы редактирования */
}

.form-section h2 {
   border-bottom: 1px solid #555;
   padding-bottom: 10px;
   margin-bottom: 20px;
}

.loading-message, .info-message {
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 5px;
    text-align: center;
}
.loading-message {
    background-color: #2c3e50;
    color: #ecf0f1;
}
.info-message {
    background-color: #1abc9c;
    color: white;
}

.geolin-load-section {
  margin-bottom: 30px; /* Отступ между секцией GeoLin и формой добавления */
}

.btn-llm-solution {
  background-color: #17a2b8 !important;
  color: white !important;
  margin-top: 0 !important; /* Убираем верхний отступ */
  padding: 5px 15px !important; /* Немного увеличиваем горизонтальные отступы */
  font-size: 0.9em !important; /* Чуть уменьшаем размер шрифта */
}

/* Стили для контейнера с лоадером */
.textarea-container {
  position: relative;
}

.solution-loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(51, 51, 51, 0.7);
  border-radius: 4px;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loader-text {
  color: #fff;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-check-solution {
  background-color: #28a745 !important;
  color: white !important;
  margin-top: 0 !important;
  padding: 5px 15px !important;
  font-size: 0.9em !important;
}

.btn-check-solution:disabled {
  background-color: #6c757d !important;
  color: #aaa !important;
}

/* Стили для модального окна результатов проверки */
.check-result-modal {
  max-width: 900px;
  max-height: 80vh;
  overflow-y: auto;
}

.check-result-section {
  margin-bottom: 25px;
  padding: 15px;
  border: 1px solid #555;
  border-radius: 8px;
  background-color: #2a2a2a;
}

.check-result-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #fff;
  font-size: 1.1em;
}

.solution-preview pre {
  background-color: #1a1a1a;
  color: #e0e0e0;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #444;
  max-height: 150px;
  overflow-y: auto;
}

.extracted-answer pre {
  background-color: #003366;
  color: #66ccff;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #0066cc;
  font-weight: bold;
  text-align: center;
}

.check-result {
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.check-result.correct {
  background-color: #155724;
  border: 2px solid #28a745;
  color: #d4edda;
}

.check-result.incorrect {
  background-color: #721c24;
  border: 2px solid #dc3545;
  color: #f8d7da;
}

.result-status {
  font-size: 1.3em;
  margin-bottom: 10px;
}

.status-icon {
  font-size: 1.5em;
  margin-right: 10px;
}

.result-message {
  font-style: italic;
  margin-top: 10px;
}

.check-details {
  background-color: #1a1a1a;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #444;
}

.check-details p {
  margin: 5px 0;
  color: #e0e0e0;
}

.check-details code {
  background-color: #333;
  color: #66ccff;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

/* Modal Form Styles */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
  border-color: #ccc;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group-meta {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.meta-info {
  display: flex;
  gap: 32px;
  font-size: 13px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.meta-label {
  color: #666;
  font-weight: 600;
}

.meta-value {
  color: #333;
  font-family: 'Consolas', 'Monaco', monospace;
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.form-group-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.form-group-disabled label {
  color: #999;
}

.form-textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

/* Loading Indicator */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: #f8f9ff;
  border-radius: 8px;
  margin-top: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-indicator p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* Success/Error Boxes */
.success-box {
  padding: 16px;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  color: #155724;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-box {
  padding: 16px;
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
}

.error-box strong {
  display: block;
  margin-bottom: 4px;
}

/* Form select */
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

/* Error Toast */
.error-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #f44336;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  font-size: 16px;
  font-weight: 500;
  max-width: 500px;
  text-align: center;
}

/* Success Toast */
.success-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #4caf50;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  font-size: 16px;
  font-weight: 500;
  max-width: 500px;
  text-align: center;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -60%);
}

/* Light scrollbar for modal */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Responsive */
@media (max-width: 768px) {
  .meta-info {
    flex-direction: column;
    gap: 12px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-sm {
    width: 100%;
  }
}

/* Video iframe */
.videos-tab {
  padding: 0;
  margin: -24px -24px 0 -24px;
  background: white;
  height: calc(100vh - 48px);
  overflow: hidden;
}

.video-iframe-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style> 

