/* TNH Scheduling - Admin View */

// Track selected dates for allocation
let selectedTrainerId = null;
let selectedTrainerName = null;
let selectedTrainerEmail = null;
let selectedDates = [];

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
        clearSelection();
        renderOverviewGrid();
    };
    document.getElementById('admin-next-month').onclick = () => {
        state.currentMonth++;
        if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
        clearSelection();
        renderOverviewGrid();
    };
    
    // Allocate button
    document.getElementById('allocate-selected-btn').onclick = openAllocationModal;
    
    // Clear selection button
    document.getElementById('clear-selection-btn').onclick = clearSelection;
}

function clearSelection() {
    selectedTrainerId = null;
    selectedTrainerName = null;
    selectedTrainerEmail = null;
    selectedDates = [];
    updateAllocationButton();
    renderOverviewGrid();
}

function updateAllocationButton() {
    const btn = document.getElementById('allocate-selected-btn');
    const clearBtn = document.getElementById('clear-selection-btn');
    const info = document.getElementById('selection-info');
    
    if (selectedDates.length > 0) {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
        clearBtn.classList.remove('hidden');
        info.textContent = `${selectedTrainerName}: ${selectedDates.length} date(s) selected`;
        info.classList.remove('hidden');
    } else {
        btn.disabled = true;
        btn.classList.add('btn-disabled');
        clearBtn.classList.add('hidden');
        info.classList.add('hidden');
    }
}

function toggleDateSelection(trainerId, trainerName, trainerEmail, dateKey) {
    // If clicking a different trainer, ignore (unless no selection yet)
    if (selectedTrainerId && selectedTrainerId !== trainerId) {
        showToast('Clear selection first to choose a different trainer', 'error');
        return;
    }
    
    // Set trainer if not set
    if (!selectedTrainerId) {
        selectedTrainerId = trainerId;
        selectedTrainerName = trainerName;
        selectedTrainerEmail = trainerEmail;
    }
    
    // Toggle date
    const idx = selectedDates.indexOf(dateKey);
    if (idx > -1) {
        selectedDates.splice(idx, 1);
        // If no dates left, clear trainer too
        if (selectedDates.length === 0) {
            selectedTrainerId = null;
            selectedTrainerName = null;
            selectedTrainerEmail = null;
        }
    } else {
        selectedDates.push(dateKey);
    }
    
    updateAllocationButton();
    renderOverviewGrid();
}

function openAllocationModal() {
    if (selectedDates.length === 0) return;
    
    const datesDisplay = selectedDates
        .sort()
        .map(d => formatDateShort(new Date(d)))
        .join(', ');
    
    document.getElementById('modal-alloc-trainer').textContent = selectedTrainerName;
    document.getElementById('modal-alloc-dates').textContent = datesDisplay;
    document.getElementById('modal-alloc-title').value = '';
    document.getElementById('modal-alloc-location').value = '';
    document.getElementById('modal-alloc-client').value = '';
    document.getElementById('modal-alloc-notes').value = '';
    document.getElementById('allocation-modal').classList.remove('hidden');
}

function closeAllocationModal() {
    document.getElementById('allocation-modal').classList.add('hidden');
}

async function confirmAllocation() {
    const title = document.getElementById('modal-alloc-title').value;
    const location = document.getElementById('modal-alloc-location').value;
    const client = document.getElementById('modal-alloc-client').value;
    const notes = document.getElementById('modal-alloc-notes').value;
    
    if (!title) {
        showToast('Please enter a training title', 'error');
        return;
    }
    
    try {
        // Create allocation for each selected date
        for (const dateKey of selectedDates) {
            await db.collection('allocations').add({
                trainerId: selectedTrainerId,
                trainerName: selectedTrainerName,
                trainerEmail: selectedTrainerEmail,
                title, date: dateKey, location, client, notes,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: state.currentUser.uid
            });
        }
        
        showToast(`Training allocated for ${selectedDates.length} date(s)`, 'success');
        closeAllocationModal();
        clearSelection();
        loadAdminData();
    } catch (e) {
        console.error(e);
        showToast('Error allocating training', 'error');
    }
}

window.toggleDateSelection = toggleDateSelection;
window.closeAllocationModal = closeAllocationModal;
window.confirmAllocation = confirmAllocation;

