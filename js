// ==========================================
// ATTENDANCE APP - VANILLA JAVASCRIPT
// ==========================================

// ==========================================
// DATA STORE
// ==========================================

const Store = {
    currentUser: null,
    
    getUsers() {
        const data = localStorage.getItem('attendapp_users');
        return data ? JSON.parse(data) : [];
    },
    
    saveUsers(users) {
        localStorage.setItem('attendapp_users', JSON.stringify(users));
    },
    
    addUser(user) {
        const users = this.getUsers();
        users.push(user);
        this.saveUsers(users);
    },
    
    updateUser(userId, userType, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === userId && u.type === userType);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.saveUsers(users);
            
            // Update current user if it's the same
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser = users[index];
            }
            
            return users[index];
        }
        return null;
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toast-text');
    text.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('show');
    }, 3000);
}

function showModal(title, bodyHTML) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getInitials(firstName, lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
}

function calculateAttendancePercentage(subject) {
    const records = subject.attendanceRecords || [];
    if (records.length === 0) return 0;
    const present = records.filter(r => r.status === 'present').length;
    return Math.round((present / records.length) * 100);
}

// ==========================================
// LOGIN SCREEN
// ==========================================

function initLogin() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const form = document.getElementById('login-form');
    const welcomeText = document.getElementById('login-welcome');
    const idLabel = document.getElementById('id-label');
    const registerContainer = document.getElementById('register-container');
    const adminHint = document.getElementById('admin-hint');
    const errorMsg = document.getElementById('error-msg');
    
    let userType = 'teacher';
    
    // Toggle buttons
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            userType = btn.dataset.type;
            errorMsg.classList.add('hidden');
            
            if (userType === 'teacher') {
                welcomeText.textContent = 'Welcome Teacher!';
                idLabel.textContent = 'Teacher ID';
                registerContainer.classList.remove('hidden');
                adminHint.classList.add('hidden');
            } else if (userType === 'student') {
                welcomeText.textContent = 'Welcome Student!';
                idLabel.textContent = 'Student ID';
                registerContainer.classList.remove('hidden');
                adminHint.classList.add('hidden');
            } else {
                welcomeText.textContent = 'Welcome Admin!';
                idLabel.textContent = 'Admin ID';
                registerContainer.classList.add('hidden');
                adminHint.classList.remove('hidden');
            }
        });
    });
    
    // Login form
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('login-id').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        errorMsg.classList.add('hidden');
        
        if (!id || !password) {
            errorMsg.textContent = 'Please enter both ID and password';
            errorMsg.classList.remove('hidden');
            return;
        }
        
        // Admin login
        if (userType === 'admin' && id === 'admin' && password === 'admin123') {
            Store.currentUser = {
                id: 'admin',
                type: 'admin',
                firstName: 'Admin',
                lastName: 'User'
            };
            showToast('Welcome, Administrator!');
            showScreen('admin-dashboard');
            loadAdminDashboard();
            return;
        }
        
        // Regular users
        const users = Store.getUsers();
        const user = users.find(u => u.type === userType && u.id === id && u.password === password);
        
        if (user) {
            Store.currentUser = user;
            Store.updateUser(user.id, user.type, { lastLogin: new Date().toISOString() });
            showToast(`Welcome back, ${user.firstName}!`);
            
            if (user.type === 'student') {
                showScreen('student-dashboard');
                loadStudentDashboard();
            } else {
                showScreen('teacher-dashboard');
                loadTeacherDashboard();
            }
        } else {
            errorMsg.textContent = 'Error: Check password and ID';
            errorMsg.classList.remove('hidden');
        }
    });
    
    // Register link
    document.getElementById('register-link').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register-screen');
    });
    
    // Forgot password
    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('Forgot Password', `
            <div class="form-field">
                <label class="field-label">Email Address</label>
                <input type="email" id="reset-email" class="input-field" placeholder="Enter your email">
            </div>
            <button class="btn-login" onclick="sendPasswordReset()">Send Reset Link</button>
        `);
    });
}

window.sendPasswordReset = function() {
    const email = document.getElementById('reset-email').value;
    if (email) {
        showToast('Password reset link sent to your email!');
        closeModal();
    } else {
        showToast('Please enter your email');
    }
};

// ==========================================
// REGISTRATION SCREEN
// ==========================================

