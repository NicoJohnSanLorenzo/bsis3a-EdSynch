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
        
        this.init();
    }

    init() {
        this.loadTasks();
        this.loadQuizData();
        this.loadUserQuizzes();
        this.bindEvents();
        this.render();
        this.updateStats();
        this.updateQuizStats();
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
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadTasks() {
        const stored = localStorage.getItem('studyhub_tasks');
        if (stored) {
            this.tasks = JSON.parse(stored);
        } else {
            // Add sample tasks for demonstration
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
            this.saveTasks();
        }
    }

    saveTasks() {
        localStorage.setItem('studyhub_tasks', JSON.stringify(this.tasks));
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

    handleTaskSubmit(e) {
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
            }
        } else {
            const newTask = {
                id: this.generateId(),
                ...taskData,
                createdAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
        }

        this.saveTasks();
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

    confirmDelete() {
        if (this.deletingTaskId) {
            this.tasks = this.tasks.filter(t => t.id !== this.deletingTaskId);
            this.saveTasks();
            this.render();
            this.updateStats();
            this.closeDeleteModal();
        }
    }

    toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const statusFlow = {
                'pending': 'in-progress',
                'in-progress': 'completed',
                'completed': 'pending'
            };
            task.status = statusFlow[task.status] || 'pending';
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
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

        // Show/hide modules
        document.getElementById('tasksModule').style.display = module === 'tasks' ? '' : 'none';
        document.getElementById('quizModule').style.display = module === 'quiz' ? '' : 'none';

        // Update sidebar visibility
        document.querySelector('.sidebar').style.display = module === 'tasks' ? '' : 'none';
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
        const achievementsList = document.getElementById('achievementsList');
        const achievements = [
            { id: 'first_quiz', name: 'First Quiz', icon: 'fa-play', unlocked: this.quizStats.totalQuizzes >= 1 },
            { id: 'quiz_master', name: 'Quiz Master', icon: 'fa-trophy', unlocked: this.quizStats.totalQuizzes >= 10 },
            { id: 'perfect_score', name: 'Perfect Score', icon: 'fa-star', unlocked: false },
            { id: 'streak_warrior', name: 'Streak Warrior', icon: 'fa-fire', unlocked: this.quizStats.streak >= 5 },
            { id: 'point_collector', name: 'Point Collector', icon: 'fa-coins', unlocked: this.quizStats.totalPoints >= 100 }
        ];

        achievementsList.innerHTML = achievements.map(achievement => `
            <div class="achievement ${achievement.unlocked ? 'unlocked' : ''}">
                <i class="fas ${achievement.icon}"></i>
                <span>${achievement.name}</span>
            </div>
        `).join('');
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

    saveQuiz() {
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

        const title = prompt('Enter a title for your quiz:');
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

    deleteQuiz(quizId) {
        if (!confirm('Are you sure you want to delete this quiz?')) {
            return;
        }

        this.userQuizzes = this.userQuizzes.filter(q => q.id !== quizId);
        this.saveUserQuizzes();
        this.renderQuizzesList();
    }

    startUserQuiz(quizId) {
        const quiz = this.userQuizzes.find(q => q.id === quizId);
        if (!quiz) return;

        // Randomize questions
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

    retakeQuiz() {
        this.startUserQuiz(this.currentQuizId);
    }

    resetQuiz() {
        document.getElementById('quizSetup').style.display = '';
        document.getElementById('quizActive').style.display = 'none';
        document.getElementById('quizResults').style.display = 'none';
    }
}

// Initialize the application
const studyHub = new StudyHub();
