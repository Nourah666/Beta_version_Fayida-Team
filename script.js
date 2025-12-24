// Fayida Team - Management Ecosystem Logic
// Optimized for performance and modularity.

/**
 * --- DATABASE LAYER ---
 * Handles localStorage persistence and data migration.
 */
const DB_KEY = 'fayida_academic_data';

// Initialize Empty DB if not exists
function initDB() {
    if (!localStorage.getItem(DB_KEY)) {
        const initialData = {
            majors: [
                { id: 'cs', name: 'Computer Science', nameAr: 'علوم الحاسب', icon: '💻', color: '#00d2ff' },
                { id: 'business', name: 'Business Administration', nameAr: 'إدارة الأعمال', icon: '📊', color: '#ffb900' },
                { id: 'health', name: 'Health Sciences', nameAr: 'العلوم الصحية', icon: '🏥', color: '#ff4d4d' },
                { id: 'english', name: 'English Literature', nameAr: 'الأدب الإنجليزي', icon: '📚', color: '#2ecc71' }
            ],
            subjects: [],
            config: {
                published: false,
                lastUpdated: new Date().toISOString()
            }
        };
        localStorage.setItem(DB_KEY, JSON.stringify(initialData));
    }
}

function getData() {
    return JSON.parse(localStorage.getItem(DB_KEY));
}

/**
 * Saves current data to localStorage and updates lastUpdated timestamp.
 * @param {Object} data - The full academic database object.
 */
function saveData(data) {
    data.config.lastUpdated = new Date().toISOString();
    localStorage.setItem(DB_KEY, JSON.stringify(data));
}

/**
 * Migrates old data format (single video string) to new format (video array).
 * Ensures backward compatibility and prevents site breakage.
 */
function migrateData() {
    const data = getData();
    let migrated = false;

    data.subjects.forEach(subject => {
        subject.weeks.forEach(week => {
            // If week.video is a string and not empty, convert it to an array of objects
            if (typeof week.video === 'string') {
                const oldVideo = week.video;
                week.videos = oldVideo ? [{ type: 'url', value: oldVideo }] : [];
                delete week.video;
                migrated = true;
            }
            // Ensure videos array exists
            if (!week.videos) {
                week.videos = [];
                migrated = true;
            }
        });
    });

    if (migrated) {
        console.log("Fayida Data Migration: Successfully updated to multi-video format.");
        saveData(data);
    }
}

// --- State Management ---
let appState = {
    currentMajor: null,
    currentCourse: null,
    currentWeek: 1,
    lang: localStorage.getItem('fayida_lang') || 'en',
    theme: localStorage.getItem('fayida_theme') || 'light'
};

/**
 * --- STUDENT PORTAL RENDERERS ---
 * Responsible for generating dynamic HTML for the index.html view.
 */
function renderStudentMajors() {
    const data = getData();
    const grid = document.getElementById('majors-grid');
    if (!grid) return;

    grid.innerHTML = data.majors.map(m => `
        <div class="card" onclick="navigateToCourses('${m.id}')">
            <span class="icon">${m.icon}</span>
            <h3>${appState.lang === 'en' ? m.name : m.nameAr}</h3>
            <p>${appState.lang === 'en' ? 'Explore subjects' : 'استكشف التخصصات'}</p>
        </div>
    `).join('');
}

function renderStudentCourses() {
    const data = getData();
    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    const majorSubjects = data.subjects.filter(s => s.majorId === appState.currentMajor);

    if (majorSubjects.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; opacity:0.6;">${appState.lang === 'en' ? 'No subjects published yet.' : 'لا توجد مواد منشورة بعد.'}</p>`;
        return;
    }

    grid.innerHTML = majorSubjects.map(s => {
        const completedCount = s.weeks.filter(w => isWeekOpen(w.openDate)).length;
        const progress = (completedCount / s.weeks.length) * 100;

        return `
        <div class="card" onclick="navigateToContent('${s.id}')">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge">Week 1 - ${s.weeks.length}</span>
                <span style="font-size:0.8rem; opacity:0.7;">${Math.round(progress)}%</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <h3 style="margin-top:10px;">${s.name}</h3>
            <button class="icon-btn" style="margin-top:15px; width:100%; border-radius:12px;">View Modules</button>
        </div>
        `;
    }).join('');
}