function initRegister() {
    const form = document.getElementById('register-form');
    const backBtn = document.getElementById('register-back');
    
    backBtn.addEventListener('click', () => showScreen('login-screen'));
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const firstName = document.getElementById('reg-firstname').value.trim();
        const lastName = document.getElementById('reg-lastname').value.trim();
        const middleInitial = document.getElementById('reg-middleinitial').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const id = document.getElementById('reg-id').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const type = document.getElementById('reg-type').value;
        
        // Check if ID exists
        const users = Store.getUsers();
        if (users.find(u => u.id === id)) {
            showToast('ID already exists. Please use a different ID.');
            return;
        }
        
        const newUser = {
            id,
            type,
            firstName,
            lastName,
            middleInitial,
            email,
            password,
            subjects: [],
            createdAt: new Date().toISOString()
        };
        
        Store.addUser(newUser);
        showToast('Registration successful! Please login.');
        form.reset();
        showScreen('login-screen');
    });
}

// ==========================================
// STUDENT DASHBOARD
// ==========================================

function loadStudentDashboard() {
    const user = Store.currentUser;
    if (!user) return;
    
    document.getElementById('student-name-display').textContent = `${user.firstName}!`;
    
    const subjects = user.subjects || [];
    const content = document.getElementById('student-content');
    
    if (subjects.length === 0) {
        content.innerHTML = `
            <div class="no-subjects-card">
                <p>No subject added yet</p>
            </div>
            <button class="btn-add-subject" onclick="goToScanner()">Scan QR Code</button>
        `;
    } else {
        // Calculate stats
        let totalPresent = 0;
        let totalRecords = 0;
        
        subjects.forEach(subject => {
            const records = subject.attendanceRecords || [];
            totalRecords += records.length;
            totalPresent += records.filter(r => r.status === 'present').length;
        });
        
        const overallPercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        
        // Render subjects
        const subjectsHTML = subjects.map(subject => {
            const records = subject.attendanceRecords || [];
            const present = records.filter(r => r.status === 'present').length;
            const total = records.length;
            const percentage = calculateAttendancePercentage(subject);
            
            return `
                <div class="subject-card">
                    <div class="subject-header">
                        <div class="subject-name">${subject.name}</div>
                        <div class="attendance-badge">${percentage}%</div>
                    </div>
                    <div class="subject-stats">
                        <div class="stat-item">
                            <span>📊</span>
                            <span>${present}/${total} Present</span>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Attendance</span>
                            <span>${percentage}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">${subjects.length}</div>
                    <div class="stat-label">Total Subjects</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${overallPercentage}%</div>
                    <div class="stat-label">Overall Attendance</div>
                </div>
            </div>
            <div class="subjects-container">
                ${subjectsHTML}
            </div>
            <button class="btn-add-subject" onclick="goToScanner()" style="margin-top: 16px;">Scan QR Code</button>
        `;
    }
}

window.goHome = function() {
    const user = Store.currentUser;
    if (!user) return;
    
    if (user.type === 'student') {
        showScreen('student-dashboard');
        loadStudentDashboard();
    } else if (user.type === 'teacher') {
        showScreen('teacher-dashboard');
        loadTeacherDashboard();
    } else if (user.type === 'admin') {
        showScreen('admin-dashboard');
        loadAdminDashboard();
    }
};

window.goToProfile = function() {
    const user = Store.currentUser;
    if (!user) return;
    
    if (user.type === 'student') {
        showScreen('student-profile');
        loadStudentProfile();
    } else if (user.type === 'teacher') {
        showScreen('teacher-profile');
        loadTeacherProfile();
    }
};

window.goToScanner = function() {
    showScreen('qr-scanner');
};

// ==========================================
// QR SCANNER
// ==========================================

function initScanner() {
    document.getElementById('scanner-back').addEventListener('click', () => {
        showScreen('student-dashboard');
        loadStudentDashboard();
    });
    
    document.getElementById('simulate-scan').addEventListener('click', () => {
        const users = Store.getUsers();
        const teachers = users.filter(u => u.type === 'teacher');
        
        if (teachers.length === 0) {
            showToast('No teachers available');
            return;
        }
        
        let availableSubjects = [];
        teachers.forEach(teacher => {
            if (teacher.subjects && teacher.subjects.length > 0) {
                teacher.subjects.forEach(subject => {
                    availableSubjects.push({
                        ...subject,
                        teacherName: `${teacher.firstName} ${teacher.lastName}`
                    });
                });
            }
        });
        
        if (availableSubjects.length === 0) {
            showToast('No subjects available to join');
            return;
        }
        
        const options = availableSubjects.map((s, i) =>
            `<option value="${i}">${s.name} (${s.teacherName})</option>`
        ).join('');
        
        showModal('Join Subject', `
            <div class="form-field">
                <label class="field-label">Select Subject to Join</label>
                <select id="subject-select" class="input-field">
                    <option value="">Choose a subject</option>
                    ${options}
                </select>
            </div>
            <button class="btn-login" onclick="joinSelectedSubject()">Join Subject</button>
        `);
        
        window.availableSubjects = availableSubjects;
    });
}

window.joinSelectedSubject = function() {
    const select = document.getElementById('subject-select');
    const index = select.value;
    
    if (!index) {
        showToast('Please select a subject');
        return;
    }
    
    const subject = window.availableSubjects[parseInt(index)];
    const user = Store.currentUser;
    
    if (user.subjects && user.subjects.some(s => s.id === subject.id)) {
        showToast('Already enrolled in this subject');
        closeModal();
        return;
    }
    
    const newSubject = {
        id: subject.id,
        name: subject.name,
        edpCode: subject.edpCode,
        status: null,
        attendanceRecords: []
    };
    
    const updatedSubjects = [...(user.subjects || []), newSubject];
    Store.updateUser(user.id, user.type, { subjects: updatedSubjects });
    
    showToast(`Joined ${subject.name}!`);
    closeModal();
    showScreen('student-dashboard');
    loadStudentDashboard();
};

// ==========================================
// TEACHER DASHBOARD
// ==========================================

function loadTeacherDashboard() {
    const user = Store.currentUser;
    if (!user) return;
    
    document.getElementById('teacher-name-display').textContent = `${user.firstName}!`;
    
    const subjects = user.subjects || [];
    const content = document.getElementById('teacher-content');
    
    if (subjects.length === 0) {
        content.innerHTML = `
            <div class="no-subjects-card">
                <p>No subjects assigned yet</p>
            </div>
        `;
    } else {
        const subjectsHTML = subjects.map(subject => {
            const studentCount = subject.students ? subject.students.length : 0;
            
            return `
                <div class="subject-card">
                    <div class="subject-header">
                        <div class="subject-name">${subject.name}</div>
                    </div>
                    <div class="subject-stats">
                        <div class="stat-item">
                            <span>👥</span>
                            <span>${studentCount} students</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = `<div class="subjects-container">${subjectsHTML}</div>`;
    }
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================

function loadAdminDashboard() {
    loadAdminOverview();
}

function loadAdminOverview() {
    const users = Store.getUsers();
    const students = users.filter(u => u.type === 'student');
    const teachers = users.filter(u => u.type === 'teacher');
    
    const content = `
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value">${students.length}</div>
                <div class="stat-label">Students</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${teachers.length}</div>
                <div class="stat-label">Teachers</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${users.length}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">0</div>
                <div class="stat-label">Subjects</div>
            </div>
        </div>
        <h3>Recent Activity</h3>
        <div class="no-subjects-card">
            <p>No recent activity</p>
        </div>
    `;
    
    document.getElementById('admin-tab-content').innerHTML = content;
}

function loadAdminStudents() {
    const users = Store.getUsers();
    const students = users.filter(u => u.type === 'student');
    
    const content = students.length === 0 
        ? '<div class="no-subjects-card"><p>No students registered</p></div>'
        : students.map(s => `
            <div class="subject-card">
                <div class="subject-header">
                    <div>
                        <div class="subject-name">${s.firstName} ${s.lastName}</div>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">${s.email} • ID: ${s.id}</p>
                    </div>
                </div>
            </div>
        `).join('');
    
    document.getElementById('admin-tab-content').innerHTML = content;
}

function loadAdminTeachers() {
    const users = Store.getUsers();
    const teachers = users.filter(u => u.type === 'teacher');
    
    const content = teachers.length === 0
        ? '<div class="no-subjects-card"><p>No teachers registered</p></div>'
        : teachers.map(t => `
            <div class="subject-card">
                <div class="subject-header">
                    <div>
                        <div class="subject-name">${t.firstName} ${t.lastName}</div>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">${t.email} • ID: ${t.id}</p>
                    </div>
                </div>
            </div>
        `).join('');
    
    document.getElementById('admin-tab-content').innerHTML = content;
}

function loadAdminSubjects() {
    const users = Store.getUsers();
    const teachers = users.filter(u => u.type === 'teacher');
    
    // Collect all subjects from all teachers
    let allSubjects = [];
    teachers.forEach(teacher => {
        if (teacher.subjects && teacher.subjects.length > 0) {
            teacher.subjects.forEach(subject => {
                // Check if subject already exists in allSubjects
                if (!allSubjects.find(s => s.id === subject.id)) {
                    allSubjects.push({
                        ...subject,
                        assignedTeachers: [teacher.firstName + ' ' + teacher.lastName]
                    });
                } else {
                    // Add teacher to existing subject
                    const existingSubject = allSubjects.find(s => s.id === subject.id);
                    existingSubject.assignedTeachers.push(teacher.firstName + ' ' + teacher.lastName);
                }
            });
        }
    });
    
    const subjectsHTML = allSubjects.length === 0 
        ? '<div class="no-subjects-card"><p>No subjects created yet</p></div>'
        : allSubjects.map(s => `
            <div class="subject-card">
                <div class="subject-header">
                    <div>
                        <div class="subject-name">${s.name}</div>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">
                            Code: ${s.edpCode || s.code || 'N/A'}
                        </p>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 2px;">
                            Teachers: ${s.assignedTeachers.join(', ')}
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    
    document.getElementById('admin-tab-content').innerHTML = `
        <button class="btn-add-subject" onclick="openAddSubjectModal()" style="margin-bottom: 16px;">
            + Add Subject
        </button>
        ${subjectsHTML}
    `;
}

window.openAddSubjectModal = function() {
    const users = Store.getUsers();
    const teachers = users.filter(u => u.type === 'teacher');
    
    if (teachers.length === 0) {
        showToast('No teachers registered. Please register teachers first.');
        return;
    }
    
    const teacherOptions = teachers.map(t => 
        `<div class="checkbox-item">
            <label>
                <input type="checkbox" value="${t.id}" class="teacher-checkbox">
                ${t.firstName} ${t.lastName} (ID: ${t.id})
            </label>
        </div>`
    ).join('');
    
    showModal('Add New Subject', `
        <div class="form-field">
            <label class="field-label">Subject Name</label>
            <input type="text" id="subject-name" class="input-field" placeholder="e.g., Mathematics">
        </div>
        <div class="form-field">
            <label class="field-label">Subject Code</label>
            <input type="text" id="subject-code" class="input-field" placeholder="e.g., MATH101">
        </div>
        <div class="form-field">
            <label class="field-label">Assign to Teachers</label>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                ${teacherOptions}
            </div>
        </div>
        <button class="btn-login" onclick="saveNewSubject()">Create Subject</button>
    `);
};

window.saveNewSubject = function() {
    const subjectName = document.getElementById('subject-name').value.trim();
    const subjectCode = document.getElementById('subject-code').value.trim();
    const selectedCheckboxes = document.querySelectorAll('.teacher-checkbox:checked');
    
    if (!subjectName) {
        showToast('Please enter a subject name');
        return;
    }
    
    if (!subjectCode) {
        showToast('Please enter a subject code');
        return;
    }
    
    if (selectedCheckboxes.length === 0) {
        showToast('Please select at least one teacher');
        return;
    }
    
    const selectedTeacherIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    // Create new subject
    const newSubject = {
        id: generateId(),
        name: subjectName,
        code: subjectCode,
        edpCode: subjectCode,
        students: [],
        createdAt: new Date().toISOString()
    };
    
    // Assign subject to selected teachers
    const users = Store.getUsers();
    selectedTeacherIds.forEach(teacherId => {
        const teacher = users.find(u => u.id === teacherId && u.type === 'teacher');
        if (teacher) {
            const updatedSubjects = [...(teacher.subjects || []), { ...newSubject }];
            Store.updateUser(teacher.id, teacher.type, { subjects: updatedSubjects });
        }
    });
    
    showToast(`Subject "${subjectName}" created and assigned successfully!`);
    closeModal();
    loadAdminSubjects();
};

function initAdminTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.dataset.tab;
            switch(tabName) {
                case 'overview':
                    loadAdminOverview();
                    break;
                case 'students':
                    loadAdminStudents();
                    break;
                case 'teachers':
                    loadAdminTeachers();
                    break;
                case 'subjects':
                    loadAdminSubjects();
                    break;
            }
        });
    });
}

