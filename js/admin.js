/* TNH Scheduling - Admin View */

function initAdminView() {
    renderAdminViewHTML();
    loadAdminData();
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
        };
    });
    
    // Month navigation
    document.getElementById('admin-prev-month').onclick = () => {
        state.currentMonth--;
        if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
        renderOverviewGrid();
    };
    document.getElementById('admin-next-month').onclick = () => {
        state.currentMonth++;
        if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
        renderOverviewGrid();
    };
    
    // Check availability button
    document.getElementById('check-avail-btn').onclick = checkAvailableTrainers;
}

function renderAdminViewHTML() {
    document.getElementById('admin-view').innerHTML = `
        <div class="admin-tabs">
            <button class="tab-btn active" data-tab="overview">Availability Overview</button>
            <button class="tab-btn" data-tab="allocate">Allocate Training</button>
            <button class="tab-btn" data-tab="trainers">Manage Trainers</button>
        </div>
        
        <div id="tab-overview" class="tab-content">
            <div class="content-header">
                <h2>Trainer Availability</h2>
                <p>Green = available. Blue = allocated.</p>
            </div>
            <div class="calendar-controls">
                <button class="btn btn-icon" id="admin-prev-month">←</button>
                <h3 id="admin-month-year"></h3>
                <button class="btn btn-icon" id="admin-next-month">→</button>
            </div>
            <div class="availability-grid-container">
                <div class="availability-grid" id="availability-grid"></div>
            </div>
        </div>
        
        <div id="tab-allocate" class="tab-content hidden">
            <div class="content-header">
                <h2>Allocate Training</h2>
                <p>Select a date and assign a trainer.</p>
            </div>
            <div class="allocate-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Training Date</label>
                        <input type="date" id="alloc-date">
                    </div>
                    <div class="form-group">
                        <label>Training Title</label>
                        <input type="text" id="alloc-title" placeholder="e.g., IOSH Managing Safely">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" id="alloc-location" placeholder="e.g., Manchester">
                    </div>
                    <div class="form-group">
                        <label>Client</label>
                        <input type="text" id="alloc-client" placeholder="e.g., ABC Ltd">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="alloc-notes" rows="2" placeholder="Any additional info..."></textarea>
                </div>
                <button class="btn btn-primary" id="check-avail-btn">Check Available Trainers</button>
            </div>
            <div id="available-trainers" class="hidden" style="margin-bottom:2rem;">
                <h3 style="margin-bottom:1rem;">Available on <span id="selected-date"></span></h3>
                <div id="trainers-for-date" class="trainers-list"></div>
            </div>
            <h3 style="margin-bottom:1rem;">All Allocations</h3>
            <div id="all-allocations" class="allocations-list"></div>
        </div>
        
        <div id="tab-trainers" class="tab-content hidden">
            <div class="content-header">
                <h2>Manage Trainers</h2>
                <p>View registered trainers and manage admin access.</p>
            </div>
            <div id="trainers-management" class="trainers-list"></div>
        </div>
    `;
}

async function loadAdminData() {
    // Load all users and their availability
    const usersSnap = await db.collection('users').get();
    state.trainers = [];
    
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        const availDoc = await db.collection('availability').doc(doc.id).get();
        state.trainers.push({
            id: doc.id,
            ...user,
            availability: availDoc.exists ? (availDoc.data().dates || {}) : {}
        });
    }
    
    // Load all allocations
    const allocSnap = await db.collection('allocations').orderBy('date', 'desc').get();
    state.allocations = [];
    allocSnap.forEach(doc => state.allocations.push({ id: doc.id, ...doc.data() }));
    
    renderOverviewGrid();
    renderAllAllocations();
    renderTrainersManagement();
}

