// Time Weaver Calendar Application

// Global variables
let currentDate = new Date();
let currentView = 'month';
let events = JSON.parse(localStorage.getItem('timeWeaverEvents')) || [];
let timeBlocks = JSON.parse(localStorage.getItem('timeWeaverBlocks')) || [];
let tasks = JSON.parse(localStorage.getItem('timeWeaverTasks')) || [];
let selectedEvent = null;
let draggedElement = null;

// DOM elements
const calendarContainer = document.getElementById('calendar-container');
const viewSelector = document.getElementById('view-selector');
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const filterSelector = document.getElementById('filter-selector');

// Modal elements
const eventModal = document.getElementById('event-modal');
const timeBlockModal = document.getElementById('time-block-modal');
const taskModal = document.getElementById('task-modal');
const eventForm = document.getElementById('event-form');
const timeBlockForm = document.getElementById('time-block-form');
const taskForm = document.getElementById('task-form');

// Initialize the application
function init() {
    renderCalendar();
    setupEventListeners();
    setTheme(localStorage.getItem('timeWeaverTheme') || 'light');
}

// Set up event listeners
function setupEventListeners() {
    viewSelector.addEventListener('change', () => {
        currentView = viewSelector.value;
        renderCalendar();
    });

    themeToggle.addEventListener('click', toggleTheme);

    searchInput.addEventListener('input', filterEvents);
    filterSelector.addEventListener('change', filterEvents);

    // Modal event listeners
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // Form submissions
    eventForm.addEventListener('submit', saveEvent);
    timeBlockForm.addEventListener('submit', saveTimeBlock);
    taskForm.addEventListener('submit', saveTask);

    // Keyboard accessibility
    document.addEventListener('keydown', handleKeyboard);
}

// Render the calendar based on current view
function renderCalendar() {
    calendarContainer.innerHTML = '';

    switch (currentView) {
        case 'month':
            renderMonthView();
            break;
        case 'week':
            renderWeekView();
            break;
        case 'day':
            renderDayView();
            break;
    }
}

// Render month view
function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    let html = '<div class="month-view">';

    // Day headers
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => {
        html += `<div class="day-header">${day}</div>`;
    });

    // Calendar days
    let current = new Date(startDate);
    while (current <= endDate) {
        const isCurrentMonth = current.getMonth() === month;
        const isToday = isSameDay(current, new Date());
        const dayEvents = getEventsForDate(current);
        const dayBlocks = getTimeBlocksForDate(current);

        html += `<div class="day-cell ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}" data-date="${current.toISOString().split('T')[0]}">`;
        html += `<div class="day-number">${current.getDate()}</div>`;

        // Render events
        dayEvents.forEach(event => {
            html += `<div class="event ${event.type}" data-id="${event.id}" draggable="true">${event.title}</div>`;
        });

        // Render time blocks
        dayBlocks.forEach(block => {
            html += `<div class="time-block" data-id="${block.id}">${block.title}</div>`;
        });

        html += '</div>';

        current.setDate(current.getDate() + 1);
    }

    html += '</div>';
    calendarContainer.innerHTML = html;

    // Add event listeners to day cells
    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            if (!e.target.classList.contains('event')) {
                openEventModal(cell.dataset.date);
            }
        });
    });

    // Add event listeners to events
    document.querySelectorAll('.event').forEach(eventEl => {
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openEventModal(null, parseInt(eventEl.dataset.id));
        });
        eventEl.addEventListener('dragstart', handleDragStart);
    });

    // Add drag and drop listeners
    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('drop', handleDrop);
    });
}