window.adminLogout = function() {
    Store.currentUser = null;
    showToast('Logged out successfully');
    showScreen('login-screen');
};

// ==========================================
// STUDENT PROFILE
// ==========================================

function loadStudentProfile() {
    const user = Store.currentUser;
    if (!user) return;
    
    const subjects = user.subjects || [];
    let totalPresent = 0;
    let totalRecords = 0;
    
    subjects.forEach(subject => {
        const records = subject.attendanceRecords || [];
        totalRecords += records.length;
        totalPresent += records.filter(r => r.status === 'present').length;
    });
    
    const overallPercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
    const initials = getInitials(user.firstName, user.lastName);
    
    const content = document.getElementById('student-profile-content');
    content.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">${initials}</div>
            <h2 class="profile-name">${user.firstName} ${user.lastName}</h2>
            <p class="profile-id">ID: ${user.id}</p>
        </div>
        
        <div class="profile-stats-grid">
            <div class="profile-stat-card">
                <div class="stat-icon">📚</div>
                <div class="stat-number">${subjects.length}</div>
                <div class="stat-text">Subjects</div>
            </div>
            <div class="profile-stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-number">${overallPercentage}%</div>
                <div class="stat-text">Attendance</div>
            </div>
            <div class="profile-stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-number">${totalPresent}</div>
                <div class="stat-text">Present</div>
            </div>
        </div>
        
        <div class="profile-section">
            <h3 class="section-title">Personal Information</h3>
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">First Name</span>
                    <span class="info-value">${user.firstName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Last Name</span>
                    <span class="info-value">${user.lastName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email</span>
                    <span class="info-value">${user.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ID Number</span>
                    <span class="info-value">${user.id}</span>
                </div>
            </div>
        </div>
        
        <div class="profile-section">
            <h3 class="section-title">Account Actions</h3>
            <button class="profile-btn" onclick="openEditProfile()">
                <span>✏️</span>
                <span>Edit Profile</span>
            </button>
            <button class="profile-btn" onclick="openChangePassword()">
                <span>🔒</span>
                <span>Change Password</span>
            </button>
            <button class="profile-btn" onclick="openSettings()">
                <span>⚙️</span>
                <span>Settings</span>
            </button>
            <button class="profile-btn logout-btn" onclick="userLogout()">
                <span>🚪</span>
                <span>Logout</span>
            </button>
        </div>
    `;
}

// ==========================================
// TEACHER PROFILE
// ==========================================

function loadTeacherProfile() {
    const user = Store.currentUser;
    if (!user) return;
    
    const subjects = user.subjects || [];
    let totalStudents = 0;
    
    subjects.forEach(subject => {
        totalStudents += (subject.students || []).length;
    });
    
    const initials = getInitials(user.firstName, user.lastName);
    
    const content = document.getElementById('teacher-profile-content');
    content.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">${initials}</div>
            <h2 class="profile-name">${user.firstName} ${user.lastName}</h2>
            <p class="profile-id">ID: ${user.id}</p>
        </div>
        
        <div class="profile-stats-grid">
            <div class="profile-stat-card">
                <div class="stat-icon">📚</div>
                <div class="stat-number">${subjects.length}</div>
                <div class="stat-text">Subjects</div>
            </div>
            <div class="profile-stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-number">${totalStudents}</div>
                <div class="stat-text">Students</div>
            </div>
            <div class="profile-stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-number">0</div>
                <div class="stat-text">Classes</div>
            </div>
        </div>
        
        <div class="profile-section">
            <h3 class="section-title">Personal Information</h3>
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">First Name</span>
                    <span class="info-value">${user.firstName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Last Name</span>
                    <span class="info-value">${user.lastName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email</span>
                    <span class="info-value">${user.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ID Number</span>
                    <span class="info-value">${user.id}</span>
                </div>
            </div>
        </div>
        
        <div class="profile-section">
            <h3 class="section-title">Account Actions</h3>
            <button class="profile-btn" onclick="openEditProfile()">
                <span>✏️</span>
                <span>Edit Profile</span>
            </button>
            <button class="profile-btn" onclick="openChangePassword()">
                <span>🔒</span>
                <span>Change Password</span>
            </button>
            <button class="profile-btn" onclick="openSettings()">
                <span>⚙️</span>
                <span>Settings</span>
            </button>
            <button class="profile-btn logout-btn" onclick="userLogout()">
                <span>🚪</span>
                <span>Logout</span>
            </button>
        </div>
    `;
}

// ==========================================
// PROFILE ACTIONS
// ==========================================

window.openEditProfile = function() {
    const user = Store.currentUser;
    
    showModal('Edit Profile', `
        <div class="form-field">
            <label class="field-label">First Name</label>
            <input type="text" id="edit-firstname" class="input-field" value="${user.firstName}">
        </div>
        <div class="form-field">
            <label class="field-label">Last Name</label>
            <input type="text" id="edit-lastname" class="input-field" value="${user.lastName}">
        </div>
        <div class="form-field">
            <label class="field-label">Email</label>
            <input type="email" id="edit-email" class="input-field" value="${user.email}">
        </div>
        <button class="btn-login" onclick="saveProfileChanges()">Save Changes</button>
    `);
};

window.saveProfileChanges = function() {
    const user = Store.currentUser;
    const firstName = document.getElementById('edit-firstname').value.trim();
    const lastName = document.getElementById('edit-lastname').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    
    if (!firstName || !lastName || !email) {
        showToast('Please fill all fields');
        return;
    }
    
    Store.updateUser(user.id, user.type, { firstName, lastName, email });
    showToast('Profile updated successfully!');
    closeModal();
    
    // Reload profile
    if (user.type === 'student') {
        loadStudentProfile();
    } else {
        loadTeacherProfile();
    }
};

window.openChangePassword = function() {
    showModal('Change Password', `
        <div class="form-field">
            <label class="field-label">Current Password</label>
            <input type="password" id="current-password" class="input-field">
        </div>
        <div class="form-field">
            <label class="field-label">New Password</label>
            <input type="password" id="new-password" class="input-field">
        </div>
        <div class="form-field">
            <label class="field-label">Confirm New Password</label>
            <input type="password" id="confirm-password" class="input-field">
        </div>
        <button class="btn-login" onclick="savePasswordChange()">Change Password</button>
    `);
};

window.savePasswordChange = function() {
    const user = Store.currentUser;
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill all fields');
        return;
    }
    
    if (currentPassword !== user.password) {
        showToast('Current password is incorrect');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters');
        return;
    }
    
    Store.updateUser(user.id, user.type, { password: newPassword });
    showToast('Password changed successfully!');
    closeModal();
};

window.openSettings = function() {
    showScreen('settings-screen');
    loadSettings();
};

window.userLogout = function() {
    Store.currentUser = null;
    showToast('Logged out successfully');
    showScreen('login-screen');
};

// ==========================================
// SETTINGS
// ==========================================

function loadSettings() {
    const user = Store.currentUser;
    const content = document.getElementById('settings-content');
    
    content.innerHTML = `
        <div class="settings-section">
            <h3 class="section-title">Account Settings</h3>
            <div class="settings-card">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-title">Email Notifications</div>
                        <div class="setting-description">Receive updates via email</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-title">Push Notifications</div>
                        <div class="setting-description">Get push notifications</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <h3 class="section-title">Privacy</h3>
            <div class="settings-card">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-title">Profile Visibility</div>
                        <div class="setting-description">Who can see your profile</div>
                    </div>
                    <select class="select-field">
                        <option>Everyone</option>
                        <option>Contacts Only</option>
                        <option>Private</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <h3 class="section-title">About</h3>
            <div class="settings-card">
                <div class="info-row">
                    <span class="info-label">Version</span>
                    <span class="info-value">1.0.0</span>
                </div>
                <div class="info-row">
                    <span class="info-label">User Type</span>
                    <span class="info-value">${user.type.charAt(0).toUpperCase() + user.type.slice(1)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Created</span>
                    <span class="info-value">${new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initRegister();
    initScanner();
    initAdminTabs();
    
    // Create sample data if none exists
    if (Store.getUsers().length === 0) {
        Store.addUser({
            id: 'T001',
            type: 'teacher',
            firstName: 'John',
            lastName: 'Teacher',
            middleInitial: 'M',
            email: 'teacher@school.com',
            password: 'teacher123',
            subjects: [
                {
                    id: 'SUBJ001',
                    name: 'Mathematics',
                    code: 'MATH101',
                    edpCode: 'MATH101',
                    students: []
                },
                {
                    id: 'SUBJ002',
                    name: 'Physics',
                    code: 'PHY101',
                    edpCode: 'PHY101',
                    students: []
                }
            ],
            createdAt: new Date().toISOString()
        });
        
        Store.addUser({
            id: 'S001',
            type: 'student',
            firstName: 'Jane',
            lastName: 'Student',
            middleInitial: 'A',
            email: 'student@school.com',
            password: 'student123',
            subjects: [],
            createdAt: new Date().toISOString()
        });
        
        console.log('Sample accounts created:');
        console.log('Admin: admin / admin123');
        console.log('Teacher: T001 / teacher123');
        console.log('Student: S001 / student123');
    }
    
    showScreen('login-screen');
    console.log('AttendApp loaded successfully!');
});