function renderStudentTimeline(subject) {
    const list = document.getElementById('weeks-list');
    if (!list) return;

    list.innerHTML = subject.weeks.map((w, i) => {
        const status = getWeekStatus(w);
        let icon = '📖';
        if (status === 'scheduled') icon = '⏳';
        if (status === 'closed') icon = '📁';
        if (status === 'draft') icon = '📝';

        return `
            <li class="${appState.currentWeek === (i + 1) ? 'active' : ''} status-${status}" onclick="selectWeek(${i + 1})">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="week-icon">${icon}</span>
                    <span>${appState.lang === 'en' ? 'Week' : 'أسبوع'} ${i + 1}</span>
                </div>
                ${status === 'scheduled' ? `<span class="badge" style="font-size:0.6rem;">${new Date(w.openDate).toLocaleDateString()}</span>` : ''}
            </li>
        `;
    }).join('');
}

function isWeekOpen(dateStr) {
    if (!dateStr) return true;
    return new Date() >= new Date(dateStr);
}

/**
 * Renders the hierarchical learning path (breadcrumbs).
 */
function renderLearningPath() {
    const nav = document.getElementById('learning-path');
    if (!nav) return;

    const data = getData();
    let html = `<span onclick="navigateHome()">🏠 ${appState.lang === 'en' ? 'Home' : 'الرئيسية'}</span>`;

    if (appState.currentMajor) {
        const major = data.majors.find(m => m.id === appState.currentMajor);
        html += ` <span class="separator">/</span> <span onclick="navigateToCourses('${major.id}')">${appState.lang === 'en' ? major.name : major.nameAr}</span>`;
    }

    if (appState.currentCourse) {
        html += ` <span class="separator">/</span> <span class="active">${appState.currentCourse.name}</span>`;
    }

    nav.innerHTML = html;
}

/**
 * Real-time search logic for the student portal.
 */