// Render week view
function renderWeekView() {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    let html = '<div class="week-view">';

    // Time column header
    html += '<div class="hour-label"></div>';

    // Day headers
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        html += `<div class="hour-label">${day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>`;
    }

    // Time slots
    for (let hour = 0; hour < 24; hour++) {
        html += `<div class="hour-label">${hour.toString().padStart(2, '0')}:00</div>`;

        for (let day = 0; day < 7; day++) {
            const slotDate = new Date(startOfWeek);
            slotDate.setDate(startOfWeek.getDate() + day);
            slotDate.setHours(hour, 0, 0, 0);

            const slotEvents = getEventsForTimeSlot(slotDate);
            const slotBlocks = getTimeBlocksForTimeSlot(slotDate);

            html += `<div class="time-slot" data-date="${slotDate.toISOString()}">`;

            slotEvents.forEach(event => {
                html += `<div class="event ${event.type}" data-id="${event.id}" draggable="true">${event.title}</div>`;
            });

            slotBlocks.forEach(block => {
                html += `<div class="time-block" data-id="${block.id}">${block.title}</div>`;
            });

            html += '</div>';
        }
    }

    html += '</div>';
    calendarContainer.innerHTML = html;

    // Add event listeners for week view
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            if (!e.target.classList.contains('event') && !e.target.classList.contains('time-block')) {
                const dateTime = new Date(slot.dataset.date);
                const dateString = dateTime.toISOString().split('T')[0];
                const timeString = dateTime.toTimeString().slice(0, 5);
                openEventModal(dateString);
                document.getElementById('event-start-time').value = timeString;
                document.getElementById('event-end-time').value = timeString;
            }
        });
    });

    // Add event listeners to events
    document.querySelectorAll('.event').forEach(eventEl => {
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openEventModal(null, parseInt(eventEl.dataset.id));
        });
        eventEl.addEventListener('dragstart', handleDragStart);
    });

    // Add drag and drop listeners
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
    });
}

// Render day view
function renderDayView() {
    const dayEvents = getEventsForDate(currentDate);
    const dayTasks = getTasksForDate(currentDate);

    let html = `
        <div class="day-view">
            <h2 class="day-header-large">${currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
            <div class="day-events">
    `;

    dayEvents.forEach(event => {
        html += `
            <div class="day-event">
                <h3>${event.title}</h3>
                <p>${event.description}</p>
                <p>${formatTime(event.startTime)} - ${formatTime(event.endTime)}</p>
                <p>Type: ${event.type}</p>
                ${event.secondaryTimezone ? `<p>Secondary: ${formatTimeInTimezone(event.startTime, event.secondaryTimezone)} - ${formatTimeInTimezone(event.endTime, event.secondaryTimezone)} ${event.secondaryTimezone}</p>` : ''}
            </div>
        `;
    });

    html += `
            <div class="tasks-list">
                <h3>Tasks</h3>
    `;

    dayTasks.forEach(task => {
        html += `
            <div class="task-item">
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <span>${task.title}</span>
            </div>
        `;
    });

    html += `
                <button onclick="openTaskModal()">Add Task</button>
            </div>
        </div>
    `;

    calendarContainer.innerHTML = html;

    // Add task completion listeners
    document.querySelectorAll('.task-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const taskId = parseInt(e.target.dataset.id);
            toggleTaskCompletion(taskId);
        });
    });
}

// Event management functions
function openEventModal(date, eventId = null) {
    if (eventId) {
        selectedEvent = events.find(e => e.id === eventId);
        document.getElementById('modal-title').textContent = 'Edit Event';
        populateEventForm(selectedEvent);
    } else {
        selectedEvent = null;
        document.getElementById('modal-title').textContent = 'Add Event';
        eventForm.reset();
        if (date) {
            document.getElementById('event-date').value = date;
        }
    }
    eventModal.style.display = 'block';
}

function saveEvent(e) {
    e.preventDefault();

    const eventData = {
        id: selectedEvent ? selectedEvent.id : Date.now(),
        title: document.getElementById('event-title').value,
        description: document.getElementById('event-description').value,
        date: document.getElementById('event-date').value,
        startTime: document.getElementById('event-start-time').value,
        endTime: document.getElementById('event-end-time').value,
        type: document.getElementById('event-type').value,
        recurrence: document.getElementById('event-recurrence').value,
        secondaryTimezone: document.getElementById('secondary-timezone').value
    };

    if (selectedEvent) {
        const index = events.findIndex(e => e.id === selectedEvent.id);
        events[index] = eventData;
    } else {
        events.push(eventData);
    }

    saveToLocalStorage();
    renderCalendar();
    closeModals();
}

// Time block functions
function openTimeBlockModal() {
    timeBlockModal.style.display = 'block';
}

