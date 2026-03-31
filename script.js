import { collection, getDocs, setDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
class StudyHub {
    constructor() {
        this.tasks = [];
        this.currentView = 'grid';
        this.currentFilter = {
            priority: '',
            status: '',
            project: ''
        };
        this.editingTaskId = null;
        this.deletingTaskId = null;
        
        // Quiz properties
        this.currentModule = 'tasks';
        this.quizData = {
            questions: [],
            currentQuestionIndex: 0,
            userAnswers: [],
            score: 0,
            timeStarted: null,
            timeEnded: null,
            timer: null,
            timeRemaining: 30
        };
        this.quizStats = {
            totalPoints: 0,
            streak: 0,
            totalQuizzes: 0,
            totalScore: 0,
            achievements: []
        };
        this.userQuizzes = [];
        this.currentQuizCreation = {
            questions: [],
            settings: {
                questionCount: 5,
                timerDuration: 30,
                includeMCQ: true,
                includeIdentification: true
            }
        };
        
        this.settings = {
            showCompleted: true,
            defaultPriority: 'medium',
            overdueAlerts: true
        };

        // Writing Tool
        this.documents = [];
        this.currentDocId = null;
        this.outlineSections = [];
        this.citations = [];

        // Focus Mode
        this.focusTimer = null;
        this.focusRunning = false;
        this.focusWorkMinutes = 25;
        this.focusBreakMinutes = 5;
        this.focusPhase = 'work'; // 'work' | 'break'
        this.focusSecondsLeft = 25 * 60;
        this.focusSessionsCompleted = 0;
        this.focusTotalMinutes = 0;
        this.blockedSites = [];

        // Ambient audio
        this.ambientAudio = null;
        this.ambientVolume = 0.5;
        // ── Replace these URLs with your Firebase Storage download URLs ──
        this.ambientUrls = {
            rain:   'https://cdn.jsdelivr.net/gh/NicoJohnSanLorenzo/bsis3a-EdSynch@main/assets/mixkit-light-rain-loop-1253.wav',
            cricket:   'https://cdn.jsdelivr.net/gh/NicoJohnSanLorenzo/bsis3a-EdSynch@main/assets/mixkit-night-crickets-near-the-swamp-1782.wav',
            forest: 'https://cdn.jsdelivr.net/gh/NicoJohnSanLorenzo/bsis3a-EdSynch@main/assets/mixkit-natural-ambience-with-flowing-water-and-birds-61.wav',
            bird:  'https://cdn.jsdelivr.net/gh/NicoJohnSanLorenzo/bsis3a-EdSynch@main/assets/mixkit-forest-birds-ambience-1210.wav'
        };

        // Collaboration
        this.groups = [];
        this.activeGroupId = null;

        // Marketplace
        this.marketItems = [];

        // Forum
        this.forumPosts = [];
        this.forumActiveCategory = 'all';

        // Gamification
        this.xp = 0;
        this.badges = [];

        this.init();
    }

    async init() {
        await this.loadTasks();
        this.loadQuizData();
        this.loadUserQuizzes();
        await this.loadNewModuleData();
        this.bindEvents();
        this.render();
        this.updateStats();
        this.updateQuizStats();
        this.initTheme();
        this.loadSettings();
        this.updateXPDisplay();
    }

    bindEvents() {
        // Add task buttons
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('emptyStateAddBtn').addEventListener('click', () => this.openTaskModal());

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));

        // Delete modal events
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());

        // View toggle
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.closest('[data-view]').dataset.view));
        });

        // Filters
        document.getElementById('priorityFilter').addEventListener('change', (e) => {
            this.currentFilter.priority = e.target.value;
            this.render();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilter.status = e.target.value;
            this.render();
        });

        document.getElementById('projectFilter').addEventListener('change', (e) => {
            this.currentFilter.project = e.target.value;
            this.render();
        });

        // Close modals on outside click
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.closeTaskModal();
        });

        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') this.closeDeleteModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
                this.closeDeleteModal();
                this.closeQuizCreationModal();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openTaskModal();
            }
        });

        // Module navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchModule(e.target.closest('.nav-tab').dataset.module));
        });

        // Quiz events
        document.getElementById('createQuizBtn').addEventListener('click', () => this.openQuizCreationModal());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipQuestion());
        document.getElementById('submitAnswerBtn').addEventListener('click', () => this.submitAnswer());
        document.getElementById('retakeQuizBtn').addEventListener('click', () => this.retakeQuiz());
        document.getElementById('newQuizBtn').addEventListener('click', () => this.resetQuiz());

        // Quiz creation modal events
        document.getElementById('closeQuizCreationModal').addEventListener('click', () => this.closeQuizCreationModal());
        document.getElementById('cancelQuizCreationBtn').addEventListener('click', () => this.closeQuizCreationModal());
        document.getElementById('saveQuizBtn').addEventListener('click', () => this.saveQuiz());
        document.getElementById('addMCQBtn').addEventListener('click', () => this.addMCQQuestion());
        document.getElementById('addIdentificationBtn').addEventListener('click', () => this.addIdentificationQuestion());

        // Close quiz creation modal on outside click
        document.getElementById('quizCreationModal').addEventListener('click', (e) => {
            if (e.target.id === 'quizCreationModal') this.closeQuizCreationModal();
        });

        // Burger / side panel
        document.getElementById('burgerBtn').addEventListener('click', () => this.openSidePanel());
        document.getElementById('sidePanelClose').addEventListener('click', () => this.closeSidePanel());
        document.getElementById('sidePanelOverlay').addEventListener('click', () => this.closeSidePanel());

        // Close side panel on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSidePanel();
        });

        // Settings controls
        document.getElementById('settingShowCompleted').addEventListener('change', (e) => {
            this.settings.showCompleted = e.target.checked;
            this.saveSettings();
            this.render();
        });
        document.getElementById('settingDefaultPriority').addEventListener('change', (e) => {
            this.settings.defaultPriority = e.target.value;
            this.saveSettings();
        });
        document.getElementById('settingOverdueAlerts').addEventListener('change', (e) => {
            this.settings.overdueAlerts = e.target.checked;
            this.saveSettings();
            this.render();
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // ── Custom modal replacements for prompt() and confirm() ──
    customPrompt({ title = 'Enter value', label = '', placeholder = '', defaultValue = '' } = {}) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customPromptModal');
            document.getElementById('customPromptTitle').textContent = title;
            document.getElementById('customPromptLabel').textContent = label;
            const input = document.getElementById('customPromptInput');
            input.placeholder = placeholder;
            input.value = defaultValue;
            modal.classList.add('active');
            setTimeout(() => input.focus(), 50);

            const cleanup = (result) => {
                modal.classList.remove('active');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                closeBtn.removeEventListener('click', onCancel);
                modal.removeEventListener('click', onOutside);
                document.removeEventListener('keydown', onKey);
                resolve(result);
            };

            const onOk = () => cleanup(input.value.trim() || null);
            const onCancel = () => cleanup(null);
            const onOutside = (e) => { if (e.target === modal) onCancel(); };
            const onKey = (e) => {
                if (e.key === 'Enter') onOk();
                if (e.key === 'Escape') onCancel();
            };

            const okBtn = document.getElementById('customPromptOkBtn');
            const cancelBtn = document.getElementById('customPromptCancelBtn');
            const closeBtn = document.getElementById('closeCustomPromptModal');
            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
            closeBtn.addEventListener('click', onCancel);
            modal.addEventListener('click', onOutside);
            document.addEventListener('keydown', onKey);
        });
    }

    customConfirm({ title = 'Confirm', message = 'Are you sure?', okLabel = 'Confirm', okClass = 'btn-primary' } = {}) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            document.getElementById('customConfirmTitle').textContent = title;
            document.getElementById('customConfirmMessage').textContent = message;
            const okBtn = document.getElementById('customConfirmOkBtn');
            okBtn.textContent = okLabel;
            okBtn.className = `btn ${okClass}`;
            modal.classList.add('active');

            const cleanup = (result) => {
                modal.classList.remove('active');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                closeBtn.removeEventListener('click', onCancel);
                modal.removeEventListener('click', onOutside);
                document.removeEventListener('keydown', onKey);
                resolve(result);
            };

            const onOk = () => cleanup(true);
            const onCancel = () => cleanup(false);
            const onOutside = (e) => { if (e.target === modal) onCancel(); };
            const onKey = (e) => { if (e.key === 'Escape') onCancel(); };

            const cancelBtn = document.getElementById('customConfirmCancelBtn');
            const closeBtn = document.getElementById('closeCustomConfirmModal');
            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
            closeBtn.addEventListener('click', onCancel);
            modal.addEventListener('click', onOutside);
            document.addEventListener('keydown', onKey);
        });
    }

    async loadTasks() {
        const snapshot = await getDocs(collection(window.db, "tasks"));
        this.tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (this.tasks.length === 0) {
            this.tasks = [
                {
                    id: this.generateId(),
                    title: 'Complete Math Assignment',
                    description: 'Finish calculus problems 1-20 from chapter 5',
                    project: 'Math 101',
                    priority: 'high',
                    status: 'in-progress',
                    dueDate: this.getDateString(3),
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    title: 'Read History Chapter',
                    description: 'Read chapters 8-10 and prepare discussion points',
                    project: 'History 202',
                    priority: 'medium',
                    status: 'pending',
                    dueDate: this.getDateString(7),
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    title: 'Physics Lab Report',
                    description: 'Write lab report on pendulum experiment',
                    project: 'Physics 150',
                    priority: 'high',
                    status: 'pending',
                    dueDate: this.getDateString(2),
                    createdAt: new Date().toISOString()
                }
            ];
            await this.saveTasks();
        }
    }

    async saveTasks() {
        for (const task of this.tasks) {
            const { id, ...taskData } = task;
            await setDoc(doc(window.db, "tasks", id), taskData);
        }
    }

    async saveTask(task) {
        const { id, ...taskData } = task;
        await setDoc(doc(window.db, "tasks", id), taskData);
    }

    getDateString(daysFromNow = 0) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString().split('T')[0];
    }

    openTaskModal(taskId = null) {
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('taskForm');
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                modalTitle.textContent = 'Edit Task';
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskProject').value = task.project || '';
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskDueDate').value = task.dueDate || '';
                document.getElementById('taskStatus').value = task.status;
                this.editingTaskId = taskId;
            }
        } else {
            modalTitle.textContent = 'Add New Task';
            form.reset();
            this.editingTaskId = null;
        }
        
        modal.classList.add('active');
        document.getElementById('taskTitle').focus();
    }

    closeTaskModal() {
        document.getElementById('taskModal').classList.remove('active');
        document.getElementById('taskForm').reset();
        this.editingTaskId = null;
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            project: document.getElementById('taskProject').value.trim(),
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            status: document.getElementById('taskStatus').value
        };

        if (!taskData.title) {
            alert('Task title is required');
            return;
        }

        if (this.editingTaskId) {
            const taskIndex = this.tasks.findIndex(t => t.id === this.editingTaskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = {
                    ...this.tasks[taskIndex],
                    ...taskData,
                    updatedAt: new Date().toISOString()
                };
                await this.saveTask(this.tasks[taskIndex]);
            }
        } else {
            const newTask = {
                id: this.generateId(),
                ...taskData,
                createdAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
            await this.saveTask(newTask);
        }
        this.render();
        this.updateStats();
        this.closeTaskModal();
    }

    openDeleteModal(taskId) {
        this.deletingTaskId = taskId;
        document.getElementById('deleteModal').classList.add('active');
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        this.deletingTaskId = null;
    }

    async confirmDelete() {
        if (this.deletingTaskId) {
            await deleteDoc(doc(window.db, "tasks", this.deletingTaskId));
            this.tasks = this.tasks.filter(t => t.id !== this.deletingTaskId);
            this.render();
            this.updateStats();
            this.closeDeleteModal();
        }
    }

    async toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const statusFlow = {
                'pending': 'in-progress',
                'in-progress': 'completed',
                'completed': 'pending'
            };
            task.status = statusFlow[task.status] || 'pending';
            task.updatedAt = new Date().toISOString();
            await this.saveTask(task);
            this.render();
            this.updateStats();
        }
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.render();
    }

    getFilteredTasks() {
        return this.tasks.filter(task => {
            if (!this.settings.showCompleted && task.status === 'completed') return false;
            if (this.currentFilter.priority && task.priority !== this.currentFilter.priority) {
                return false;
            }
            if (this.currentFilter.status && task.status !== this.currentFilter.status) {
                return false;
            }
            if (this.currentFilter.project && task.project !== this.currentFilter.project) {
                return false;
            }
            return true;
        });
    }

    getProjects() {
        const projects = [...new Set(this.tasks.map(task => task.project).filter(Boolean))];
        return projects.sort();
    }

    updateProjectFilter() {
        const projectFilter = document.getElementById('projectFilter');
        const currentValue = projectFilter.value;
        
        projectFilter.innerHTML = '<option value="">All Projects</option>';
        this.getProjects().forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectFilter.appendChild(option);
        });
        
        projectFilter.value = currentValue;
    }

    renderProjects() {
        const projectList = document.getElementById('projectList');
        const projects = this.getProjects();
        
        if (projects.length === 0) {
            projectList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">No projects yet</p>';
            return;
        }

        projectList.innerHTML = projects.map(project => {
            const count = this.tasks.filter(task => task.project === project).length;
            return `
                <div class="project-item" data-project="${project}">
                    <span>${project}</span>
                    <span class="project-count">${count}</span>
                </div>
            `;
        }).join('');

        // Add click handlers to project items
        projectList.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', () => {
                const project = item.dataset.project;
                document.getElementById('projectFilter').value = project;
                this.currentFilter.project = project;
                this.render();
            });
        });
    }

    createTaskCard(task) {
        const isOverdue = this.isOverdue(task.dueDate);
        const dueDateClass = isOverdue ? 'overdue' : '';
        
        return `
            <div class="task-card ${task.status === 'completed' ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-icon" onclick="studyHub.toggleTaskStatus('${task.id}')" title="Toggle Status">
                            <i class="fas fa-${task.status === 'completed' ? 'undo' : 'check'}"></i>
                        </button>
                        <button class="btn btn-icon" onclick="studyHub.openTaskModal('${task.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon" onclick="studyHub.openDeleteModal('${task.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span class="task-badge priority-${task.priority}">${task.priority}</span>
                    <span class="task-badge status-${task.status}">${task.status.replace('-', ' ')}</span>
                    ${task.project ? `<span class="task-badge task-project">${this.escapeHtml(task.project)}</span>` : ''}
                    ${task.dueDate ? `
                        <div class="task-due-date ${dueDateClass}">
                            <i class="fas fa-calendar"></i>
                            ${this.formatDate(task.dueDate)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    render() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const filteredTasks = this.getFilteredTasks();

        // Update project filter and sidebar
        this.updateProjectFilter();
        this.renderProjects();

        if (filteredTasks.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            container.style.display = '';
            emptyState.style.display = 'none';
            
            // Sort tasks: incomplete first, then by priority and due date
            const sortedTasks = [...filteredTasks].sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            container.innerHTML = sortedTasks.map(task => this.createTaskCard(task)).join('');
        }

        // Update container class for view mode
        container.className = this.currentView === 'grid' ? 'tasks-grid' : 'tasks-list';
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else if (date < today) {
            return `Overdue (${date.toLocaleDateString()})`;
        } else {
            return date.toLocaleDateString();
        }
    }

    isOverdue(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return date < today;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const pending = total - completed;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
    }

    // Quiz Module Methods
    loadQuizData() {
        const stored = localStorage.getItem('studyhub_quiz_stats');
        if (stored) {
            this.quizStats = JSON.parse(stored);
        }
    }

    saveQuizData() {
        localStorage.setItem('studyhub_quiz_stats', JSON.stringify(this.quizStats));
    }

    switchModule(module) {
        this.currentModule = module;
        
        // Update navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.module === module);
        });

        const allModules = ['tasks','quiz','writing','focus','collab','marketplace','forum'];
        allModules.forEach(m => {
            const el = document.getElementById(m === 'tasks' ? 'tasksModule' : m === 'quiz' ? 'quizModule' : m + 'Module');
            if (el) el.style.display = (m === module) ? '' : 'none';
        });

        // Sidebar only shows for tasks
        const sidebar = document.getElementById('mainSidebar');
        if (sidebar) sidebar.style.display = module === 'tasks' ? '' : 'none';
        const layout = document.getElementById('appLayout');
        if (layout) layout.classList.toggle('full-width', module !== 'tasks');

        // Module-specific init
        if (module === 'writing') this.renderDocsList();
        if (module === 'collab') this.renderGroupsList();
        if (module === 'marketplace') this.renderMarket();
        if (module === 'forum') this.renderForum();
        if (module === 'focus') this.renderBlockerList();
    }

    updateQuizStats() {
        document.getElementById('totalPoints').textContent = this.quizStats.totalPoints;
        document.getElementById('streakCount').textContent = this.quizStats.streak;
        document.getElementById('avgScore').textContent = this.quizStats.totalQuizzes > 0 
            ? Math.round(this.quizStats.totalScore / this.quizStats.totalQuizzes) + '%'
            : '0%';
        
        this.renderAchievements();
    }

    renderAchievements() {
        // achievementsList element doesn't exist in HTML — achievements rendering skipped
    }

    loadUserQuizzes() {
        const stored = localStorage.getItem('studyhub_user_quizzes');
        if (stored) {
            this.userQuizzes = JSON.parse(stored);
        }
        this.renderQuizzesList();
    }

    saveUserQuizzes() {
        localStorage.setItem('studyhub_user_quizzes', JSON.stringify(this.userQuizzes));
    }

    renderQuizzesList() {
        const quizzesList = document.getElementById('quizzesList');
        
        if (this.userQuizzes.length === 0) {
            quizzesList.innerHTML = `
                <div class="empty-quizzes">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No quizzes created yet</p>
                    <p>Create your first quiz to get started!</p>
                </div>
            `;
            return;
        }

        quizzesList.innerHTML = this.userQuizzes.map(quiz => `
            <div class="quiz-item" onclick="studyHub.startUserQuiz('${quiz.id}')">
                <div class="quiz-info">
                    <h4>${this.escapeHtml(quiz.title)}</h4>
                    <div class="quiz-meta">
                        ${quiz.questions.length} questions • 
                        ${quiz.settings.timerDuration === 0 ? 'No timer' : quiz.settings.timerDuration + 's per question'} • 
                        Created ${new Date(quiz.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="quiz-actions">
                    <button class="btn btn-icon" onclick="event.stopPropagation(); studyHub.deleteQuiz('${quiz.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    openQuizCreationModal() {
        // Get settings from form
        this.currentQuizCreation.settings = {
            questionCount: parseInt(document.querySelector('input[name="questionCount"]:checked').value),
            timerDuration: parseInt(document.getElementById('timerDuration').value),
            includeMCQ: document.getElementById('mcqType').checked,
            includeIdentification: document.getElementById('identificationType').checked
        };

        // Reset creation state
        this.currentQuizCreation.questions = [];
        
        // Add initial questions based on settings
        if (this.currentQuizCreation.settings.includeMCQ) {
            this.addMCQQuestion();
        }
        if (this.currentQuizCreation.settings.includeIdentification) {
            this.addIdentificationQuestion();
        }

        document.getElementById('quizCreationModal').classList.add('active');
        this.renderQuizCreation();
    }

    closeQuizCreationModal() {
        document.getElementById('quizCreationModal').classList.remove('active');
        this.currentQuizCreation.questions = [];
    }

    addMCQQuestion() {
        const question = {
            id: this.generateId(),
            type: 'mcq',
            question: '',
            options: ['', '', '', ''],
            correct: 0
        };
        this.currentQuizCreation.questions.push(question);
        this.renderQuizCreation();
    }

    addIdentificationQuestion() {
        const question = {
            id: this.generateId(),
            type: 'identification',
            question: '',
            answer: ''
        };
        this.currentQuizCreation.questions.push(question);
        this.renderQuizCreation();
    }

    removeQuestion(questionId) {
        this.currentQuizCreation.questions = this.currentQuizCreation.questions.filter(q => q.id !== questionId);
        this.renderQuizCreation();
    }

    renderQuizCreation() {
        const container = document.getElementById('questionsContainer');
        
        if (this.currentQuizCreation.questions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No questions added yet. Click the buttons below to add questions.</p>';
            return;
        }

        container.innerHTML = this.currentQuizCreation.questions.map((question, index) => `
            <div class="question-item">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}</span>
                    <span class="question-type-badge">${question.type === 'mcq' ? 'MCQ' : 'Identification'}</span>
                    <button class="remove-question" onclick="studyHub.removeQuestion('${question.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="question-form">
                    <textarea placeholder="Enter your question here..." rows="2" 
                        data-question-id="${question.id}" data-field="question">${this.escapeHtml(question.question)}</textarea>
                    
                    ${question.type === 'mcq' ? `
                        <div class="mcq-options-label"><i class="fas fa-circle-info"></i> Select the radio button to mark correct answer</div>
                        <div class="mcq-options-container">
                            ${question.options.map((option, optionIndex) => `
                                <div class="mcq-option-input">
                                    <input type="radio" name="correct_${question.id}" value="${optionIndex}" 
                                        ${question.correct === optionIndex ? 'checked' : ''}
                                        onchange="studyHub.updateQuestion('${question.id}', 'correct', ${optionIndex})" title="Mark as correct answer">
                                    <input type="text" placeholder="Option ${optionIndex + 1}" value="${this.escapeHtml(option)}"
                                        data-question-id="${question.id}" data-option-index="${optionIndex}">
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <input type="text" placeholder="Enter the correct answer..." value="${this.escapeHtml(question.answer)}"
                            data-question-id="${question.id}" data-field="answer">
                    `}
                </div>
            </div>
        `).join('');

        // Re-bind events for all inputs after rendering
        this.currentQuizCreation.questions.forEach(question => {
            // Bind textarea events
            const textarea = container.querySelector(`textarea[data-question-id="${question.id}"]`);
            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    this.updateQuestion(question.id, 'question', e.target.value);
                });
            }

            if (question.type === 'mcq') {
                // Bind MCQ option input events
                question.options.forEach((option, optionIndex) => {
                    const textInput = container.querySelector(`input[data-question-id="${question.id}"][data-option-index="${optionIndex}"]`);
                    if (textInput) {
                        textInput.addEventListener('input', (e) => {
                            this.updateMCQOption(question.id, optionIndex, e.target.value);
                        });
                    }
                });
            } else {
                // Bind identification answer input events
                const answerInput = container.querySelector(`input[data-question-id="${question.id}"][data-field="answer"]`);
                if (answerInput) {
                    answerInput.addEventListener('input', (e) => {
                        this.updateQuestion(question.id, 'answer', e.target.value);
                    });
                }
            }
        });
    }

    updateQuestion(questionId, field, value) {
        const question = this.currentQuizCreation.questions.find(q => q.id === questionId);
        if (question) {
            question[field] = value;
        }
    }

    updateMCQOption(questionId, optionIndex, value) {
        const question = this.currentQuizCreation.questions.find(q => q.id === questionId);
        if (question) {
            question.options[optionIndex] = value;
        }
    }

    async saveQuiz() {
        if (this.currentQuizCreation.questions.length === 0) {
            alert('Please add at least one question');
            return;
        }

        // Validate questions
        for (const question of this.currentQuizCreation.questions) {
            if (!question.question.trim()) {
                alert('Please fill in all questions');
                return;
            }
            
            if (question.type === 'mcq') {
                if (question.options.some(option => !option.trim())) {
                    alert('Please fill in all MCQ options');
                    return;
                }
            } else {
                if (!question.answer.trim()) {
                    alert('Please fill in all identification answers');
                    return;
                }
            }
        }

        const title = await this.customPrompt({ title: 'Name Your Quiz', label: 'Quiz title', placeholder: 'e.g. Chapter 5 Review' });
        if (!title || !title.trim()) {
            return;
        }

        const quiz = {
            id: this.generateId(),
            title: title.trim(),
            questions: [...this.currentQuizCreation.questions],
            settings: { ...this.currentQuizCreation.settings },
            createdAt: new Date().toISOString()
        };

        this.userQuizzes.push(quiz);
        this.saveUserQuizzes();
        this.renderQuizzesList();
        this.closeQuizCreationModal();
        
        alert('Quiz created successfully!');
    }

    async deleteQuiz(quizId) {
        const ok = await this.customConfirm({ title: 'Delete Quiz', message: 'Are you sure you want to delete this quiz?', okLabel: 'Delete', okClass: 'btn-danger' });
        if (!ok) return;

        this.userQuizzes = this.userQuizzes.filter(q => q.id !== quizId);
        this.saveUserQuizzes();
        this.renderQuizzesList();
    }

    startUserQuiz(quizId) {
        const quiz = this.userQuizzes.find(q => q.id === quizId);
        if (!quiz) return;

        this.currentQuizId = quizId; // Save for retake
        const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);
        
        this.quizData = {
            questions: shuffledQuestions,
            currentQuestionIndex: 0,
            userAnswers: [],
            score: 0,
            timeStarted: new Date(),
            timeEnded: null,
            timer: null,
            timeRemaining: quiz.settings.timerDuration
        };

        // Show quiz interface
        document.getElementById('quizSetup').style.display = 'none';
        document.getElementById('quizActive').style.display = '';
        document.getElementById('quizResults').style.display = 'none';

        this.displayQuestion();
        if (quiz.settings.timerDuration > 0) {
            this.startTimer();
        }
    }

    displayQuestion() {
        const question = this.quizData.questions[this.quizData.currentQuestionIndex];
        const progress = ((this.quizData.currentQuestionIndex + 1) / this.quizData.questions.length) * 100;

        // Update progress
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('currentQuestion').textContent = this.quizData.currentQuestionIndex + 1;
        document.getElementById('totalQuestions').textContent = this.quizData.questions.length;

        // Update question content
        document.getElementById('questionType').textContent = question.type === 'mcq' ? 'Multiple Choice' : 'Identification';
        document.getElementById('questionPoints').textContent = '10 points';
        document.getElementById('questionText').textContent = question.question;

        if (question.type === 'mcq') {
            document.getElementById('mcqOptions').style.display = '';
            document.getElementById('identificationInput').style.display = 'none';
            
            document.getElementById('mcqOptions').innerHTML = question.options.map((option, index) => `
                <label class="mcq-option">
                    <input type="radio" name="answer" value="${index}">
                    <span>${option}</span>
                </label>
            `).join('');
        } else {
            document.getElementById('mcqOptions').style.display = 'none';
            document.getElementById('identificationInput').style.display = '';
            document.getElementById('identificationAnswer').value = '';
        }
    }

    startTimer() {
        if (this.quizData.timeRemaining <= 0) return;
        
        this.quizData.timer = setInterval(() => {
            this.quizData.timeRemaining--;
            document.getElementById('timeRemaining').textContent = this.quizData.timeRemaining + 's';
            
            if (this.quizData.timeRemaining <= 0) {
                this.submitAnswer();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.quizData.timer) {
            clearInterval(this.quizData.timer);
            this.quizData.timer = null;
        }
    }

    submitAnswer() {
        this.stopTimer();
        
        const question = this.quizData.questions[this.quizData.currentQuestionIndex];
        let userAnswer;
        let isCorrect = false;

        if (question.type === 'mcq') {
            const selectedOption = document.querySelector('input[name="answer"]:checked');
            userAnswer = selectedOption ? parseInt(selectedOption.value) : null;
            isCorrect = userAnswer === question.correct;
        } else {
            userAnswer = document.getElementById('identificationAnswer').value.trim();
            isCorrect = userAnswer.toLowerCase() === question.answer.toLowerCase();
        }

        this.quizData.userAnswers.push({
            question: question.question,
            userAnswer: userAnswer,
            correctAnswer: question.type === 'mcq' ? question.options[question.correct] : question.answer,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            this.quizData.score += 10;
        }

        this.quizData.currentQuestionIndex++;

        if (this.quizData.currentQuestionIndex < this.quizData.questions.length) {
            this.quizData.timeRemaining = this.quizData.timeRemaining > 0 ? this.quizData.timeRemaining : 30;
            this.displayQuestion();
            this.startTimer();
        } else {
            this.endQuiz();
        }
    }

    skipQuestion() {
        this.stopTimer();
        
        const question = this.quizData.questions[this.quizData.currentQuestionIndex];
        this.quizData.userAnswers.push({
            question: question.question,
            userAnswer: 'Skipped',
            correctAnswer: question.type === 'mcq' ? question.options[question.correct] : question.answer,
            isCorrect: false
        });

        this.quizData.currentQuestionIndex++;

        if (this.quizData.currentQuestionIndex < this.quizData.questions.length) {
            this.quizData.timeRemaining = this.quizData.timeRemaining > 0 ? this.quizData.timeRemaining : 30;
            this.displayQuestion();
            this.startTimer();
        } else {
            this.endQuiz();
        }
    }

    endQuiz() {
        this.stopTimer();
        this.quizData.timeEnded = new Date();
        
        const timeTaken = Math.round((this.quizData.timeEnded - this.quizData.timeStarted) / 1000);
        const percentage = Math.round((this.quizData.score / (this.quizData.questions.length * 10)) * 100);
        
        // Update stats
        this.quizStats.totalQuizzes++;
        this.quizStats.totalScore += percentage;
        this.quizStats.totalPoints += this.quizData.score;
        
        if (percentage >= 80) {
            this.quizStats.streak++;
        } else {
            this.quizStats.streak = 0;
        }

        this.saveQuizData();
        this.updateQuizStats();

        // Show results
        document.getElementById('quizActive').style.display = 'none';
        document.getElementById('quizResults').style.display = '';

        document.getElementById('finalScore').textContent = percentage + '%';
        document.getElementById('correctAnswers').textContent = this.quizData.score / 10;
        document.getElementById('totalQuizQuestions').textContent = this.quizData.questions.length;
        document.getElementById('pointsEarned').textContent = this.quizData.score;
        document.getElementById('timeTaken').textContent = this.formatTime(timeTaken);
        document.getElementById('streakBonus').textContent = '+' + (this.quizStats.streak * 5);
        document.getElementById('perfectAnswers').textContent = this.quizData.userAnswers.filter(a => a.isCorrect).length;

        // Display answer review
        document.getElementById('answerReview').innerHTML = this.quizData.userAnswers.map((answer, index) => `
            <div class="answer-item ${answer.isCorrect ? 'correct' : 'incorrect'}">
                <div class="answer-question">Q${index + 1}: ${answer.question}</div>
                <div class="answer-result">
                    <span class="answer-user">Your answer: ${answer.userAnswer}</span>
                    <span class="answer-correct">Correct: ${answer.correctAnswer}</span>
                </div>
            </div>
        `).join('');
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    loadSettings() {
        const saved = localStorage.getItem('edusync_settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        // Apply to UI
        document.getElementById('settingShowCompleted').checked = this.settings.showCompleted;
        document.getElementById('settingDefaultPriority').value = this.settings.defaultPriority;
        document.getElementById('settingOverdueAlerts').checked = this.settings.overdueAlerts;
    }

    saveSettings() {
        localStorage.setItem('edusync_settings', JSON.stringify(this.settings));
    }

    openSidePanel() {
        document.getElementById('sidePanel').classList.add('open');
        document.getElementById('sidePanelOverlay').classList.add('open');
        document.getElementById('burgerBtn').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeSidePanel() {
        document.getElementById('sidePanel').classList.remove('open');
        document.getElementById('sidePanelOverlay').classList.remove('open');
        document.getElementById('burgerBtn').classList.remove('active');
        document.body.style.overflow = '';
    }

    initTheme() {
        const saved = localStorage.getItem('edusync_theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('edusync_theme', next);
    }

    retakeQuiz() {
        this.startUserQuiz(this.currentQuizId);
    }

    resetQuiz() {
        document.getElementById('quizSetup').style.display = '';
        document.getElementById('quizActive').style.display = 'none';
        document.getElementById('quizResults').style.display = 'none';
    }

    // ══════════════════════════════════════════════════════
    //  NEW MODULE BINDINGS
    // ══════════════════════════════════════════════════════
    bindNewModuleEvents() {
        // Upgrade
        document.getElementById('upgradeBtn')?.addEventListener('click', () => {
            document.getElementById('upgradeModal').classList.add('active');
        });
        document.getElementById('closeUpgradeModal')?.addEventListener('click', () => {
            document.getElementById('upgradeModal').classList.remove('active');
        });
        document.getElementById('upgradeModal')?.addEventListener('click', e => {
            if (e.target.id === 'upgradeModal') document.getElementById('upgradeModal').classList.remove('active');
        });
        document.getElementById('goPremiumBtn')?.addEventListener('click', () => {
            document.getElementById('tierBadge').textContent = 'Premium';
            document.getElementById('tierBadge').classList.add('premium');
            document.getElementById('upgradeModal').classList.remove('active');
            this.showToast('🎉 Welcome to EduSync Premium!', 'success');
        });

        // Writing Tool
        document.getElementById('newDocBtn')?.addEventListener('click', () => this.newDocument());
        document.getElementById('saveDocBtn')?.addEventListener('click', () => this.saveDocument());
        document.getElementById('addSectionBtn')?.addEventListener('click', () => this.addOutlineSection());
        document.getElementById('addCitationBtn')?.addEventListener('click', () => {
            document.getElementById('addCitationModal').classList.add('active');
        });
        document.getElementById('closeAddCitationModal')?.addEventListener('click', () => {
            document.getElementById('addCitationModal').classList.remove('active');
        });
        document.getElementById('cancelCitationBtn')?.addEventListener('click', () => {
            document.getElementById('addCitationModal').classList.remove('active');
        });
        document.getElementById('saveCitationBtn')?.addEventListener('click', () => this.saveCitation());
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.execCommand(btn.dataset.cmd, false, null);
                document.getElementById('writingArea')?.focus();
            });
        });
        document.getElementById('writingArea')?.addEventListener('input', () => this.updateWordCount());

        // Focus Mode
        document.getElementById('startFocusBtn')?.addEventListener('click', () => this.startFocusTimer());
        document.getElementById('pauseFocusBtn')?.addEventListener('click', () => this.pauseFocusTimer());
        document.getElementById('resetFocusBtn')?.addEventListener('click', () => this.resetFocusTimer());
        document.getElementById('enterFullFocusBtn')?.addEventListener('click', () => {
            document.getElementById('focusActiveOverlay').style.display = '';
        });
        document.getElementById('exitFocusOverlayBtn')?.addEventListener('click', () => {
            document.getElementById('focusActiveOverlay').style.display = 'none';
        });
        document.getElementById('addBlockerBtn')?.addEventListener('click', () => this.addBlockerSite());
        document.getElementById('blockerSiteInput')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.addBlockerSite();
        });
        document.getElementById('focusShieldToggle')?.addEventListener('change', e => {
            const note = document.getElementById('focusShieldNote');
            note.textContent = e.target.checked
                ? '🛡️ Focus Shield ON — stay focused!'
                : '';
        });
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.focusWorkMinutes = parseInt(btn.dataset.work);
                this.focusBreakMinutes = parseInt(btn.dataset.break);
                this.resetFocusTimer();
            });
        });
        document.querySelectorAll('.ambient-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sound = btn.dataset.sound;
                const isActive = btn.classList.contains('active');

                // Stop any playing audio
                this.stopAmbientAudio();
                document.querySelectorAll('.ambient-btn').forEach(b => b.classList.remove('active'));

                if (!isActive) {
                    btn.classList.add('active');
                    this.playAmbientAudio(sound);
                }
            });
        });

        // Volume slider
        document.getElementById('ambientVolume')?.addEventListener('input', (e) => {
            this.ambientVolume = parseFloat(e.target.value);
            if (this.ambientAudio) this.ambientAudio.volume = this.ambientVolume;
            const pct = Math.round(this.ambientVolume * 100);
            const label = document.getElementById('ambientVolumeLabel');
            if (label) label.textContent = pct + '%';
        });

        // Collaboration
        document.getElementById('createGroupBtn')?.addEventListener('click', () => {
            document.getElementById('createGroupModal').classList.add('active');
        });
        document.getElementById('closeCreateGroupModal')?.addEventListener('click', () => {
            document.getElementById('createGroupModal').classList.remove('active');
        });
        document.getElementById('cancelCreateGroupBtn')?.addEventListener('click', () => {
            document.getElementById('createGroupModal').classList.remove('active');
        });
        document.getElementById('saveGroupBtn')?.addEventListener('click', () => this.createGroup());
        document.getElementById('addGroupTaskBtn')?.addEventListener('click', () => this.addGroupTask());
        document.getElementById('addGroupNoteBtn')?.addEventListener('click', () => this.addGroupNote());
        document.getElementById('sendChatBtn')?.addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        document.getElementById('leaveGroupBtn')?.addEventListener('click', () => this.leaveGroup());
        document.getElementById('inviteMemberBtn')?.addEventListener('click', () => {
            this.showToast('📧 Invite link copied to clipboard!', 'success');
        });

        // Marketplace
        document.getElementById('sellItemBtn')?.addEventListener('click', () => {
            document.getElementById('sellItemModal').classList.add('active');
        });
        document.getElementById('closeSellItemModal')?.addEventListener('click', () => {
            document.getElementById('sellItemModal').classList.remove('active');
        });
        document.getElementById('cancelSellBtn')?.addEventListener('click', () => {
            document.getElementById('sellItemModal').classList.remove('active');
        });
        document.getElementById('saveSellBtn')?.addEventListener('click', () => this.listMarketItem());
        document.getElementById('marketSearch')?.addEventListener('input', () => this.renderMarket());
        document.getElementById('marketCategoryFilter')?.addEventListener('change', () => this.renderMarket());
        document.getElementById('marketSortFilter')?.addEventListener('change', () => this.renderMarket());

        // Forum
        document.getElementById('newPostBtn')?.addEventListener('click', () => {
            document.getElementById('newPostModal').classList.add('active');
        });
        document.getElementById('closeNewPostModal')?.addEventListener('click', () => {
            document.getElementById('newPostModal').classList.remove('active');
        });
        document.getElementById('cancelPostBtn')?.addEventListener('click', () => {
            document.getElementById('newPostModal').classList.remove('active');
        });
        document.getElementById('savePostBtn')?.addEventListener('click', () => this.publishPost());
        document.getElementById('forumSearch')?.addEventListener('input', () => this.renderForum());
        document.querySelectorAll('.forum-category').forEach(cat => {
            cat.addEventListener('click', () => {
                document.querySelectorAll('.forum-category').forEach(c => c.classList.remove('active'));
                cat.classList.add('active');
                this.forumActiveCategory = cat.dataset.cat;
                this.renderForum();
            });
        });
    }

    // ── LOAD / SAVE NEW DATA ──
    async loadNewModuleData() {
        const d = localStorage.getItem('edusync_documents');
        if (d) this.documents = JSON.parse(d);

        const g = localStorage.getItem('edusync_groups');
        if (g) this.groups = JSON.parse(g);

        // Load market items from Firestore
        await this.loadMarketItems();

        const f = localStorage.getItem('edusync_forum');
        if (f) this.forumPosts = JSON.parse(f);
        else this.seedForumPosts();

        const xp = localStorage.getItem('edusync_xp');
        if (xp) this.xp = parseInt(xp);

        const bl = localStorage.getItem('edusync_blocker');
        if (bl) this.blockedSites = JSON.parse(bl);

        const fs = localStorage.getItem('edusync_focus_sessions');
        if (fs) this.focusSessionsCompleted = parseInt(fs);

        // Wire up new events after DOM is ready
        this.bindNewModuleEvents();
    }

    async loadMarketItems() {
        try {
            const snapshot = await getDocs(collection(window.db, 'marketItems'));
            this.marketItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (this.marketItems.length === 0) {
                await this.seedMarketItems();
            }
        } catch (e) {
            console.error('Failed to load market items from Firestore', e);
            this.marketItems = [];
        }
    }

    async saveMarketItem(item) {
        const { id, ...data } = item;
        await setDoc(doc(window.db, 'marketItems', id), data);
    }

    saveModuleData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // ── GAMIFICATION ──
    gainXP(amount) {
        this.xp += amount;
        localStorage.setItem('edusync_xp', this.xp);
        this.updateXPDisplay();
        this.checkBadges();
    }

    getLevel() {
        return Math.floor(this.xp / 100) + 1;
    }

    updateXPDisplay() {
        const level = this.getLevel();
        const xpInLevel = this.xp % 100;
        const xpEl = document.getElementById('userXP');
        const levelEl = document.getElementById('xpLevel');
        const xpTextEl = document.getElementById('xpText');
        const fillEl = document.getElementById('xpFill');
        if (xpEl) xpEl.textContent = this.xp;
        if (levelEl) levelEl.textContent = `Lv. ${level}`;
        if (xpTextEl) xpTextEl.textContent = `${xpInLevel} / 100 XP`;
        if (fillEl) fillEl.style.width = xpInLevel + '%';
        this.renderBadges();
    }

    checkBadges() {
        const newBadges = [];
        if (this.xp >= 100 && !this.badges.includes('first100')) {
            newBadges.push({ id: 'first100', icon: '🌟', label: 'Rising Star' });
            this.badges.push('first100');
        }
        if (this.tasks.filter(t => t.status === 'completed').length >= 5 && !this.badges.includes('tasks5')) {
            newBadges.push({ id: 'tasks5', icon: '✅', label: 'Task Crusher' });
            this.badges.push('tasks5');
        }
        if (this.quizStats.totalQuizzes >= 3 && !this.badges.includes('quiz3')) {
            newBadges.push({ id: 'quiz3', icon: '🧠', label: 'Quiz Whiz' });
            this.badges.push('quiz3');
        }
        if (this.focusSessionsCompleted >= 5 && !this.badges.includes('focus5')) {
            newBadges.push({ id: 'focus5', icon: '🎯', label: 'Focus Master' });
            this.badges.push('focus5');
        }
        newBadges.forEach(b => this.showToast(`🏅 Badge unlocked: ${b.label}!`, 'success'));
    }

    renderBadges() {
        const badgeMap = {
            first100: '🌟', tasks5: '✅', quiz3: '🧠', focus5: '🎯',
            writer: '📝', trader: '🛒', networker: '👥'
        };
        const row = document.getElementById('badgesRow');
        if (!row) return;
        if (this.badges.length === 0) {
            row.innerHTML = '<span class="no-badges">Complete tasks to earn badges!</span>';
            return;
        }
        row.innerHTML = this.badges.map(b => `<span class="badge-icon" title="${b}">${badgeMap[b] || '🏅'}</span>`).join('');
    }

    // ── TOAST ──
    showToast(message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ══ WRITING TOOL ══
    newDocument() {
        const doc = {
            id: this.generateId(),
            title: 'Untitled Document',
            type: 'essay',
            content: '',
            outline: [],
            citations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.documents.push(doc);
        this.saveModuleData('edusync_documents', this.documents);
        this.loadDocument(doc.id);
        this.renderDocsList();
        this.gainXP(5);
    }

    loadDocument(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        this.currentDocId = docId;
        this.outlineSections = doc.outline ? [...doc.outline] : [];
        this.citations = doc.citations ? [...doc.citations] : [];
        document.getElementById('docTitle').value = doc.title;
        document.getElementById('docType').value = doc.type;
        document.getElementById('writingArea').innerHTML = doc.content;
        this.renderOutline();
        this.renderCitations();
        this.updateWordCount();
        // Highlight active
        document.querySelectorAll('.doc-item').forEach(el => {
            el.classList.toggle('active', el.dataset.docId === docId);
        });
    }

    saveDocument() {
        if (!this.currentDocId) { this.newDocument(); return; }
        const doc = this.documents.find(d => d.id === this.currentDocId);
        if (!doc) return;
        doc.title = document.getElementById('docTitle').value || 'Untitled';
        doc.type = document.getElementById('docType').value;
        doc.content = document.getElementById('writingArea').innerHTML;
        doc.outline = [...this.outlineSections];
        doc.citations = [...this.citations];
        doc.updatedAt = new Date().toISOString();
        this.saveModuleData('edusync_documents', this.documents);
        this.renderDocsList();
        this.showToast('✅ Document saved!', 'success');
        this.gainXP(2);
    }

    renderDocsList() {
        const el = document.getElementById('docsList');
        if (!el) return;
        if (this.documents.length === 0) {
            el.innerHTML = '<p class="empty-list-msg">No documents yet. Click "New Doc" to start.</p>';
            return;
        }
        el.innerHTML = this.documents.map(doc => `
            <div class="doc-item ${doc.id === this.currentDocId ? 'active' : ''}" data-doc-id="${doc.id}">
                <div class="doc-item-info">
                    <span class="doc-item-title">${this.escapeHtml(doc.title)}</span>
                    <span class="doc-item-meta">${doc.type} · ${new Date(doc.updatedAt).toLocaleDateString()}</span>
                </div>
                <button class="btn-icon-sm" onclick="studyHub.deleteDocument('${doc.id}'); event.stopPropagation();" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
        el.querySelectorAll('.doc-item').forEach(item => {
            item.addEventListener('click', () => this.loadDocument(item.dataset.docId));
        });
    }

    async deleteDocument(docId) {
        const ok = await this.customConfirm({ title: 'Delete Document', message: 'Delete this document? This cannot be undone.', okLabel: 'Delete', okClass: 'btn-danger' });
        if (!ok) return;
        this.documents = this.documents.filter(d => d.id !== docId);
        if (this.currentDocId === docId) {
            this.currentDocId = null;
            document.getElementById('docTitle').value = '';
            document.getElementById('writingArea').innerHTML = '';
            this.outlineSections = [];
            this.citations = [];
            this.renderOutline();
            this.renderCitations();
        }
        this.saveModuleData('edusync_documents', this.documents);
        this.renderDocsList();
    }

    async addOutlineSection() {
        const title = await this.customPrompt({ title: 'Add Section', label: 'Section title', placeholder: 'e.g. Introduction' });
        if (!title) return;
        this.outlineSections.push({ id: this.generateId(), title, notes: '' });
        this.renderOutline();
    }

    renderOutline() {
        const el = document.getElementById('outlineContainer');
        if (!el) return;
        if (this.outlineSections.length === 0) {
            el.innerHTML = '<p class="outline-placeholder">Add sections to build your document structure.</p>';
            return;
        }
        el.innerHTML = this.outlineSections.map((s, i) => `
            <div class="outline-item" draggable="true">
                <span class="outline-num">${i + 1}.</span>
                <span class="outline-title">${this.escapeHtml(s.title)}</span>
                <button class="btn-icon-sm" onclick="studyHub.removeOutlineSection('${s.id}')"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    removeOutlineSection(id) {
        this.outlineSections = this.outlineSections.filter(s => s.id !== id);
        this.renderOutline();
    }

    updateWordCount() {
        const text = document.getElementById('writingArea')?.innerText || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const el = document.getElementById('wordCount');
        if (el) el.textContent = words;
    }

    saveCitation() {
        const title = document.getElementById('citationTitle')?.value.trim();
        if (!title) { this.showToast('Citation title is required', 'error'); return; }
        const citation = {
            id: this.generateId(),
            author: document.getElementById('citationAuthor')?.value.trim(),
            title,
            year: document.getElementById('citationYear')?.value,
            format: document.getElementById('citationFormat')?.value,
            publisher: document.getElementById('citationPublisher')?.value.trim()
        };
        this.citations.push(citation);
        this.renderCitations();
        document.getElementById('addCitationModal').classList.remove('active');
        // Clear inputs
        ['citationAuthor','citationTitle','citationYear','citationPublisher'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    renderCitations() {
        const el = document.getElementById('citationList');
        if (!el) return;
        if (this.citations.length === 0) {
            el.innerHTML = '<p class="empty-list-msg">No citations yet.</p>';
            return;
        }
        el.innerHTML = this.citations.map(c => {
            let formatted = '';
            if (c.format === 'apa') {
                formatted = `${c.author || 'Unknown'} (${c.year || 'n.d.'}). <em>${c.title}</em>. ${c.publisher || ''}`;
            } else if (c.format === 'mla') {
                formatted = `${c.author || 'Unknown'}. "${c.title}." ${c.publisher || ''}, ${c.year || 'n.d.'}.`;
            } else {
                formatted = `${c.author || 'Unknown'}, "${c.title}," ${c.publisher || ''} (${c.year || 'n.d.'}).`;
            }
            return `<div class="citation-item">
                <span class="citation-format-tag">${c.format.toUpperCase()}</span>
                <span class="citation-text">${formatted}</span>
                <button class="btn-icon-sm" onclick="studyHub.removeCitation('${c.id}')"><i class="fas fa-times"></i></button>
            </div>`;
        }).join('');
    }

    removeCitation(id) {
        this.citations = this.citations.filter(c => c.id !== id);
        this.renderCitations();
    }

    // ══ FOCUS MODE ══
    startFocusTimer() {
        if (this.focusRunning) return;
        this.focusRunning = true;
        document.getElementById('startFocusBtn').disabled = true;
        document.getElementById('pauseFocusBtn').disabled = false;
        this.focusTimer = setInterval(() => this.tickFocusTimer(), 1000);
    }

    pauseFocusTimer() {
        this.focusRunning = false;
        clearInterval(this.focusTimer);
        this.focusTimer = null;
        document.getElementById('startFocusBtn').disabled = false;
        document.getElementById('pauseFocusBtn').disabled = true;
    }

    resetFocusTimer() {
        this.pauseFocusTimer();
        this.focusPhase = 'work';
        this.focusSecondsLeft = this.focusWorkMinutes * 60;
        this.updateFocusDisplay();
    }

    tickFocusTimer() {
        this.focusSecondsLeft--;
        this.updateFocusDisplay();
        if (this.focusSecondsLeft <= 0) {
            if (this.focusPhase === 'work') {
                this.focusPhase = 'break';
                this.focusSecondsLeft = this.focusBreakMinutes * 60;
                this.focusSessionsCompleted++;
                this.focusTotalMinutes += this.focusWorkMinutes;
                localStorage.setItem('edusync_focus_sessions', this.focusSessionsCompleted);
                document.getElementById('sessionsCompleted').textContent = this.focusSessionsCompleted;
                document.getElementById('totalFocusTime').textContent = this.focusTotalMinutes;
                document.getElementById('totalSessions').textContent = this.focusSessionsCompleted;
                this.gainXP(10);
                this.showToast('🎉 Focus session complete! Take a break.', 'success');
            } else {
                this.focusPhase = 'work';
                this.focusSecondsLeft = this.focusWorkMinutes * 60;
                this.showToast('⚡ Break over. Time to focus!', 'info');
            }
        }
    }

    updateFocusDisplay() {
        const mins = Math.floor(this.focusSecondsLeft / 60);
        const secs = this.focusSecondsLeft % 60;
        const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        const phaseLabel = this.focusPhase === 'work' ? 'Focus' : 'Break';
        const totalSecs = (this.focusPhase === 'work' ? this.focusWorkMinutes : this.focusBreakMinutes) * 60;
        const progress = 1 - this.focusSecondsLeft / totalSecs;

        document.getElementById('focusTimerDisplay').textContent = timeStr;
        document.getElementById('focusPhaseLabel').textContent = phaseLabel;
        document.getElementById('focusOverlayTimer').textContent = timeStr;
        document.getElementById('focusOverlayPhase').textContent = phaseLabel + ' Session';

        // SVG ring animation
        const ring = document.getElementById('timerRing');
        if (ring) {
            const circumference = 2 * Math.PI * 45;
            ring.style.strokeDasharray = circumference;
            ring.style.strokeDashoffset = circumference * (1 - progress);
        }
    }

    addBlockerSite() {
        const input = document.getElementById('blockerSiteInput');
        const site = input?.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!site) return;
        if (!this.blockedSites.includes(site)) {
            this.blockedSites.push(site);
            localStorage.setItem('edusync_blocker', JSON.stringify(this.blockedSites));
        }
        input.value = '';
        this.renderBlockerList();
    }

    renderBlockerList() {
        const el = document.getElementById('blockerList');
        if (!el) return;
        if (this.blockedSites.length === 0) {
            el.innerHTML = '<p class="empty-list-msg">No sites added.</p>';
            return;
        }
        el.innerHTML = this.blockedSites.map(site => `
            <div class="blocker-item">
                <i class="fas fa-ban"></i>
                <span>${site}</span>
                <button class="btn-icon-sm" onclick="studyHub.removeBlockerSite('${site}')"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    removeBlockerSite(site) {
        this.blockedSites = this.blockedSites.filter(s => s !== site);
        localStorage.setItem('edusync_blocker', JSON.stringify(this.blockedSites));
        this.renderBlockerList();
    }

    // ══ AMBIENT AUDIO ══
    playAmbientAudio(sound) {
        const url = this.ambientUrls[sound];
        if (!url || url.startsWith('YOUR_FIREBASE')) {
            this.showToast('⚠️ Audio URL not set yet. Add your Firebase Storage URL in script.js.', 'error');
            document.querySelectorAll('.ambient-btn').forEach(b => b.classList.remove('active'));
            return;
        }
        try {
            this.ambientAudio = new Audio(url);
            this.ambientAudio.loop = true;
            this.ambientAudio.volume = this.ambientVolume;
            this.ambientAudio.play().catch(() => {
                this.showToast('Could not play audio. Check the URL or browser permissions.', 'error');
                document.querySelectorAll('.ambient-btn').forEach(b => b.classList.remove('active'));
            });
            const labels = { rain: 'Rain', cafe: 'Café', forest: 'Forest', white: 'White Noise' };
            this.showToast(`🎵 Now playing: ${labels[sound] || sound}`, 'info');
        } catch (e) {
            this.showToast('Audio playback error.', 'error');
        }
    }

    stopAmbientAudio() {
        if (this.ambientAudio) {
            this.ambientAudio.pause();
            this.ambientAudio.currentTime = 0;
            this.ambientAudio = null;
        }
    }
    createGroup() {
        const name = document.getElementById('groupNameInput')?.value.trim();
        if (!name) { this.showToast('Group name is required', 'error'); return; }
        const group = {
            id: this.generateId(),
            name,
            subject: document.getElementById('groupSubjectInput')?.value.trim(),
            description: document.getElementById('groupDescInput')?.value.trim(),
            members: ['You'],
            tasks: [],
            notes: [],
            chat: [],
            createdAt: new Date().toISOString()
        };
        this.groups.push(group);
        this.saveModuleData('edusync_groups', this.groups);
        document.getElementById('createGroupModal').classList.remove('active');
        ['groupNameInput','groupSubjectInput','groupDescInput'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.renderGroupsList();
        this.openGroup(group.id);
        this.gainXP(10);
        this.showToast(`👥 Group "${name}" created!`, 'success');
    }

    renderGroupsList() {
        const el = document.getElementById('groupsList');
        if (!el) return;
        if (this.groups.length === 0) {
            el.innerHTML = '<p class="empty-list-msg">No groups yet.</p>';
            return;
        }
        el.innerHTML = this.groups.map(g => `
            <div class="group-list-item ${g.id === this.activeGroupId ? 'active' : ''}" onclick="studyHub.openGroup('${g.id}')">
                <div class="group-list-icon"><i class="fas fa-users"></i></div>
                <div>
                    <div class="group-list-name">${this.escapeHtml(g.name)}</div>
                    <div class="group-list-meta">${g.subject || 'General'} · ${g.members.length} member(s)</div>
                </div>
            </div>
        `).join('');
    }

    openGroup(groupId) {
        this.activeGroupId = groupId;
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        document.getElementById('collabEmptyState').style.display = 'none';
        document.getElementById('activeGroupPanel').style.display = '';
        document.getElementById('activeGroupName').textContent = group.name;
        document.getElementById('activeGroupMembers').textContent = `${group.members.length} member(s) · ${group.subject || 'General'}`;
        this.renderGroupTasks(group);
        this.renderGroupNotes(group);
        this.renderGroupChat(group);
        this.renderGroupsList();
    }

    renderGroupTasks(group) {
        const el = document.getElementById('groupTasksList');
        if (!el) return;
        if (!group.tasks.length) { el.innerHTML = '<p class="empty-list-msg">No shared tasks yet.</p>'; return; }
        el.innerHTML = group.tasks.map(t => `
            <div class="group-task-item ${t.done ? 'done' : ''}">
                <label class="group-task-check">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="studyHub.toggleGroupTask('${group.id}','${t.id}')">
                    <span>${this.escapeHtml(t.title)}</span>
                </label>
                <span class="task-badge priority-${t.priority}">${t.priority}</span>
                <button class="btn-icon-sm" onclick="studyHub.removeGroupTask('${group.id}','${t.id}')"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    async addGroupTask() {
        const group = this.groups.find(g => g.id === this.activeGroupId);
        if (!group) return;
        const title = await this.customPrompt({ title: 'Add Shared Task', label: 'Task title', placeholder: 'e.g. Review Chapter 3' });
        if (!title) return;
        group.tasks.push({ id: this.generateId(), title, priority: 'medium', done: false });
        this.saveModuleData('edusync_groups', this.groups);
        this.renderGroupTasks(group);
    }

    toggleGroupTask(groupId, taskId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        const task = group.tasks.find(t => t.id === taskId);
        if (task) { task.done = !task.done; this.saveModuleData('edusync_groups', this.groups); }
    }

    removeGroupTask(groupId, taskId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        group.tasks = group.tasks.filter(t => t.id !== taskId);
        this.saveModuleData('edusync_groups', this.groups);
        this.renderGroupTasks(group);
    }

    renderGroupNotes(group) {
        const el = document.getElementById('groupNotesList');
        if (!el) return;
        if (!group.notes.length) { el.innerHTML = '<p class="empty-list-msg">No shared notes yet.</p>'; return; }
        el.innerHTML = group.notes.map(n => `
            <div class="group-note-item">
                <div class="group-note-text">${this.escapeHtml(n.text)}</div>
                <div class="group-note-meta">${n.author} · ${new Date(n.createdAt).toLocaleString()}</div>
                <button class="btn-icon-sm" onclick="studyHub.removeGroupNote('${group.id}','${n.id}')"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    async addGroupNote() {
        const group = this.groups.find(g => g.id === this.activeGroupId);
        if (!group) return;
        const text = await this.customPrompt({ title: 'Add Shared Note', label: 'Note content', placeholder: 'Write your note...' });
        if (!text) return;
        group.notes.push({ id: this.generateId(), text, author: 'You', createdAt: new Date().toISOString() });
        this.saveModuleData('edusync_groups', this.groups);
        this.renderGroupNotes(group);
    }

    removeGroupNote(groupId, noteId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        group.notes = group.notes.filter(n => n.id !== noteId);
        this.saveModuleData('edusync_groups', this.groups);
        this.renderGroupNotes(group);
    }

    renderGroupChat(group) {
        const el = document.getElementById('groupChat');
        if (!el) return;
        if (!group.chat.length) { el.innerHTML = '<p class="empty-list-msg chat-empty">No messages yet. Say hi! 👋</p>'; return; }
        el.innerHTML = group.chat.map(m => `
            <div class="chat-message ${m.author === 'You' ? 'mine' : 'theirs'}">
                <div class="chat-bubble">${this.escapeHtml(m.text)}</div>
                <div class="chat-meta">${m.author} · ${new Date(m.time).toLocaleTimeString()}</div>
            </div>
        `).join('');
        el.scrollTop = el.scrollHeight;
    }

    sendChatMessage() {
        const group = this.groups.find(g => g.id === this.activeGroupId);
        if (!group) return;
        const input = document.getElementById('chatInput');
        const text = input?.value.trim();
        if (!text) return;
        group.chat.push({ id: this.generateId(), text, author: 'You', time: new Date().toISOString() });
        this.saveModuleData('edusync_groups', this.groups);
        input.value = '';
        this.renderGroupChat(group);
    }

    async leaveGroup() {
        const ok = await this.customConfirm({ title: 'Leave Group', message: 'Are you sure you want to leave this group?', okLabel: 'Leave', okClass: 'btn-danger' });
        if (!ok) return;
        this.groups = this.groups.filter(g => g.id !== this.activeGroupId);
        this.activeGroupId = null;
        document.getElementById('collabEmptyState').style.display = '';
        document.getElementById('activeGroupPanel').style.display = 'none';
        this.saveModuleData('edusync_groups', this.groups);
        this.renderGroupsList();
    }

    // ══ MARKETPLACE ══
    async seedMarketItems() {
        this.marketItems = [
            { id: this.generateId(), title: 'Calculus Notes – Complete Semester', category: 'notes', description: 'Detailed handwritten + typed notes for MATH101, chapters 1–12.', price: 150, condition: 'new', seller: 'Ana R.', likes: 24, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: this.generateId(), title: 'Physics Textbook (Serway 10th Ed.)', category: 'textbook', description: 'Gently used. Minor highlighting on some pages.', price: 450, condition: 'good', seller: 'Carlo M.', likes: 8, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: this.generateId(), title: 'Biology Flashcards – Cell Division', category: 'flashcards', description: '120 cards covering mitosis, meiosis, and cell cycle. Digital PDF.', price: 80, condition: 'new', seller: 'Bea T.', likes: 15, createdAt: new Date(Date.now() - 86400000).toISOString() },
            { id: this.generateId(), title: 'CS101 Past Exam Papers (2020–2024)', category: 'past-papers', description: 'Four years of actual exam papers with answer keys.', price: 0, condition: 'new', seller: 'Diego L.', likes: 55, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
            { id: this.generateId(), title: 'English Literature Essay Pack', category: 'notes', description: 'Six graded essays with professor feedback. A-range work.', price: 120, condition: 'new', seller: 'Mia S.', likes: 19, createdAt: new Date().toISOString() },
        ];
        for (const item of this.marketItems) {
            await this.saveMarketItem(item);
        }
    }

    async listMarketItem() {
        const title = document.getElementById('sellTitle')?.value.trim();
        if (!title) { this.showToast('Item title is required', 'error'); return; }
        const item = {
            id: this.generateId(),
            title,
            category: document.getElementById('sellCategory')?.value,
            description: document.getElementById('sellDescription')?.value.trim(),
            price: parseFloat(document.getElementById('sellPrice')?.value) || 0,
            condition: document.getElementById('sellCondition')?.value,
            seller: 'You',
            likes: 0,
            createdAt: new Date().toISOString()
        };
        try {
            await this.saveMarketItem(item);
            this.marketItems.unshift(item);
        } catch (e) {
            this.showToast('Failed to save item. Please try again.', 'error');
            return;
        }
        document.getElementById('sellItemModal').classList.remove('active');
        ['sellTitle','sellDescription','sellPrice'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        this.renderMarket();
        this.gainXP(15);
        this.showToast('🛒 Item listed successfully!', 'success');
    }

    renderMarket() {
        const el = document.getElementById('marketGrid');
        if (!el) return;
        const search = document.getElementById('marketSearch')?.value.toLowerCase() || '';
        const cat = document.getElementById('marketCategoryFilter')?.value || '';
        const sort = document.getElementById('marketSortFilter')?.value || 'newest';

        let items = this.marketItems.filter(item => {
            const matchSearch = !search || item.title.toLowerCase().includes(search) || item.description?.toLowerCase().includes(search);
            const matchCat = !cat || item.category === cat;
            return matchSearch && matchCat;
        });

        items = [...items].sort((a, b) => {
            if (sort === 'price-asc') return a.price - b.price;
            if (sort === 'price-desc') return b.price - a.price;
            if (sort === 'popular') return b.likes - a.likes;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        if (items.length === 0) {
            el.innerHTML = '<div class="market-empty"><i class="fas fa-store"></i><p>No items found.</p></div>';
            return;
        }

        const catIcons = { notes: 'fa-sticky-note', textbook: 'fa-book', flashcards: 'fa-layer-group', 'past-papers': 'fa-file-alt', other: 'fa-box' };
        el.innerHTML = items.map(item => `
            <div class="market-card">
                <div class="market-card-header">
                    <div class="market-cat-icon"><i class="fas ${catIcons[item.category] || 'fa-box'}"></i></div>
                    <span class="market-cat-badge">${item.category}</span>
                    ${item.condition === 'new' ? '<span class="market-new-badge">New</span>' : ''}
                </div>
                <div class="market-card-body">
                    <h4>${this.escapeHtml(item.title)}</h4>
                    <p>${this.escapeHtml(item.description || '')}</p>
                </div>
                <div class="market-card-footer">
                    <div class="market-price">${item.price === 0 ? '<span class="free-label">FREE</span>' : '₱' + item.price.toFixed(0)}</div>
                    <div class="market-meta">
                        <span><i class="fas fa-heart"></i> ${item.likes}</span>
                        <span><i class="fas fa-user"></i> ${item.seller}</span>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="studyHub.contactSeller('${item.id}')">
                        ${item.price === 0 ? '<i class="fas fa-download"></i> Get Free' : '<i class="fas fa-envelope"></i> Contact'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    async contactSeller(itemId) {
        const item = this.marketItems.find(i => i.id === itemId);
        if (!item) return;
        if (item.price === 0) {
            item.likes = (item.likes || 0) + 1;
            try { await this.saveMarketItem(item); } catch(e) {}
            this.renderMarket();
            this.showToast(`📥 "${item.title}" — downloading free material!`, 'success');
            this.gainXP(2);
        } else {
            this.showToast(`📧 Message sent to ${item.seller}!`, 'info');
        }
    }

    // ══ FORUM ══
    seedForumPosts() {
        this.forumPosts = [
            { id: this.generateId(), title: 'Best resources for learning Calculus?', category: 'math', content: 'Looking for recommendations on textbooks, YouTube channels, or websites that helped you understand calculus. Struggling with integration by parts.', author: 'Maria L.', tags: ['calculus','resources'], likes: 12, replies: [], createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
            { id: this.generateId(), title: 'How to cite sources in APA 7th edition', category: 'english', content: 'I keep getting confused about the new APA 7th format differences vs 6th. Anyone have a quick summary or cheat sheet they can share?', author: 'James K.', tags: ['apa','citations'], likes: 8, replies: [], createdAt: new Date(Date.now() - 86400000).toISOString() },
            { id: this.generateId(), title: 'Study group for upcoming CS midterms', category: 'tech', content: 'Anyone in CS201 want to form a study group this weekend? I have notes for all topics and we can quiz each other. Reply or connect below.', author: 'Sam V.', tags: ['study-group','cs'], likes: 21, replies: [], createdAt: new Date().toISOString() },
        ];
        this.saveModuleData('edusync_forum', this.forumPosts);
    }

    publishPost() {
        const title = document.getElementById('postTitle')?.value.trim();
        const content = document.getElementById('postContent')?.value.trim();
        if (!title || !content) { this.showToast('Title and content are required', 'error'); return; }
        const post = {
            id: this.generateId(),
            title,
            content,
            category: document.getElementById('postCategory')?.value,
            tags: document.getElementById('postTags')?.value.split(',').map(t => t.trim()).filter(Boolean),
            author: 'You',
            likes: 0,
            replies: [],
            createdAt: new Date().toISOString()
        };
        this.forumPosts.unshift(post);
        this.saveModuleData('edusync_forum', this.forumPosts);
        document.getElementById('newPostModal').classList.remove('active');
        ['postTitle','postContent','postTags'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        this.renderForum();
        this.gainXP(10);
        this.showToast('📢 Post published!', 'success');
    }

    renderForum() {
        const el = document.getElementById('forumFeed');
        if (!el) return;
        const search = document.getElementById('forumSearch')?.value.toLowerCase() || '';
        let posts = this.forumPosts.filter(p => {
            const matchCat = this.forumActiveCategory === 'all' || p.category === this.forumActiveCategory;
            const matchSearch = !search || p.title.toLowerCase().includes(search) || p.content.toLowerCase().includes(search);
            return matchCat && matchSearch;
        });

        if (posts.length === 0) {
            el.innerHTML = '<div class="forum-empty"><i class="fas fa-comments"></i><p>No posts yet. Be the first to share!</p></div>';
            return;
        }

        const catColors = { math: '#6366f1', science: '#10b981', english: '#f59e0b', history: '#ef4444', tech: '#3b82f6', general: '#8b5cf6' };
        el.innerHTML = posts.map(p => `
            <div class="forum-post-card">
                <div class="forum-post-header">
                    <div>
                        <span class="forum-cat-dot" style="background:${catColors[p.category] || '#888'}"></span>
                        <span class="forum-cat-label">${p.category}</span>
                        <span class="forum-post-time">${this.timeAgo(p.createdAt)}</span>
                    </div>
                    <div class="forum-post-author"><i class="fas fa-user-circle"></i> ${p.author}</div>
                </div>
                <h4 class="forum-post-title">${this.escapeHtml(p.title)}</h4>
                <p class="forum-post-preview">${this.escapeHtml(p.content.substring(0, 160))}${p.content.length > 160 ? '...' : ''}</p>
                <div class="forum-post-tags">
                    ${p.tags.map(t => `<span class="forum-tag">#${t}</span>`).join('')}
                </div>
                <div class="forum-post-footer">
                    <button class="forum-like-btn" onclick="studyHub.likePost('${p.id}')">
                        <i class="fas fa-heart"></i> ${p.likes}
                    </button>
                    <button class="forum-reply-btn" onclick="studyHub.replyPost('${p.id}')">
                        <i class="fas fa-reply"></i> ${p.replies.length} Replies
                    </button>
                </div>
                ${p.replies.length > 0 ? `<div class="forum-replies">${p.replies.slice(-2).map(r => `
                    <div class="forum-reply"><strong>${r.author}:</strong> ${this.escapeHtml(r.text)}</div>
                `).join('')}</div>` : ''}
            </div>
        `).join('');
    }

    likePost(postId) {
        const post = this.forumPosts.find(p => p.id === postId);
        if (post) {
            post.likes++;
            this.saveModuleData('edusync_forum', this.forumPosts);
            this.renderForum();
            this.gainXP(1);
        }
    }

    async replyPost(postId) {
        const post = this.forumPosts.find(p => p.id === postId);
        if (!post) return;
        const text = await this.customPrompt({ title: 'Reply to Post', label: 'Your reply', placeholder: 'Share your thoughts...' });
        if (!text) return;
        post.replies.push({ id: this.generateId(), text, author: 'You', createdAt: new Date().toISOString() });
        this.saveModuleData('edusync_forum', this.forumPosts);
        this.renderForum();
        this.gainXP(3);
    }

    timeAgo(dateString) {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }
}

// Initialize only after Firebase is ready
var studyHub;
function initApp() {
    studyHub = new StudyHub();
    window.studyHub = studyHub;
}

if (window.db) {
    initApp();
} else {
    window.addEventListener('firebase-ready', initApp, { once: true });
}