function handleSearch(query) {
    const dropdown = document.getElementById('search-results');
    if (!query || query.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    const data = getData();
    const results = [];
    const q = query.toLowerCase();

    // Search Majors
    data.majors.forEach(m => {
        if (m.name.toLowerCase().includes(q) || m.nameAr.includes(q)) {
            results.push({ type: 'Major', label: m.name, action: () => navigateToCourses(m.id) });
        }
    });

    // Search Subjects
    data.subjects.forEach(s => {
        if (s.name.toLowerCase().includes(q)) {
            results.push({ type: 'Subject', label: s.name, action: () => navigateToContent(s.id) });
        }
    });

    if (results.length === 0) {
        dropdown.innerHTML = `<div class="search-result-item">No results found</div>`;
    } else {
        dropdown.innerHTML = results.slice(0, 8).map(r => `
            <div class="search-result-item" onclick="executeSearchResult('${r.type}', '${r.label}')">
                <span class="match-type">${r.type}</span>
                <strong>${r.label}</strong>
            </div>
        `).join('');
        // Store actions globally for simple access from onclick string
        window._currentSearchResults = results;
    }
    dropdown.style.display = 'block';
}

function executeSearchResult(type, label) {
    const result = window._currentSearchResults.find(r => r.type === type && r.label === label);
    if (result) result.action();
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('site-search').value = '';
}

// --- Navigation Logic ---
function navigateHome() {
    appState.currentMajor = null;
    appState.currentCourse = null;
    hideAllViews();
    const view = document.getElementById('view-majors');
    if (view) {
        view.classList.add('active');
        renderStudentMajors();
        renderLearningPath();
        document.documentElement.style.setProperty('--accent-color', 'var(--primary-teal)');
    }
}

function navigateToCourses(majorId) {
    if (majorId) appState.currentMajor = majorId;
    appState.currentCourse = null;
    const data = getData();
    const major = data.majors.find(m => m.id === appState.currentMajor);

    hideAllViews();
    document.getElementById('view-courses').classList.add('active');
    document.getElementById('current-major-title').innerText = appState.lang === 'en' ? major.name : major.nameAr;
    document.documentElement.style.setProperty('--accent-color', major.color || 'var(--primary-teal)');

    renderStudentCourses();
    renderLearningPath();
}

function navigateToContent(subjectId) {
    const data = getData();
    appState.currentCourse = data.subjects.find(s => s.id === subjectId);
    appState.currentMajor = appState.currentCourse.majorId;

    hideAllViews();
    document.getElementById('view-content').classList.add('active');
    document.getElementById('current-course-title').innerText = appState.currentCourse.name;

    const major = data.majors.find(m => m.id === appState.currentMajor);
    document.documentElement.style.setProperty('--accent-color', major.color || 'var(--primary-teal)');

    renderStudentTimeline(appState.currentCourse);
    renderLearningPath();
    selectWeek(1);
}

function selectWeek(weekNum) {
    appState.currentWeek = weekNum;
    const week = appState.currentCourse.weeks[weekNum - 1];

    document.querySelectorAll('#weeks-list li').forEach((li, i) => {
        li.classList.toggle('active', (i + 1) === weekNum);
    });

    const display = document.getElementById('week-details');
    const status = getWeekStatus(week);

    if (status === 'scheduled') {
        display.innerHTML = `<div class="locked-state fadeIn">
            <h2 style="font-size:4rem; margin-bottom:20px;">⏳</h2>
            <h3>${appState.lang === 'en' ? 'Upcoming Content' : 'محتوى قادم'}</h3>
            <p>${appState.lang === 'en' ? 'This module will automatically unlock on:' : 'سيفتح هذا المديول تلقائياً في:'}</p>
            <div class="opening-time-badge">
                <i class="far fa-calendar-alt"></i> ${new Date(week.openDate).toLocaleString()}
            </div>
            ${renderCountdown(week.openDate)}
        </div>`;
        return;
    }

    if (status === 'closed') {
        display.innerHTML = `<div class="locked-state fadeIn">
            <h2 style="font-size:4rem; margin-bottom:20px;">📁</h2>
            <h3>${appState.lang === 'en' ? 'Module Closed' : 'المديول مغلق'}</h3>
            <p>${appState.lang === 'en' ? 'This content is no longer active.' : 'هذا المحتوى لم يعد متاحاً.'}</p>
        </div>`;
        return;
    }

    display.innerHTML = `
        <div class="content-view fadeIn">
            <div class="content-meta">
                <span class="badge">Week ${weekNum}</span>
                <h2>${week.title || (appState.lang === 'en' ? 'Course Materials' : 'مواد الدورة')}</h2>
            </div>
            
            <div class="media-stack">
                ${week.videos && week.videos.length > 0 ? `
                    <div class="media-item">
                        <h4>📽️ ${appState.lang === 'en' ? 'Video Lectures' : 'المحاضرات المرئية'}</h4>
                        <div class="videos-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                            ${week.videos.map((vid, idx) => `
                                <div class="video-card">
                                    <div class="video-container">
                                        ${vid.type === 'url'
            ? `<iframe src="${vid.value.replace('watch?v=', 'embed/')}" frameborder="0" allowfullscreen></iframe>`
            : `<video controls style="width:100%; height:100%; border-radius:15px; background:#000;"><source src="${vid.value}" type="video/mp4"></video>`
        }
                                    </div>
                                    <p style="margin-top:10px; font-size:0.85rem; opacity:0.8;">Lecture Part ${idx + 1}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${week.pdf ? `
                    <div class="media-item">
                        <h4>📄 Reading & Resources</h4>
                        <a href="${week.pdf}" target="_blank" class="download-link">Open PDF Document</a>
                    </div>
                ` : ''}

                ${week.notes ? `
                    <div class="media-item">
                        <h4>📝 Instructions & Notes</h4>
                        <div class="notes-box">${week.notes}</div>
                    </div>
                ` : ''}

                ${week.discussion ? `
                    <div class="media-item">
                        <h4>💬 Discussion Prompt</h4>
                        <p>${week.discussion}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Determines the current status of a week based on its timing.
 */
function getWeekStatus(week) {
    const now = new Date();
    const open = week.openDate ? new Date(week.openDate) : null;
    const close = week.closeDate ? new Date(week.closeDate) : null;

    if (!open) return 'draft';
    if (now < open) return 'scheduled';
    if (close && now > close) return 'closed';
    return 'open';
}

/**
 * Computes the remaining time until a date and returns a formatted countdown string.
 * @param {string} targetDate - The ISO or date string to count down to.
 * @returns {string} HTML string representing the countdown.
 */
function renderCountdown(targetDate) {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return '';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);

    return `<p class="countdown-timer" style="margin-top:15px; font-weight:700; color:var(--accent-color);">
        <i class="fas fa-hourglass-half"></i> ${parts.join(' ')} ${appState.lang === 'en' ? 'remaining' : 'متبقية'}
    </p>`;
}

/**
 * --- SUPER ADMIN LOGIC ---
 * Handles subject and week management for administrator users.
 */
function renderAdminHub() {
    const data = getData();
    const container = document.getElementById('admin-subjects-grid');
    if (!container) return;

    container.innerHTML = data.subjects.map(s => {
        const statuses = s.weeks.map(w => getWeekStatus(w));
        const isOpen = statuses.includes('open');

        return `
        <div class="admin-card">
            <div style="display:flex; justify-content:space-between;">
                <h3>${s.name}</h3>
                <span class="status-label ${isOpen ? 'status-open' : 'status-draft'}">${isOpen ? 'Active' : 'Pending'}</span>
            </div>
            <p class="badge" style="margin-top:10px;">${s.majorId.toUpperCase()}</p>
            <p style="margin-top:10px; opacity:0.7;">Weeks: ${s.weeks.length}</p>
            <div class="actions-row">
                <button class="icon-btn" onclick="openWeekEditor('${s.id}')">Edit Content</button>
                <button class="danger-btn" onclick="deleteSubject('${s.id}')">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

function addSubject() {
    const name = document.getElementById('new-subject-name').value;
    const majorId = document.getElementById('new-subject-major').value;
    const weekCount = parseInt(document.getElementById('new-subject-weeks').value);

    if (!name) return alert('Please enter a subject name');

    const data = getData();
    const newSubject = {
        id: 's' + Date.now(),
        name: name,
        majorId: majorId,
        weeks: Array.from({ length: weekCount }, (_, i) => ({
            number: i + 1,
            title: '',
            openDate: '',
            videos: [], // New multi-video format
            pdf: '',
            notes: '',
            discussion: ''
        }))
    };

    data.subjects.push(newSubject);
    saveData(data);
    closeOverlay('add-subject-overlay');
    renderAdminHub();
}

function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    const data = getData();
    data.subjects = data.subjects.filter(s => s.id !== id);
    saveData(data);
    renderAdminHub();
}

function hardReset() {
    if (!confirm('WARNING: This will delete ALL subjects and content. Continue?')) return;
    localStorage.removeItem(DB_KEY);
    location.reload();
}

// --- Week Editor Logic ---
let activeEditorSubjectId = null;
let activeEditorWeekNum = 1;

function openWeekEditor(id) {
    activeEditorSubjectId = id;
    activeEditorWeekNum = 1;
    const data = getData();
    const subject = data.subjects.find(s => s.id === id);

    document.getElementById('editor-subject-name').innerText = subject.name;
    renderWeekTabs(subject.weeks.length);
    loadWeekToForm();
    openOverlay('week-editor-overlay');
}

function renderWeekTabs(count) {
    const row = document.getElementById('week-tabs-row');
    row.innerHTML = Array.from({ length: count }, (_, i) => i + 1).map(w => `
        <div class="week-tab ${activeEditorWeekNum === w ? 'active' : ''}" onclick="switchEditorWeek(${w})">
            Week ${w}
        </div>
    `).join('');
}

function switchEditorWeek(num) {
    saveWeekFromForm(); // Auto-save current work
    activeEditorWeekNum = num;
    renderWeekTabs(getData().subjects.find(s => s.id === activeEditorSubjectId).weeks.length);
    loadWeekToForm();
}

/**
 * Clones the current week's content into a new week and appends it to the subject.
 */
function cloneCurrentWeek() {
    const data = getData();
    const subject = data.subjects.find(s => s.id === activeEditorSubjectId);
    if (!subject) return;

    // Get current form data instead of stored data to clone unsaved changes too
    const currentWeekData = {
        number: subject.weeks.length + 1,
        title: document.getElementById('edit-week-title').value + ' (Copy)',
        openDate: document.getElementById('edit-week-date').value,
        closeDate: document.getElementById('edit-week-expiry').value,
        videos: Array.from(document.querySelectorAll('#video-fields-list .video-input-group')).map(group => ({
            type: group.querySelector('.vid-type').value,
            value: group.querySelector('.vid-value').value
        })).filter(v => v.value),
        pdf: document.getElementById('edit-week-pdf').value,
        notes: document.getElementById('edit-week-notes').value,
        discussion: document.getElementById('edit-week-discussion').value
    };

    subject.weeks.push(currentWeekData);
    saveData(data);

    // Refresh UI
    activeEditorWeekNum = subject.weeks.length;
    renderWeekTabs(subject.weeks.length);
    loadWeekToForm();
    alert('Week successfully cloned!');
}

/**
 * Adapts the subject creation form based on selected specialization.
 * Provides contextual hints for the admin.
 */
function adaptSubjectForm(majorId) {
    const hint = document.getElementById('adaptive-hint');
    if (!hint) return;

    hint.style.display = 'block';
    const hints = {
        cs: "💻 CS subjects usually require video tutorials and code resource links.",
        business: "📊 Business courses focus on case studies and financial spreadsheets.",
        health: "🏥 Health modules often include high-res anatomical diagrams and medical references.",
        english: "📚 English Literature requires reading lists and essay prompts."
    };
    hint.innerText = hints[majorId] || "";
}

function loadWeekToForm() {
    const data = getData();
    const subject = data.subjects.find(s => s.id === activeEditorSubjectId);
    const week = subject.weeks[activeEditorWeekNum - 1];

    document.getElementById('edit-week-title').value = week.title || '';
    document.getElementById('edit-week-date').value = week.openDate || '';
    document.getElementById('edit-week-expiry').value = week.closeDate || '';

    // Multi-video loading
    renderVideoInputs(week.videos || []);

    document.getElementById('edit-week-pdf').value = week.pdf || '';
    document.getElementById('edit-week-notes').value = week.notes || '';
    document.getElementById('edit-week-discussion').value = week.discussion || '';
}

/**
 * Dynamically generates video input fields in the editor.
 * Includes a numeric selector for quick bulk adding.
 */
function renderVideoInputs(videos) {
    const container = document.getElementById('video-inputs-container');
    if (!container) return;

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <label style="margin:0;">📽️ Video Content</label>
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="font-size:0.8rem; opacity:0.7;">Count:</span>
                <select id="video-count-selector" onchange="setVideoCount(this.value)" style="width:60px; padding:4px;">
                    ${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${videos.length === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
                <button class="icon-btn" onclick="addVideoField()" style="padding:4px 12px; font-size:0.8rem;">+ New</button>
            </div>
        </div>
        <div id="video-fields-list">
            ${videos.map((v, i) => generateVideoFieldHTML(i, v.type, v.value)).join('')}
        </div>
    `;
}

/**
 * Resets the video fields to a specific number.
 */
function setVideoCount(count) {
    const list = document.getElementById('video-fields-list');
    const currentVideos = [];

    // Save current values first
    document.querySelectorAll('#video-fields-list .video-input-group').forEach(group => {
        currentVideos.push({
            type: group.querySelector('.vid-type').value,
            value: group.querySelector('.vid-value').value
        });
    });

    list.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const existing = currentVideos[i] || { type: 'url', value: '' };
        const div = document.createElement('div');
        div.innerHTML = generateVideoFieldHTML(i, existing.type, existing.value);
        list.appendChild(div.firstElementChild);
    }
}

function generateVideoFieldHTML(index, type, value) {
    return `
        <div class="video-input-group" style="display:flex; gap:10px; margin-bottom:10px; background:rgba(255,255,255,0.05); padding:10px; border-radius:10px;">
            <select class="vid-type" style="width:100px;">
                <option value="url" ${type === 'url' ? 'selected' : ''}>URL</option>
                <option value="file" ${type === 'file' ? 'selected' : ''}>File</option>
            </select>
            <input type="text" class="vid-value" value="${value}" placeholder="Link or File Name" style="flex:1;">
            <button class="danger-btn" onclick="this.parentElement.remove()" style="padding:8px 12px;">×</button>
        </div>
    `;
}

function addVideoField() {
    const list = document.getElementById('video-fields-list');
    const div = document.createElement('div');
    div.innerHTML = generateVideoFieldHTML(list.children.length, 'url', '');
    list.appendChild(div.firstElementChild);
}

function saveWeekFromForm() {
    const data = getData();
    const subjectIndex = data.subjects.findIndex(s => s.id === activeEditorSubjectId);
    const weekIndex = activeEditorWeekNum - 1;

    // Collect multi-video data
    const videos = [];
    document.querySelectorAll('#video-fields-list .video-input-group').forEach(group => {
        const type = group.querySelector('.vid-type').value;
        const value = group.querySelector('.vid-value').value;
        if (value) videos.push({ type, value });
    });

    data.subjects[subjectIndex].weeks[weekIndex] = {
        number: activeEditorWeekNum,
        title: document.getElementById('edit-week-title').value,
        openDate: document.getElementById('edit-week-date').value,
        closeDate: document.getElementById('edit-week-expiry').value,
        videos: videos,
        pdf: document.getElementById('edit-week-pdf').value,
        notes: document.getElementById('edit-week-notes').value,
        discussion: document.getElementById('edit-week-discussion').value
    };

    saveData(data);
}

// --- Overlay Helpers ---
function openOverlay(id) {
    document.getElementById(id).classList.add('active');
}

function closeOverlay(id) {
    document.getElementById(id).classList.remove('active');
}

// --- Global Controls ---
function hideAllViews() {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
}

// --- Initialization ---
function initApp() {
    initDB();
    migrateData(); // Handle multi-video upgrade
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.onclick = () => {
            appState.theme = appState.theme === 'light' ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('fayida_theme', appState.theme);
        };
        if (appState.theme === 'dark') document.body.classList.add('dark-mode');
    }

    // Language Toggle Logic
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.onclick = () => {
            appState.lang = appState.lang === 'en' ? 'ar' : 'en';
            document.documentElement.setAttribute('lang', appState.lang);
            document.documentElement.setAttribute('dir', appState.lang === 'ar' ? 'rtl' : 'ltr');
            localStorage.setItem('fayida_lang', appState.lang);
            applyTranslations(); // Apply text changes without reload if possible
            location.reload(); // Still reloading to ensure all dynamic components refresh
        };
        document.documentElement.setAttribute('lang', appState.lang);
        document.documentElement.setAttribute('dir', appState.lang === 'ar' ? 'rtl' : 'ltr');
    }

    if (location.pathname.includes('super-admin.html')) {
        renderAdminHub();
    } else {
        navigateHome();
    }

    // Hide loader after minor delay for aesthetic effect
    setTimeout(() => {
        const loader = document.getElementById('site-loader');
        if (loader) loader.classList.add('hidden');
    }, 800);
}

/**
 * Updates text content across the site based on current language state.
 */
function applyTranslations() {
    const isAr = appState.lang === 'ar';
    const translations = {
        't-platform-name': isAr ? 'فريق فائدة' : 'Fayida Team',
        't-tagline': isAr ? 'المركز الأكاديمي' : 'Academic Hub',
        't-select-major': isAr ? 'اختر تخصصك' : 'Select Your Specialization',
        't-major-desc': isAr ? 'اختر تخصصاً لاستكشاف المواد المتاحة' : 'Choose a major to explore available courses',
        't-back': isAr ? 'رجوع' : 'Back',
        't-back-courses': isAr ? 'العودة للمواد' : 'Back to Subjects',
        't-whatsapp': isAr ? 'واتساب' : 'WhatsApp',
        't-telegram': isAr ? 'تيليجرام' : 'Telegram',
        't-email': isAr ? 'البريد الإلكتروني' : 'Email Us'
    };

    Object.keys(translations).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = translations[id];
    });
}

document.addEventListener('DOMContentLoaded', initApp);