function saveTimeBlock(e) {
    e.preventDefault();

    const blockData = {
        id: Date.now(),
        title: document.getElementById('block-title').value,
        date: document.getElementById('block-date').value,
        startTime: document.getElementById('block-start-time').value,
        endTime: document.getElementById('block-end-time').value
    };

    timeBlocks.push(blockData);
    saveToLocalStorage();
    renderCalendar();
    closeModals();
}

// Task functions
function openTaskModal() {
    taskModal.style.display = 'block';
}

function saveTask(e) {
    e.preventDefault();

    const taskData = {
        id: Date.now(),
        title: document.getElementById('task-title').value,
        date: document.getElementById('task-date').value,
        completed: false
    };

    tasks.push(taskData);
    saveToLocalStorage();
    renderCalendar();
    closeModals();
}

function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage();
        // Add celebratory animation
        const checkbox = document.querySelector(`input[data-id="${taskId}"]`);
        checkbox.parentElement.classList.add('task-complete');
        setTimeout(() => {
            checkbox.parentElement.classList.remove('task-complete');
        }, 500);
    }
}

// Utility functions
function getEventsForDate(date) {
    return events.filter(event => event.date === date.toISOString().split('T')[0]);
}

function getTimeBlocksForDate(date) {
    return timeBlocks.filter(block => block.date === date.toISOString().split('T')[0]);
}

function getTasksForDate(date) {
    return tasks.filter(task => task.date === date.toISOString().split('T')[0]);
}

function getEventsForTimeSlot(dateTime) {
    return events.filter(event => {
        const eventDate = new Date(event.date + 'T' + event.startTime);
        return eventDate.getTime() === dateTime.getTime();
    });
}

function getTimeBlocksForTimeSlot(dateTime) {
    return timeBlocks.filter(block => {
        const blockDate = new Date(block.date + 'T' + block.startTime);
        return blockDate.getTime() === dateTime.getTime();
    });
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function formatTimeInTimezone(timeString, timezone) {
    // Simplified timezone conversion - in a real app, use a library like moment-timezone
    const [hours, minutes] = timeString.split(':');
    let hour = parseInt(hours);

    // Simple offset for demonstration (PST is UTC-8, EST is UTC-5)
    const offsets = { PST: -8, EST: -5, GMT: 0 };
    hour += offsets[timezone] || 0;

    if (hour < 0) hour += 24;
    if (hour >= 24) hour -= 24;

    return formatTime(`${hour.toString().padStart(2, '0')}:${minutes}`);
}

function populateEventForm(event) {
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-description').value = event.description;
    document.getElementById('event-date').value = event.date;
    document.getElementById('event-start-time').value = event.startTime;
    document.getElementById('event-end-time').value = event.endTime;
    document.getElementById('event-type').value = event.type;
    document.getElementById('event-recurrence').value = event.recurrence;
    document.getElementById('secondary-timezone').value = event.secondaryTimezone || '';
}

function closeModals() {
    eventModal.style.display = 'none';
    timeBlockModal.style.display = 'none';
    taskModal.style.display = 'none';
    selectedEvent = null;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('timeWeaverTheme', theme);
    themeToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function filterEvents() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterType = filterSelector.value;

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm) ||
                             event.description.toLowerCase().includes(searchTerm);
        const matchesFilter = filterType === 'all' || event.type === filterType;
        return matchesSearch && matchesFilter;
    });

    // Re-render with filtered events
    renderCalendar();
}

// Drag and drop functionality
function handleDragStart(e) {
    draggedElement = e.target;
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const targetCell = e.target.closest('.day-cell') || e.target.closest('.time-slot');
    if (!targetCell || !draggedElement) return;

    const eventId = parseInt(draggedElement.dataset.id);
    const newDate = targetCell.dataset.date.split('T')[0];

    const event = events.find(e => e.id === eventId);
    if (event) {
        event.date = newDate;
        saveToLocalStorage();
        renderCalendar();
    }
}

// Keyboard accessibility
function handleKeyboard(e) {
    if (e.key === 'Escape') {
        closeModals();
    }
    // Add more keyboard navigation as needed
}

function saveToLocalStorage() {
    localStorage.setItem('timeWeaverEvents', JSON.stringify(events));
    localStorage.setItem('timeWeaverBlocks', JSON.stringify(timeBlocks));
    localStorage.setItem('timeWeaverTasks', JSON.stringify(tasks));
}

// Initialize the app
init();