function renderOverviewGrid() {
    document.getElementById('admin-month-year').textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
    
    const trainers = state.trainers.filter(t => !t.isAdmin);
    const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    if (!trainers.length) {
        document.getElementById('availability-grid').innerHTML = '<p class="no-data">No trainers registered.</p>';
        return;
    }
    
    const grid = document.getElementById('availability-grid');
    grid.style.gridTemplateColumns = `150px repeat(${daysInMonth}, minmax(32px, 1fr))`;
    
    let html = '<div class="grid-header trainer-name">Trainer</div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(state.currentYear, state.currentMonth, d);
        const dayLetter = ['S','M','T','W','T','F','S'][date.getDay()];
        html += `<div class="grid-header">${d}<br><small>${dayLetter}</small></div>`;
    }
    
    trainers.forEach(trainer => {
        html += `<div class="grid-cell trainer-row-name">${trainer.name}</div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = getDateKey(new Date(state.currentYear, state.currentMonth, d));
            const isAvail = trainer.availability[dateKey] === true;
            const alloc = state.allocations.find(a => a.date === dateKey && a.trainerId === trainer.id);
            
            let cls = 'grid-cell';
            let content = '';
            if (alloc) { cls += ' allocated'; content = '📋'; }
            else if (isAvail) { cls += ' available'; content = '✓'; }
            else { cls += ' unavailable'; }
            
            html += `<div class="${cls}">${content}</div>`;
        }
    });
    
    grid.innerHTML = html;
}

function checkAvailableTrainers() {
    const dateVal = document.getElementById('alloc-date').value;
    if (!dateVal) { showToast('Select a date', 'error'); return; }
    
    const trainers = state.trainers.filter(t => !t.isAdmin && t.availability[dateVal] === true);
    const allocatedIds = state.allocations.filter(a => a.date === dateVal).map(a => a.trainerId);
    const available = trainers.filter(t => !allocatedIds.includes(t.id));
    
    document.getElementById('selected-date').textContent = formatDate(new Date(dateVal));
    document.getElementById('available-trainers').classList.remove('hidden');
    
    if (!available.length) {
        document.getElementById('trainers-for-date').innerHTML = '<p class="no-data">No trainers available.</p>';
        return;
    }
    
    document.getElementById('trainers-for-date').innerHTML = available.map(t => `
        <div class="trainer-card">
            <div class="trainer-info">
                <span class="name">${t.name}</span>
                <span class="email">${t.email}</span>
                ${t.phone ? `<span class="phone">${t.phone}</span>` : ''}
            </div>
            <button class="btn btn-success" onclick="allocateTrainer('${t.id}','${t.name}','${t.email}')">Allocate</button>
        </div>
    `).join('');
}

async function allocateTrainer(trainerId, trainerName, trainerEmail) {
    const title = document.getElementById('alloc-title').value;
    const date = document.getElementById('alloc-date').value;
    const location = document.getElementById('alloc-location').value;
    const client = document.getElementById('alloc-client').value;
    const notes = document.getElementById('alloc-notes').value;
    
    if (!title || !date) { showToast('Fill in title and date', 'error'); return; }
    
    const confirmed = await showModal('Confirm', `Allocate "${title}" to ${trainerName}?`);
    if (!confirmed) return;
    
    try {
        await db.collection('allocations').add({
            trainerId, trainerName, trainerEmail,
            title, date, location, client, notes,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: state.currentUser.uid
        });
        
        // Try to send email (will fail silently if not configured)
        try {
            await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
                to_email: trainerEmail,
                trainer_name: trainerName,
                training_title: title,
                training_date: formatDate(new Date(date)),
                message: 'You have been allocated a training. Please log in to confirm.'
            });
        } catch (e) { console.log('Email skipped'); }
        
        showToast('Trainer allocated', 'success');
        
        // Reset form
        document.getElementById('alloc-title').value = '';
        document.getElementById('alloc-date').value = '';
        document.getElementById('alloc-location').value = '';
        document.getElementById('alloc-client').value = '';
        document.getElementById('alloc-notes').value = '';
        document.getElementById('available-trainers').classList.add('hidden');
        
        loadAdminData();
    } catch (e) {
        showToast('Error allocating', 'error');
    }
}

function renderAllAllocations() {
    if (!state.allocations.length) {
        document.getElementById('all-allocations').innerHTML = '<p class="no-data">No allocations yet.</p>';
        return;
    }
    
    document.getElementById('all-allocations').innerHTML = state.allocations.map(a => `
        <div class="allocation-card ${a.status}">
            <div class="allocation-details">
                <div class="title">${a.title}</div>
                <div class="meta">
                    <span>📅 ${formatDate(new Date(a.date))}</span>
                    <span>👤 ${a.trainerName}</span>
                    ${a.location ? `<span>📍 ${a.location}</span>` : ''}
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">
                <span class="status-badge ${a.status}">${a.status}</span>
                <button class="btn btn-secondary btn-sm" onclick="cancelAllocation('${a.id}')">Cancel</button>
            </div>
        </div>
    `).join('');
}

async function cancelAllocation(id) {
    const confirmed = await showModal('Cancel Allocation', 'Are you sure?');
    if (!confirmed) return;
    
    try {
        await db.collection('allocations').doc(id).delete();
        showToast('Cancelled', 'success');
        loadAdminData();
    } catch (e) {
        showToast('Error', 'error');
    }
}

function renderTrainersManagement() {
    if (!state.trainers.length) {
        document.getElementById('trainers-management').innerHTML = '<p class="no-data">No trainers.</p>';
        return;
    }
    
    document.getElementById('trainers-management').innerHTML = state.trainers.map(t => `
        <div class="trainer-card">
            <div class="trainer-info">
                <span class="name">${t.name}${t.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</span>
                <span class="email">${t.email}</span>
                ${t.phone ? `<span class="phone">${t.phone}</span>` : ''}
            </div>
            ${t.id !== state.currentUser.uid ? `
                <button class="btn btn-secondary btn-sm" onclick="toggleAdmin('${t.id}', ${!t.isAdmin})">
                    ${t.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </button>
            ` : ''}
        </div>
    `).join('');
}

async function toggleAdmin(userId, makeAdmin) {
    const confirmed = await showModal('Confirm', makeAdmin ? 'Make this user an admin?' : 'Remove admin access?');
    if (!confirmed) return;
    
    try {
        await db.collection('users').doc(userId).update({ isAdmin: makeAdmin });
        showToast(makeAdmin ? 'Admin granted' : 'Admin removed', 'success');
        loadAdminData();
    } catch (e) {
        showToast('Error', 'error');
    }
}

// Make functions global
window.allocateTrainer = allocateTrainer;
window.cancelAllocation = cancelAllocation;
window.toggleAdmin = toggleAdmin;
