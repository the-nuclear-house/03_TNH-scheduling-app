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
    document.getElementById('modal-alloc-rate').value = '';
    document.getElementById('modal-alloc-po').value = '';
    document.getElementById('modal-alloc-type').value = 'in-person';
    
    // Reset type buttons
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.type-btn.in-person').classList.add('active');
    
    // Show rate and PO fields only for freelancers
    const trainer = state.trainers.find(t => t.id === selectedTrainerId);
    const rateField = document.getElementById('rate-field-group');
    const poField = document.getElementById('po-field-group');
    
    if (trainer?.employmentType === 'freelancer') {
        rateField.style.display = 'block';
        poField.style.display = 'block';
        // Pre-fill with trainer's default rate if set
        if (trainer.dayRate) {
            document.getElementById('modal-alloc-rate').value = trainer.dayRate;
        }
    } else {
        rateField.style.display = 'none';
        poField.style.display = 'none';
    }
    
    document.getElementById('allocation-modal').classList.remove('hidden');
}

function setTrainingType(type) {
    document.getElementById('modal-alloc-type').value = type;
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.type-btn.${type}`).classList.add('active');
}

function closeAllocationModal() {
    document.getElementById('allocation-modal').classList.add('hidden');
}

async function confirmAllocation() {
    const title = document.getElementById('modal-alloc-title').value;
    const location = document.getElementById('modal-alloc-location').value;
    const client = document.getElementById('modal-alloc-client').value;
    const notes = document.getElementById('modal-alloc-notes').value;
    const trainingType = document.getElementById('modal-alloc-type').value;
    const rate = document.getElementById('modal-alloc-rate').value;
    const poNumber = document.getElementById('modal-alloc-po').value;
    
    if (!title) {
        showToast('Please enter a training title', 'error');
        return;
    }
    
    // Generate a unique group ID for this multi-day training
    const groupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Check if trainer is freelancer
    const trainer = state.trainers.find(t => t.id === selectedTrainerId);
    const isFreelancer = trainer?.employmentType === 'freelancer';
    
    try {
        // Create allocation for each selected date
        for (const dateKey of selectedDates) {
            const allocData = {
                trainerId: selectedTrainerId,
                trainerName: selectedTrainerName,
                trainerEmail: selectedTrainerEmail,
                title, date: dateKey, location, client, notes,
                trainingType,
                groupId,
                status: 'pending',
                delivered: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: state.currentUser.uid
            };
            
            // Only add rate and PO for freelancers
            if (isFreelancer) {
                if (rate) allocData.trainerRate = parseFloat(rate);
                if (poNumber) allocData.poNumber = poNumber;
            }
            
            await db.collection('allocations').add(allocData);
        }
        
        // Send email notification to trainer
        sendTrainingAssignmentEmail({
            trainerName: selectedTrainerName,
            trainerEmail: selectedTrainerEmail,
            title,
            dates: formatDateRange(selectedDates),
            type: trainingType === 'remote' ? 'Remote' : 'In Person',
            location: location || 'N/A',
            client: client || 'N/A',
            notes: notes || 'None'
        });
        
        showToast(`Training allocated for ${selectedDates.length} date(s)`, 'success');
        closeAllocationModal();
        clearSelection();
        loadAdminData();
    } catch (e) {
        console.error(e);
        showToast('Error allocating training', 'error');
    }
}

// Format date range for email
function formatDateRange(dates) {
    if (dates.length === 1) {
        return formatDate(new Date(dates[0]));
    }
    const sorted = dates.sort();
    const start = formatDateShort(new Date(sorted[0]));
    const end = formatDateShort(new Date(sorted[sorted.length - 1]));
    return `${start} - ${end} (${dates.length} days)`;
}

// Send training assignment email
function sendTrainingAssignmentEmail(params) {
    try {
        emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
            trainer_name: params.trainerName,
            trainer_email: params.trainerEmail,
            training_title: params.title,
            training_dates: params.dates,
            training_type: params.type,
            training_location: params.location,
            training_client: params.client,
            training_notes: params.notes
        });
        console.log('Assignment email sent to', params.trainerEmail);
    } catch (error) {
        console.error('Email send error:', error);
        // Don't show error to user - email is nice-to-have, not critical
    }
}

// Send reminder email
function sendReminderEmail(alloc) {
    try {
        const dates = state.allocations
            .filter(a => a.groupId === alloc.groupId)
            .map(a => a.date)
            .sort();
        
        emailjs.send(emailjsConfig.serviceId, emailjsConfig.reminderTemplateId, {
            trainer_name: alloc.trainerName,
            trainer_email: alloc.trainerEmail,
            training_title: alloc.title,
            training_dates: formatDateRange(dates),
            training_location: alloc.location || 'N/A',
            training_client: alloc.client || 'N/A'
        });
        
        showToast('Reminder sent to ' + alloc.trainerName, 'success');
    } catch (error) {
        console.error('Email send error:', error);
        showToast('Error sending reminder', 'error');
    }
}

window.setTrainingType = setTrainingType;

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
                <div class="legend-item"><span class="legend-dot not-set"></span> Not Set</div>
                <div class="legend-item"><span class="legend-dot available"></span> Available</div>
                <div class="legend-item"><span class="legend-dot unavailable-confirmed"></span> Unavailable</div>
                <div class="legend-item"><span class="legend-dot selected"></span> Selected</div>
                <div class="legend-item"><span class="legend-dot allocated-pending"></span> ⏳ Pending</div>
                <div class="legend-item"><span class="legend-dot allocated-confirmed"></span> 📍💻 Confirmed</div>
                <div class="legend-item"><span class="legend-dot allocated-declined"></span> ✗ Declined</div>
                <div class="legend-item"><span class="legend-dot delivered"></span> ✅ Delivered</div>
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
                    <label>Training Type</label>
                    <div class="training-type-toggle">
                        <button type="button" class="type-btn in-person active" onclick="setTrainingType('in-person')">📍 In Person</button>
                        <button type="button" class="type-btn remote" onclick="setTrainingType('remote')">💻 Remote</button>
                    </div>
                    <input type="hidden" id="modal-alloc-type" value="in-person">
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
                <div class="form-group" id="rate-field-group" style="display:none;">
                    <label>Trainer Rate (£) <span class="hint">- Freelancer only, not visible to trainer</span></label>
                    <input type="number" id="modal-alloc-rate" placeholder="e.g., 350">
                </div>
                <div class="form-group" id="po-field-group" style="display:none;">
                    <label>PO Number <span class="hint">- Purchase Order reference</span></label>
                    <input type="text" id="modal-alloc-po" placeholder="e.g., PO-2026-001">
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
        
        <!-- Allocation Details Modal (for clicking on allocated cells) -->
        <div id="allocation-details-modal" class="modal hidden">
            <div class="modal-content">
                <h3>Training Details</h3>
                <div id="allocation-details-content"></div>
                <div class="modal-actions" id="allocation-details-actions"></div>
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
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        html += `<div class="grid-header ${isWeekend ? 'weekend' : ''}">${d}<br><small>${dayLetter}</small></div>`;
    }
    
    trainers.forEach(trainer => {
        html += `<div class="grid-cell trainer-row-name">${trainer.name}</div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(state.currentYear, state.currentMonth, d);
            const dateKey = getDateKey(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const availStatus = trainer.availability[dateKey];
            const isAvail = availStatus === 'available' || availStatus === true;
            const isUnavail = availStatus === 'unavailable';
            const alloc = state.allocations.find(a => a.date === dateKey && a.trainerId === trainer.id);
            const isSelected = selectedTrainerId === trainer.id && selectedDates.includes(dateKey);
            const isOtherTrainerSelected = selectedTrainerId && selectedTrainerId !== trainer.id;
            
            let cls = 'grid-cell';
            if (isWeekend) cls += ' weekend';
            let content = '';
            let clickHandler = '';
            
            if (alloc) {
                // Allocated - clickable to see details
                if (alloc.delivered) {
                    cls += ' delivered';
                    content = '✅';
                } else if (alloc.status === 'confirmed') {
                    cls += ' allocated-confirmed';
                    content = alloc.trainingType === 'remote' ? '💻' : '📍';
                } else if (alloc.status === 'declined') {
                    cls += ' allocated-declined';
                    content = '✗';
                } else {
                    // pending
                    cls += ' allocated-pending';
                    content = '⏳';
                }
                cls += ' clickable';
                clickHandler = `onclick="showAllocationDetails('${alloc.id}')"`;
            } else if (isSelected) {
                cls += ' selected';
                content = '✓';
                clickHandler = `onclick="toggleDateSelection('${trainer.id}','${trainer.name.replace(/'/g, "\\'")}','${trainer.email}','${dateKey}')"`;
            } else if (isAvail) {
                cls += ' available';
                content = '';
                if (!isOtherTrainerSelected) {
                    cls += ' clickable';
                    clickHandler = `onclick="toggleDateSelection('${trainer.id}','${trainer.name.replace(/'/g, "\\'")}','${trainer.email}','${dateKey}')"`;
                }
            } else if (isUnavail) {
                cls += ' unavailable-confirmed';
                content = '';
            } else {
                cls += ' not-set';
            }
            
            html += `<div class="${cls}" ${clickHandler}>${content}</div>`;
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
    
    // Group allocations by groupId
    const grouped = {};
    state.allocations.forEach(a => {
        const key = a.groupId || a.id; // fallback to id for old allocations without groupId
        if (!grouped[key]) {
            grouped[key] = {
                ...a,
                dates: [a.date],
                allIds: [a.id]
            };
        } else {
            grouped[key].dates.push(a.date);
            grouped[key].allIds.push(a.id);
        }
    });
    
    // Convert to array and sort by first date
    const trainings = Object.values(grouped).sort((a, b) => {
        const dateA = Math.min(...a.dates.map(d => new Date(d).getTime()));
        const dateB = Math.min(...b.dates.map(d => new Date(d).getTime()));
        return dateB - dateA;
    });
    
    container.innerHTML = trainings.map(t => {
        const sortedDates = t.dates.sort();
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date(sortedDates[sortedDates.length - 1]);
        const dateDisplay = sortedDates.length === 1 
            ? formatDate(startDate)
            : `${formatDateShort(startDate)} - ${formatDateShort(endDate)} (${sortedDates.length} days)`;
        
        const typeIcon = t.trainingType === 'remote' ? '💻' : '📍';
        const typeLabel = t.trainingType === 'remote' ? 'Remote' : 'In Person';
        
        return `
            <div class="allocation-card ${t.status}">
                <div class="allocation-details">
                    <div class="title">${t.title}</div>
                    <div class="meta">
                        <span>📅 ${dateDisplay}</span>
                        <span>👤 ${t.trainerName}</span>
                        <span>${typeIcon} ${typeLabel}</span>
                        ${t.location ? `<span>📍 ${t.location}</span>` : ''}
                        ${t.client ? `<span>🏢 ${t.client}</span>` : ''}
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">
                    <span class="status-badge ${t.status}">${t.status}</span>
                    <button class="btn btn-secondary btn-sm" onclick="cancelTraining('${t.allIds.join(',')}')">Cancel</button>
                </div>
            </div>
        `;
    }).join('');
}

async function cancelTraining(idsString) {
    const ids = idsString.split(',');
    const confirmed = await showModal('Cancel Training', `This will cancel ${ids.length} day(s). Are you sure?`);
    if (!confirmed) return;
    
    try {
        for (const id of ids) {
            await db.collection('allocations').doc(id).delete();
        }
        showToast('Training cancelled', 'success');
        loadAdminData();
    } catch (e) {
        showToast('Error cancelling', 'error');
    }
}

window.cancelTraining = cancelTraining;

function renderTrainersManagement() {
    const container = document.getElementById('trainers-management');
    if (!container) return;
    
    if (!state.trainers.length) {
        container.innerHTML = '<p class="no-data">No trainers registered.</p>';
        return;
    }
    
    const membershipLabels = {
        'none': 'No Membership',
        'affiliate': 'Affiliate',
        'tech': 'Tech IOSH',
        'grad': 'Grad IOSH',
        'cert': 'Cert IOSH',
        'cmiosh': 'CMIOSH',
        'cfiosh': 'CFIOSH'
    };
    
    const qualLabels = {
        'iosh-train-trainer': 'Train the Trainer',
        'aet-ptlls': 'AET/PTLLS',
        'nebosh-gc': 'NEBOSH GC',
        'nebosh-diploma': 'NEBOSH Diploma',
        'iosh-level3': 'IOSH L3',
        'iosh-level6': 'IOSH L6'
    };
    
    container.innerHTML = state.trainers.map(t => {
        // Count allocations for this trainer
        const trainerAllocations = state.allocations.filter(a => a.trainerId === t.id);
        const completedTrainings = trainerAllocations.filter(a => a.status === 'confirmed').length;
        
        const stars = renderStars(t.adminRating || 0);
        
        return `
            <div class="trainer-profile-row">
                <div class="profile-photo">
                    ${t.photoURL ? `<img src="${t.photoURL}" alt="${t.name}">` : `<div class="photo-placeholder-large">${t.name?.charAt(0) || '?'}</div>`}
                </div>
                <div class="trainer-details">
                    <h4>
                        ${t.name}
                        ${t.isAdmin ? '<span class="badge badge-warning">Admin</span>' : ''}
                        ${t.ioshApprovedTrainer ? '<span class="badge badge-success">IOSH Approved</span>' : ''}
                    </h4>
                    <div class="trainer-meta">
                        ${t.email} ${t.phone ? '• ' + t.phone : ''}
                    </div>
                    <div class="trainer-meta">
                        ${membershipLabels[t.ioshMembership] || 'Not specified'} 
                        ${t.trainingYearsExperience ? `• ${t.trainingYearsExperience} yrs training exp` : ''}
                        ${t.hsSectorYears ? `• ${t.hsSectorYears} yrs in H&S` : ''}
                    </div>
                    ${t.qualifications?.length ? `
                        <div class="qualifications-tags">
                            ${t.qualifications.map(q => `<span class="qual-tag">${qualLabels[q] || q}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="trainer-stats">
                    <div class="trainer-stat">
                        <div class="stat-value">${completedTrainings}</div>
                        <div class="stat-label">Trainings</div>
                    </div>
                    <div class="trainer-stat">
                        <div class="star-rating">${stars}</div>
                        <div class="stat-label">Rating</div>
                    </div>
                </div>
                <div class="trainer-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewTrainerProfile('${t.id}')">View</button>
                    <button class="btn btn-secondary btn-sm" onclick="editTrainerAdmin('${t.id}')">Edit</button>
                    ${!t.isAdmin && t.id !== state.currentUser.uid ? `
                        <button class="btn btn-secondary btn-sm" onclick="toggleAdmin('${t.id}', true)">Make Admin</button>
                    ` : ''}
                    ${t.isAdmin && t.id !== state.currentUser.uid ? `
                        <button class="btn btn-secondary btn-sm" onclick="toggleAdmin('${t.id}', false)">Remove Admin</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
    }
    return html;
}

function viewTrainerProfile(trainerId) {
    const trainer = state.trainers.find(t => t.id === trainerId);
    if (!trainer) return;
    
    const membershipLabels = {
        'none': 'No IOSH Membership',
        'affiliate': 'Affiliate / Student',
        'tech': 'Tech IOSH (Technical Member)',
        'grad': 'Grad IOSH (Graduate Member)',
        'cert': 'Cert IOSH (Certified Member)',
        'cmiosh': 'CMIOSH (Chartered Member)',
        'cfiosh': 'CFIOSH (Chartered Fellow)'
    };
    
    const courseLabels = {
        'managing-safely': 'IOSH Managing Safely',
        'working-safely': 'IOSH Working Safely',
        'managing-safely-refresher': 'IOSH Managing Safely Refresher',
        'leading-safely': 'IOSH Leading Safely'
    };
    
    const trainerAllocations = state.allocations.filter(a => a.trainerId === trainerId);
    
    const modal = document.createElement('div');
    modal.id = 'view-trainer-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-profile">
            <div class="modal-header-row">
                <h2>Trainer Profile</h2>
                <button class="btn btn-icon" onclick="document.getElementById('view-trainer-modal').remove()">✕</button>
            </div>
            
            <div class="photo-upload-section">
                <div class="photo-preview">
                    ${trainer.photoURL ? `<img src="${trainer.photoURL}" alt="${trainer.name}">` : `<span class="photo-placeholder">${trainer.name?.charAt(0) || '?'}</span>`}
                </div>
                <div>
                    <h3 style="margin:0">${trainer.name}</h3>
                    <p style="margin:0.25rem 0;color:var(--tnh-steel)">${trainer.email}</p>
                    ${trainer.phone ? `<p style="margin:0;color:var(--tnh-steel)">${trainer.phone}</p>` : ''}
                    <span class="badge ${trainer.employmentType === 'freelancer' ? 'badge-warning' : 'badge-info'}">${trainer.employmentType === 'freelancer' ? 'Freelancer' : 'TNH Employee'}</span>
                </div>
            </div>
            
            <div style="display:grid;gap:1rem;">
                <div>
                    <strong>IOSH Membership:</strong> ${membershipLabels[trainer.ioshMembership] || 'Not specified'}
                </div>
                <div>
                    <strong>IOSH Approved Trainer:</strong> ${trainer.ioshApprovedTrainer ? 'Yes ✓' : 'No'}
                </div>
                <div>
                    <strong>Training Experience:</strong> ${trainer.trainingYearsExperience || 0} years
                </div>
                <div>
                    <strong>H&S Sector Experience:</strong> ${trainer.hsSectorYears || 0} years
                </div>
                <div>
                    <strong>Courses Can Deliver:</strong><br>
                    ${trainer.coursesCanDeliver?.map(c => courseLabels[c] || c).join(', ') || 'None specified'}
                    ${trainer.otherCourses?.length ? '<br>' + trainer.otherCourses.join(', ') : ''}
                </div>
                ${trainer.bio ? `<div><strong>Bio:</strong><br>${trainer.bio}</div>` : ''}
                <div>
                    <strong>Trainings Completed:</strong> ${trainerAllocations.filter(a => a.delivered).length}
                </div>
                <div>
                    <strong>Admin Rating:</strong> 
                    <span class="star-rating">${renderStars(trainer.adminRating || 0)}</span>
                </div>
                ${trainer.adminNotes ? `<div><strong>Admin Notes:</strong><br>${trainer.adminNotes}</div>` : ''}
                ${trainer.employmentType === 'freelancer' && trainer.dayRate ? `<div><strong>Day Rate:</strong> £${trainer.dayRate}</div>` : ''}
            </div>
            
            <div class="form-actions" style="justify-content:space-between;">
                <button class="btn btn-danger" onclick="confirmDeleteTrainer('${trainerId}', '${trainer.name.replace(/'/g, "\\'")}')">Delete Trainer</button>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-secondary" onclick="document.getElementById('view-trainer-modal').remove()">Close</button>
                    <button class="btn btn-primary" onclick="document.getElementById('view-trainer-modal').remove(); editTrainerAdmin('${trainerId}')">Edit</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function editTrainerAdmin(trainerId) {
    const trainer = state.trainers.find(t => t.id === trainerId);
    if (!trainer) return;
    
    const modal = document.createElement('div');
    modal.id = 'edit-trainer-admin-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-profile">
            <div class="modal-header-row">
                <h2>Edit Trainer (Admin)</h2>
                <button class="btn btn-icon" onclick="document.getElementById('edit-trainer-admin-modal').remove()">✕</button>
            </div>
            
            <p style="color:var(--tnh-steel);margin-bottom:1rem;">Edit admin-only fields for ${trainer.name}</p>
            
            <div class="form-group">
                <label>Admin Rating</label>
                <div class="star-rating-input" id="admin-rating-input">
                    ${[1,2,3,4,5].map(i => `<span class="star ${i <= (trainer.adminRating || 0) ? 'active' : ''}" data-rating="${i}" onclick="setAdminRating(${i})">★</span>`).join('')}
                </div>
            </div>
            
            <div class="form-group">
                <label>Day Rate (£)</label>
                <input type="number" id="admin-day-rate" value="${trainer.dayRate || ''}" placeholder="e.g., 350">
            </div>
            
            <div class="form-group">
                <label>Admin Notes</label>
                <textarea id="admin-notes" rows="3" placeholder="Private notes about this trainer...">${trainer.adminNotes || ''}</textarea>
            </div>
            
            <input type="hidden" id="admin-rating-value" value="${trainer.adminRating || 0}">
            <input type="hidden" id="edit-trainer-id" value="${trainerId}">
            
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="document.getElementById('edit-trainer-admin-modal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveTrainerAdminEdits()">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function setAdminRating(rating) {
    document.getElementById('admin-rating-value').value = rating;
    document.querySelectorAll('#admin-rating-input .star').forEach((star, idx) => {
        star.classList.toggle('active', idx < rating);
    });
}

async function saveTrainerAdminEdits() {
    const trainerId = document.getElementById('edit-trainer-id').value;
    const rating = parseInt(document.getElementById('admin-rating-value').value) || 0;
    const dayRate = parseInt(document.getElementById('admin-day-rate').value) || null;
    const notes = document.getElementById('admin-notes').value;
    
    try {
        await db.collection('users').doc(trainerId).update({
            adminRating: rating,
            dayRate: dayRate,
            adminNotes: notes
        });
        
        document.getElementById('edit-trainer-admin-modal').remove();
        showToast('Trainer updated', 'success');
        loadAdminData();
    } catch (error) {
        showToast('Error updating trainer', 'error');
    }
}

window.viewTrainerProfile = viewTrainerProfile;
window.editTrainerAdmin = editTrainerAdmin;
window.setAdminRating = setAdminRating;
window.saveTrainerAdminEdits = saveTrainerAdminEdits;

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
window.toggleAdmin = toggleAdmin;
window.toggleDateSelection = toggleDateSelection;
window.closeAllocationModal = closeAllocationModal;
window.confirmAllocation = confirmAllocation;
window.setTrainingType = setTrainingType;
window.cancelTraining = cancelTraining;
window.showAllocationDetails = showAllocationDetails;
window.closeAllocationDetailsModal = closeAllocationDetailsModal;
window.markAsDelivered = markAsDelivered;
window.confirmDeleteTrainer = confirmDeleteTrainer;
window.proceedToReauth = proceedToReauth;
window.executeTrainerDeletion = executeTrainerDeletion;
window.closeDeleteModals = closeDeleteModals;
window.sendReminderForAllocation = sendReminderForAllocation;

// Send reminder email for allocation
async function sendReminderForAllocation(allocId) {
    const alloc = state.allocations.find(a => a.id === allocId);
    if (!alloc) return;
    
    // Find all allocations in the same group for date range
    const groupAllocs = alloc.groupId 
        ? state.allocations.filter(a => a.groupId === alloc.groupId)
        : [alloc];
    
    const sortedDates = groupAllocs.map(a => a.date).sort();
    const dateDisplay = sortedDates.length === 1 
        ? formatDate(new Date(sortedDates[0]))
        : `${formatDateShort(new Date(sortedDates[0]))} - ${formatDateShort(new Date(sortedDates[sortedDates.length - 1]))}`;
    
    await sendTrainingReminderEmail({
        trainerName: alloc.trainerName,
        trainerEmail: alloc.trainerEmail,
        title: alloc.title,
        dates: dateDisplay,
        location: alloc.location,
        client: alloc.client
    });
}
window.sendReminderEmail = sendReminderEmail;

// Delete trainer with confirmation and re-authentication
let trainerToDelete = null;

function confirmDeleteTrainer(trainerId, trainerName) {
    trainerToDelete = { id: trainerId, name: trainerName };
    
    // Close the profile modal
    document.getElementById('view-trainer-modal')?.remove();
    
    // Show confirmation modal
    const modal = document.createElement('div');
    modal.id = 'delete-confirm-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>⚠️ Delete Trainer</h3>
            <p>Are you sure you want to delete <strong>${trainerName}</strong>?</p>
            <p style="color:var(--tnh-orange);font-size:0.9rem;margin-top:0.5rem;">
                This will permanently remove their profile, availability data, and cannot be undone. 
                Their allocation history will be preserved for records.
            </p>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeDeleteModals()">Cancel</button>
                <button class="btn btn-danger" onclick="proceedToReauth()">Yes, Delete Trainer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function proceedToReauth() {
    // Close confirmation modal
    document.getElementById('delete-confirm-modal')?.remove();
    
    // Show re-authentication modal
    const modal = document.createElement('div');
    modal.id = 'reauth-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>🔐 Confirm Your Identity</h3>
            <p>For security, please enter your password to confirm this deletion.</p>
            <div class="form-group" style="margin:1rem 0;">
                <label>Your Password</label>
                <input type="password" id="reauth-password" placeholder="Enter your password" class="form-input">
            </div>
            <div id="reauth-error" class="auth-message error hidden"></div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeDeleteModals()">Cancel</button>
                <button class="btn btn-danger" onclick="executeTrainerDeletion()">Confirm & Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus password field
    setTimeout(() => document.getElementById('reauth-password')?.focus(), 100);
    
    // Allow Enter key to submit
    document.getElementById('reauth-password').onkeydown = (e) => {
        if (e.key === 'Enter') executeTrainerDeletion();
    };
}

async function executeTrainerDeletion() {
    const password = document.getElementById('reauth-password')?.value;
    const errorEl = document.getElementById('reauth-error');
    
    if (!password) {
        errorEl.textContent = 'Please enter your password';
        errorEl.classList.remove('hidden');
        return;
    }
    
    if (!trainerToDelete) {
        closeDeleteModals();
        return;
    }
    
    try {
        // Re-authenticate the admin
        const credential = firebase.auth.EmailAuthProvider.credential(
            state.currentUser.email,
            password
        );
        
        await state.currentUser.reauthenticateWithCredential(credential);
        
        // Authentication successful - proceed with deletion
        showToast('Deleting trainer...', 'info');
        
        // Delete user document
        await db.collection('users').doc(trainerToDelete.id).delete();
        
        // Delete availability document
        await db.collection('availability').doc(trainerToDelete.id).delete();
        
        // Note: We keep allocations for historical records, just the trainer is removed
        
        // Try to delete their profile photo from storage
        try {
            const photoRef = firebase.storage().ref().child(`profile-photos/${trainerToDelete.id}`);
            await photoRef.delete();
        } catch (e) {
            // Photo might not exist, that's fine
        }
        
        showToast(`${trainerToDelete.name} has been deleted`, 'success');
        closeDeleteModals();
        
        // Refresh the trainer list
        loadAdminData();
        
    } catch (error) {
        console.error('Deletion error:', error);
        
        if (error.code === 'auth/wrong-password') {
            errorEl.textContent = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/too-many-requests') {
            errorEl.textContent = 'Too many attempts. Please wait and try again.';
        } else {
            errorEl.textContent = 'Error: ' + error.message;
        }
        errorEl.classList.remove('hidden');
    }
}

function closeDeleteModals() {
    document.getElementById('delete-confirm-modal')?.remove();
    document.getElementById('reauth-modal')?.remove();
    trainerToDelete = null;
}

function showAllocationDetails(allocId) {
    const alloc = state.allocations.find(a => a.id === allocId);
    if (!alloc) return;
    
    // Find all allocations in the same group
    const groupAllocs = alloc.groupId 
        ? state.allocations.filter(a => a.groupId === alloc.groupId)
        : [alloc];
    
    const sortedDates = groupAllocs.map(a => a.date).sort();
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    const dateDisplay = sortedDates.length === 1 
        ? formatDate(startDate)
        : `${formatDateShort(startDate)} - ${formatDateShort(endDate)} (${sortedDates.length} days)`;
    
    const trainer = state.trainers.find(t => t.id === alloc.trainerId);
    const isFreelancer = trainer?.employmentType === 'freelancer';
    
    const statusClass = alloc.delivered ? 'delivered' : alloc.status;
    const statusText = alloc.delivered ? 'Delivered' : alloc.status.charAt(0).toUpperCase() + alloc.status.slice(1);
    
    const content = document.getElementById('allocation-details-content');
    content.innerHTML = `
        <div class="details-grid">
            <div class="detail-row"><strong>Training:</strong> ${alloc.title}</div>
            <div class="detail-row"><strong>Trainer:</strong> ${alloc.trainerName}</div>
            <div class="detail-row"><strong>Dates:</strong> ${dateDisplay}</div>
            <div class="detail-row"><strong>Type:</strong> ${alloc.trainingType === 'remote' ? '💻 Remote' : '📍 In Person'}</div>
            ${alloc.location ? `<div class="detail-row"><strong>Location:</strong> ${alloc.location}</div>` : ''}
            ${alloc.client ? `<div class="detail-row"><strong>Client:</strong> ${alloc.client}</div>` : ''}
            <div class="detail-row"><strong>Status:</strong> <span class="status-badge ${statusClass}">${statusText}</span></div>
            ${alloc.status === 'declined' && alloc.declineReason ? `<div class="detail-row decline-reason-display"><strong>Decline Reason:</strong> ${alloc.declineReason}</div>` : ''}
            ${alloc.delivered ? `<div class="detail-row"><strong>Delivered:</strong> ✅ Yes</div>` : ''}
            ${isFreelancer && alloc.trainerRate ? `<div class="detail-row"><strong>Rate:</strong> £${alloc.trainerRate}/day (Total: £${alloc.trainerRate * sortedDates.length})</div>` : ''}
            ${isFreelancer && alloc.poNumber ? `<div class="detail-row"><strong>PO Number:</strong> ${alloc.poNumber}</div>` : ''}
            ${alloc.notes ? `<div class="detail-row"><strong>Notes:</strong> ${alloc.notes}</div>` : ''}
        </div>
    `;
    
    const allIds = groupAllocs.map(a => a.id).join(',');
    const actions = document.getElementById('allocation-details-actions');
    
    let actionButtons = `<button class="btn btn-secondary" onclick="closeAllocationDetailsModal()">Close</button>`;
    
    if (alloc.status === 'pending') {
        actionButtons += `<button class="btn btn-primary" onclick="sendReminderForAllocation('${alloc.id}')">📧 Send Reminder</button>`;
        actionButtons += `<button class="btn btn-danger" onclick="cancelTraining('${allIds}'); closeAllocationDetailsModal();">Cancel Training</button>`;
    } else if (alloc.status === 'declined') {
        // Offer to remove
        actionButtons += `<button class="btn btn-danger" onclick="cancelTraining('${allIds}'); closeAllocationDetailsModal();">Remove</button>`;
    } else if (!alloc.delivered) {
        actionButtons += `<button class="btn btn-success" onclick="markAsDelivered('${allIds}')">Mark Delivered</button>`;
        actionButtons += `<button class="btn btn-danger" onclick="cancelTraining('${allIds}'); closeAllocationDetailsModal();">Cancel Training</button>`;
    }
    
    actions.innerHTML = actionButtons;
    
    document.getElementById('allocation-details-modal').classList.remove('hidden');
}

function closeAllocationDetailsModal() {
    document.getElementById('allocation-details-modal').classList.add('hidden');
}

async function markAsDelivered(idsString) {
    const ids = idsString.split(',');
    try {
        for (const id of ids) {
            await db.collection('allocations').doc(id).update({
                delivered: true,
                deliveredAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        showToast('Training marked as delivered', 'success');
        closeAllocationDetailsModal();
        loadAdminData();
    } catch (e) {
        showToast('Error updating', 'error');
    }
}