function renderAdminViewHTML() {
    document.getElementById('admin-view').innerHTML = `
        <div class="admin-tabs">
            <button class="tab-btn active" data-tab="overview">Availability Overview</button>
            <button class="tab-btn" data-tab="trainers">Manage Trainers</button>
            <button class="tab-btn" data-tab="allocations">All Allocations</button>
        </div>
        
        <div id="tab-overview" class="tab-content">
            <div class="content-header">
                <h2>Trainer Availability</h2>
                <p>Click on green cells to select dates, then allocate training.</p>
            </div>
            
            <div class="allocation-toolbar">
                <div class="toolbar-left">
                    <span id="selection-info" class="selection-info hidden"></span>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-secondary btn-sm hidden" id="clear-selection-btn">Clear Selection</button>
                    <button class="btn btn-primary btn-disabled" id="allocate-selected-btn" disabled>Allocate Training</button>
                </div>
            </div>
            
            <div class="calendar-controls">
                <button class="btn btn-icon" id="admin-prev-month">←</button>
                <h3 id="admin-month-year"></h3>
                <button class="btn btn-icon" id="admin-next-month">→</button>
            </div>
            
            <div class="availability-grid-container">
                <div class="availability-grid" id="availability-grid"></div>
            </div>
            
            <div class="legend-bar">
                <div class="legend-item"><span class="legend-dot available"></span> Available</div>
                <div class="legend-item"><span class="legend-dot selected"></span> Selected</div>
                <div class="legend-item"><span class="legend-dot allocated"></span> Allocated</div>
                <div class="legend-item"><span class="legend-dot unavailable"></span> Unavailable</div>
            </div>
        </div>
        
        <div id="tab-trainers" class="tab-content hidden">
            <div class="content-header">
                <h2>Manage Trainers</h2>
                <p>View registered trainers and manage admin access.</p>
            </div>
            <div id="trainers-management" class="trainers-list"></div>
        </div>
        
        <div id="tab-allocations" class="tab-content hidden">
            <div class="content-header">
                <h2>All Allocations</h2>
                <p>View and manage all training allocations.</p>
            </div>
            <div id="all-allocations" class="allocations-list"></div>
        </div>
        
        <!-- Allocation Modal -->
        <div id="allocation-modal" class="modal hidden">
            <div class="modal-content modal-large">
                <h3>Allocate Training</h3>
                <div class="modal-info">
                    <p><strong>Trainer:</strong> <span id="modal-alloc-trainer"></span></p>
                    <p><strong>Dates:</strong> <span id="modal-alloc-dates"></span></p>
                </div>
                <div class="form-group">
                    <label>Training Title *</label>
                    <input type="text" id="modal-alloc-title" placeholder="e.g., IOSH Managing Safely">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" id="modal-alloc-location" placeholder="e.g., Manchester">
                    </div>
                    <div class="form-group">
                        <label>Client</label>
                        <input type="text" id="modal-alloc-client" placeholder="e.g., ABC Ltd">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="modal-alloc-notes" rows="2" placeholder="Any additional info..."></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeAllocationModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="confirmAllocation()">Confirm Allocation</button>
                </div>
            </div>
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
            const isSelected = selectedTrainerId === trainer.id && selectedDates.includes(dateKey);
            const isOtherTrainerSelected = selectedTrainerId && selectedTrainerId !== trainer.id;
            
            let cls = 'grid-cell';
            let content = '';
            let clickable = false;
            
            if (alloc) {
                cls += ' allocated';
                content = '📋';
            } else if (isSelected) {
                cls += ' selected';
                content = '✓';
                clickable = true;
            } else if (isAvail) {
                cls += ' available';
                content = '✓';
                if (!isOtherTrainerSelected) clickable = true;
            } else {
                cls += ' unavailable';
            }
            
            if (clickable) {
                cls += ' clickable';
                html += `<div class="${cls}" onclick="toggleDateSelection('${trainer.id}','${trainer.name.replace(/'/g, "\\'")}','${trainer.email}','${dateKey}')">${content}</div>`;
            } else {
                html += `<div class="${cls}">${content}</div>`;
            }
        }
    });
    
    grid.innerHTML = html;
}

function renderAllAllocations() {
    const container = document.getElementById('all-allocations');
    if (!container) return;
    
    if (!state.allocations.length) {
        container.innerHTML = '<p class="no-data">No allocations yet.</p>';
        return;
    }
    
    container.innerHTML = state.allocations.map(a => `
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
window.cancelAllocation = cancelAllocation;
window.toggleAdmin = toggleAdmin;
window.toggleDateSelection = toggleDateSelection;
window.closeAllocationModal = closeAllocationModal;
window.confirmAllocation = confirmAllocation;
