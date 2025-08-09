document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const currentTaskDisplay = document.getElementById('current-task-display');
    const workTimerDisplay = document.getElementById('work-timer');
    const breakTimerDisplay = document.getElementById('break-timer');
    const stopWorkBtn = document.getElementById('stop-work-btn');
    const startBreakBtn = document.getElementById('start-break-btn');
    const notificationSound = document.getElementById('notification-sound');
    const historyList = document.getElementById('history-list');


    // --- State ---
    let tasks = [];
    let history = [];
    let activeTaskId = null;
    let workTimerInterval = null;
    let workSeconds = 0;
    let breakTimerInterval = null;
    let breakSeconds = 0;


    // --- Functions ---

    /**
     * Saves the current tasks array to localStorage.
     */
    function saveTasks() {
        localStorage.setItem('flowmodoro_tasks', JSON.stringify(tasks));
    }

    /**
     * Saves the current history array to localStorage.
     */
    function saveHistory() {
        localStorage.setItem('flowmodoro_history', JSON.stringify(history));
    }

    /**
     * Renders the history from the state array to the DOM.
     */
    function renderHistory() {
        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-list-message">لا توجد جلسات مسجلة بعد.</p>';
            return;
        }

        // Show latest sessions first
        const reversedHistory = [...history].reverse();

        reversedHistory.forEach(session => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${session.taskText}</strong>
                <br>
                <span>مدة العمل: ${formatTime(session.workDuration, true)}</span> |
                <span>مدة الراحة: ${formatTime(session.breakDuration)}</span>
                <br>
                <small>${new Date(session.timestamp).toLocaleString('ar-EG')}</small>
            `;
            historyList.appendChild(li);
        });
    }

    /**
     * Adds the completed session to the history.
     */
    function addSessionToHistory() {
        const task = tasks.find(t => t.id === activeTaskId);
        if (!task) return;

        const newSession = {
            taskText: task.text,
            workDuration: workSeconds,
            breakDuration: breakSeconds,
            timestamp: Date.now()
        };

        history.push(newSession);
        saveHistory();
        renderHistory();
    }

    /**
     * Renders the tasks from the state array to the DOM.
     */
    function renderTasks() {
        // Clear current list
        taskList.innerHTML = '';

        if (tasks.length === 0) {
            taskList.innerHTML = '<p class="empty-list-message">لا توجد مهام بعد. أضف مهمة للبدء!</p>';
            return;
        }

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.dataset.id = task.id;
            li.textContent = task.text;

            if (task.completed) {
                li.classList.add('completed');
            }
            if (task.id === activeTaskId) {
                li.classList.add('active-task');
            }

            // Create action buttons container
            const taskActions = document.createElement('div');
            taskActions.classList.add('task-actions');

            // Create complete button
            const completeBtn = document.createElement('button');
            completeBtn.textContent = task.completed ? '↩️' : '✔️';
            completeBtn.title = task.completed ? 'إعادة فتح المهمة' : 'إكمال المهمة';
            completeBtn.classList.add('complete-btn');

            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'حذف المهمة';
            deleteBtn.classList.add('delete-btn');

            taskActions.appendChild(completeBtn);
            taskActions.appendChild(deleteBtn);
            li.appendChild(taskActions);

            taskList.appendChild(li);
        });
    }

    /**
     * Adds a new task to the list.
     * @param {string} text - The text content of the task.
     */
    function addTask(text) {
        const newTask = {
            id: Date.now(), // Simple unique ID
            text: text,
            completed: false
        };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
    }

    /**
     * Toggles the completed state of a task.
     * @param {number} id - The ID of the task to toggle.
     */
    function toggleComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        }
    }

    /**
     * Deletes a task from the list.
     * @param {number} id - The ID of the task to delete.
     */
    function deleteTask(id) {
        // We don't delete history, just the task itself.
        // Future improvement could be to anonymize history entries.
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }


    // --- Event Listeners ---

    // Handle form submission to add a new task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        if (taskText) {
            addTask(taskText);
            taskInput.value = '';
        }
    });

    /**
     * Formats seconds into HH:MM:SS or MM:SS string.
     * @param {number} totalSeconds
     * @param {boolean} forceHours - Whether to show hours even if 0.
     * @returns {string}
     */
    function formatTime(totalSeconds, forceHours = false) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        if (hours > 0 || forceHours) {
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        } else {
            return `${formattedMinutes}:${formattedSeconds}`;
        }
    }

    /**
     * Starts the work timer for the active task.
     */
    function startWorkTimer() {
        if (workTimerInterval) clearInterval(workTimerInterval);

        workTimerInterval = setInterval(() => {
            workSeconds++;
            workTimerDisplay.textContent = formatTime(workSeconds, true);
        }, 1000);

        stopWorkBtn.classList.remove('hidden');
    }

    /**
     * Stops the work timer, calculates break time, and updates UI.
     */
    function stopWorkTimer() {
        clearInterval(workTimerInterval);
        workTimerInterval = null;

        // Calculate break time (5% of work time)
        breakSeconds = Math.round(workSeconds * 0.05);
        if (breakSeconds < 60) breakSeconds = 60; // Minimum 1 minute break

        // Add to history BEFORE resetting timers
        addSessionToHistory();

        breakTimerDisplay.textContent = formatTime(breakSeconds);

        stopWorkBtn.classList.add('hidden');
        startBreakBtn.classList.remove('hidden');
    }

    /**
     * Starts the break timer.
     */
    function startBreakTimer() {
        startBreakBtn.classList.add('hidden');
        if (breakTimerInterval) clearInterval(breakTimerInterval);

        breakTimerInterval = setInterval(() => {
            breakSeconds--;
            breakTimerDisplay.textContent = formatTime(breakSeconds);

            if (breakSeconds <= 0) {
                clearInterval(breakTimerInterval);
                breakTimerInterval = null;
                notificationSound.play();
                // Reset for next task
                currentTaskDisplay.innerHTML = `<p>وقت الراحة انتهى! اختر مهمة جديدة.</p>`;
                activeTaskId = null;
                renderTasks(); // Rerender to remove active state
            }
        }, 1000);
    }

    /**
     * Selects a task to be the active focus session.
     * @param {number} id
     */
    function selectTask(id) {
        if (workTimerInterval) {
            alert('لا يمكنك تغيير المهمة أثناء جلسة عمل نشطة. أوقف الجلسة الحالية أولاً.');
            return;
        }
        const task = tasks.find(t => t.id === id);
        if (!task || task.completed) {
            alert('لا يمكن بدء جلسة على مهمة مكتملة.');
            return;
        }

        activeTaskId = id;
        currentTaskDisplay.innerHTML = `التركيز الآن على: <strong>${task.text}</strong>`;

        workSeconds = 0;
        workTimerDisplay.textContent = formatTime(workSeconds, true);
        breakSeconds = 0;
        breakTimerDisplay.textContent = formatTime(breakSeconds);

        startWorkTimer();
        renderTasks(); // To highlight the active task
    }


    // --- Event Listeners ---

    // Handle form submission to add a new task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        if (taskText) {
            addTask(taskText);
            taskInput.value = '';
        }
    });

    // Handle clicks on the task list (for completing, deleting, or selecting a task)
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const li = target.closest('li');
        if (!li) return;

        const taskId = Number(li.dataset.id);

        if (target.classList.contains('delete-btn')) {
            // Prevent deleting the active task
            if(taskId === activeTaskId && workTimerInterval) {
                alert('لا يمكن حذف المهمة النشطة أثناء جلسة عمل.');
                return;
            }
            if(taskId === activeTaskId) activeTaskId = null;
            deleteTask(taskId);
        } else if (target.classList.contains('complete-btn')) {
            if(taskId === activeTaskId && workTimerInterval) {
                alert('لا يمكن إكمال المهمة النشطة أثناء جلسة عمل.');
                return;
            }
            toggleComplete(taskId);
        } else {
            selectTask(taskId);
        }
    });

    // Handle timer control button clicks
    stopWorkBtn.addEventListener('click', stopWorkTimer);
    startBreakBtn.addEventListener('click', startBreakTimer);


    /**
     * Loads tasks from localStorage when the app starts.
     */
    function loadInitialData() {
        const storedTasks = localStorage.getItem('flowmodoro_tasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }

        const storedHistory = localStorage.getItem('flowmodoro_history');
        if (storedHistory) {
            history = JSON.parse(storedHistory);
        }

        renderTasks();
        renderHistory();
    }

    // --- Initial Load ---
    loadInitialData();

});
