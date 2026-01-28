/* TNH Scheduling - Trainer View */

let selectedDatesTrainer = [];

function initTrainerView() {
    renderTrainerViewHTML();
    loadTrainerData();
    
    document.getElementById('prev-month').onclick = () => {
        state.currentMonth--;
        if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
        clearTrainerSelection();
        renderTrainerCalendar();
    };
    
    document.getElementById('next-month').onclick = () => {
        state.currentMonth++;
        if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
        clearTrainerSelection();
        renderTrainerCalendar();
    };
}

function renderTrainerViewHTML() {
    document.getElementById('trainer-view').innerHTML = `
        <div id="trainer-profile-card"></div>
        
        <div class="content-header">
            <h2>My Availability</h2>
            <p>Select dates below, then confirm if you're available or not.</p>
        </div>
        
        <div class="calendar-controls">
            <button class="btn btn-icon" id="prev-month">←</button>
            <h3 id="current-month-year"></h3>
            <button class="btn btn-icon" id="next-month">→</button>
        </div>
        
        <!-- Selection Action Bar -->
        <div id="trainer-action-bar" class="action-bar hidden">
            <div class="action-bar-info">
                <span id="selected-count">0</span> date(s) selected
            </div>
            <div class="action-bar-buttons">
                <button class="btn btn-secondary btn-sm" onclick="clearTrainerSelection()">Clear</button>
                <button class="btn btn-unavailable" onclick="confirmAvailability('unavailable')">Mark Unavailable</button>
                <button class="btn btn-available" onclick="confirmAvailability('available')">Mark Available</button>
            </div>
        </div>
        
        <div class="calendar-legend">
            <div class="legend-item"><span class="legend-dot not-set"></span><span>Not Set</span></div>
            <div class="legend-item"><span class="legend-dot available"></span><span>Available</span></div>
            <div class="legend-item"><span class="legend-dot unavailable-confirmed"></span><span>Unavailable</span></div>
            <div class="legend-item"><span class="legend-dot allocated"></span><span>Allocated</span></div>
        </div>
        
        <div class="calendar" id="trainer-calendar"></div>
        
        <h3 style="margin: 2rem 0 1rem 0;">My Upcoming Trainings</h3>
        <div id="trainer-allocations" class="allocations-list"></div>
    `;
    
    renderTrainerProfileCard();
}

async function loadTrainerData() {
    try {
        // Load availability
        const availDoc = await db.collection('availability').doc(state.currentUser.uid).get();
        state.trainerAvailability = availDoc.exists ? (availDoc.data().dates || {}) : {};
        
        // Load allocations for this trainer
        const allocSnap = await db.collection('allocations')
            .where('trainerId', '==', state.currentUser.uid)
            .get();
        state.trainerAllocations = allocSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        renderTrainerCalendar();
        renderTrainerAllocations();
        
        // Check for pending allocations and show notification
        checkPendingAllocations();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data', 'error');
    }
}

function renderTrainerCalendar() {
    const calendar = document.getElementById('trainer-calendar');
    document.getElementById('current-month-year').textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
    
    const firstDay = new Date(state.currentYear, state.currentMonth, 1);
    const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday = 0
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Header row
    let html = '<div class="calendar-header">Mon</div><div class="calendar-header">Tue</div><div class="calendar-header">Wed</div><div class="calendar-header">Thu</div><div class="calendar-header">Fri</div><div class="calendar-header">Sat</div><div class="calendar-header">Sun</div>';
    
    // Empty cells for padding
    for (let i = 0; i < startPad; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(state.currentYear, state.currentMonth, d);
        const dateKey = getDateKey(date);
        const isPast = date < today;
        const isToday = date.getTime() === today.getTime();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        // Check status
        const availStatus = state.trainerAvailability[dateKey];
        const allocation = state.trainerAllocations.find(a => a.date === dateKey);
        const isSelected = selectedDatesTrainer.includes(dateKey);
        
        let cls = 'calendar-day';
        let statusIcon = '';
        let clickable = false;
        
        if (allocation) {
            if (allocation.delivered) {
                cls += ' delivered';
                statusIcon = '✅';
            } else {
                cls += ' allocated';
                statusIcon = allocation.trainingType === 'remote' ? '💻' : '📍';
            }
        } else if (isSelected) {
            cls += ' selected';
            statusIcon = '●';
            clickable = !isPast;
        } else if (availStatus === 'available') {
            cls += ' available';
            statusIcon = '✓';
            clickable = !isPast;
        } else if (availStatus === 'unavailable') {
            cls += ' unavailable-confirmed';
            statusIcon = '✗';
            clickable = !isPast;
        } else {
            cls += ' not-set';
            clickable = !isPast;
        }
        
        if (isPast) cls += ' past';
        if (isToday) cls += ' today';
        if (isWeekend) cls += ' weekend';
        
        if (clickable) {
            html += `<div class="${cls}" onclick="toggleTrainerDate('${dateKey}')"><span class="day-number">${d}</span><span class="day-status">${statusIcon}</span></div>`;
        } else {
            html += `<div class="${cls}"><span class="day-number">${d}</span><span class="day-status">${statusIcon}</span></div>`;
        }
    }
    
    calendar.innerHTML = html;
}

function toggleTrainerDate(dateKey) {
    const idx = selectedDatesTrainer.indexOf(dateKey);
    if (idx > -1) {
        selectedDatesTrainer.splice(idx, 1);
    } else {
        selectedDatesTrainer.push(dateKey);
    }
    updateTrainerActionBar();
    renderTrainerCalendar();
}

function updateTrainerActionBar() {
    const bar = document.getElementById('trainer-action-bar');
    const count = document.getElementById('selected-count');
    
    if (selectedDatesTrainer.length > 0) {
        bar.classList.remove('hidden');
        count.textContent = selectedDatesTrainer.length;
    } else {
        bar.classList.add('hidden');
    }
}

function clearTrainerSelection() {
    selectedDatesTrainer = [];
    updateTrainerActionBar();
    renderTrainerCalendar();
}

async function confirmAvailability(status) {
    if (selectedDatesTrainer.length === 0) return;
    
    try {
        // Update local state
        selectedDatesTrainer.forEach(dateKey => {
            state.trainerAvailability[dateKey] = status;
        });
        
        // Save to Firestore
        await db.collection('availability').doc(state.currentUser.uid).set({
            dates: state.trainerAvailability,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        const statusText = status === 'available' ? 'available' : 'unavailable';
        showToast(`${selectedDatesTrainer.length} date(s) marked as ${statusText}`, 'success');
        
        clearTrainerSelection();
    } catch (error) {
        console.error('Error saving availability:', error);
        showToast('Error saving availability', 'error');
    }
}

function renderTrainerAllocations() {
    const container = document.getElementById('trainer-allocations');
    const upcoming = state.trainerAllocations
        .filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0) - 86400000 * 30)) // Include last 30 days for delivery marking
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (!upcoming.length) {
        container.innerHTML = '<p class="no-data">No upcoming trainings allocated.</p>';
        return;
    }
    
    // Group allocations by groupId
    const grouped = {};
    upcoming.forEach(a => {
        const key = a.groupId || a.id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(a);
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    container.innerHTML = Object.values(grouped).map(group => {
        // Use first allocation for main details (all share same details except date)
        const a = group[0];
        const allIds = group.map(g => g.id).join(',');
        
        // Calculate date display
        const sortedDates = group.map(g => g.date).sort();
        const dateDisplay = sortedDates.length === 1 
            ? formatDate(new Date(sortedDates[0]))
            : `${formatDateShort(new Date(sortedDates[0]))} - ${formatDateShort(new Date(sortedDates[sortedDates.length - 1]))} (${sortedDates.length} days)`;
        
        const latestDate = new Date(sortedDates[sortedDates.length - 1]);
        const isPast = latestDate < today;
        const canMarkDelivered = isPast && a.status === 'confirmed' && !a.delivered;
        
        // Calculate total rate for multi-day
        const totalRate = a.trainerRate ? a.trainerRate * sortedDates.length : null;
        
        return `
            <div class="allocation-card trainer-allocation ${a.status} ${a.delivered ? 'delivered' : ''}">
                <div class="allocation-details">
                    <div class="title">${a.title} ${a.delivered ? '✅' : ''}</div>
                    <div class="meta">
                        <span>📅 ${dateDisplay}</span>
                        <span>${a.trainingType === 'remote' ? '💻 Remote' : '📍 In Person'}</span>
                        ${a.location ? `<span>📍 ${a.location}</span>` : ''}
                        ${a.client ? `<span>🏢 ${a.client}</span>` : ''}
                    </div>
                    ${a.trainerRate ? `<div class="rate-info">💷 Rate: £${a.trainerRate}/day${sortedDates.length > 1 ? ` (Total: £${totalRate})` : ''}</div>` : ''}
                    ${a.poNumber ? `<div class="po-info">📄 PO: ${a.poNumber}</div>` : ''}
                    ${a.notes ? `<div class="notes">${a.notes}</div>` : ''}
                    ${a.declineReason ? `<div class="decline-reason"><strong>Decline reason:</strong> ${a.declineReason}</div>` : ''}
                </div>
                <div class="allocation-actions">
                    <span class="status-badge ${a.status}">${a.delivered ? 'delivered' : a.status}</span>
                    ${a.status === 'pending' ? `
                        <div class="response-buttons">
                            <button class="btn btn-success btn-sm" onclick="respondToAllocation('${allIds}', 'confirmed')">Confirm</button>
                            <button class="btn btn-secondary btn-sm" onclick="showDeclineModal('${allIds}')">Decline</button>
                        </div>
                    ` : ''}
                    ${canMarkDelivered ? `
                        <button class="btn btn-primary btn-sm" onclick="markTrainingDelivered('${allIds}')">Mark Delivered</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}
    }).join('');
}

// Show decline modal with reason field
function showDeclineModal(allocIds) {
    const modal = document.createElement('div');
    modal.id = 'decline-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Decline Training</h3>
            <p>Please provide a reason for declining this training assignment:</p>
            <div class="form-group" style="margin: 1rem 0;">
                <textarea id="decline-reason" rows="3" placeholder="e.g., Prior commitment, travel issues, not qualified for this course..." class="form-textarea"></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="document.getElementById('decline-modal').remove()">Cancel</button>
                <button class="btn btn-danger" onclick="submitDecline('${allocIds}')">Decline Training</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitDecline(allocIds) {
    const reason = document.getElementById('decline-reason')?.value?.trim();
    
    if (!reason) {
        showToast('Please provide a reason for declining', 'error');
        return;
    }
    
    try {
        const ids = allocIds.split(',');
        
        // Update all allocations in the group
        for (const id of ids) {
            await db.collection('allocations').doc(id).update({
                status: 'declined',
                declineReason: reason,
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const alloc = state.trainerAllocations.find(a => a.id === id);
            if (alloc) {
                alloc.status = 'declined';
                alloc.declineReason = reason;
            }
        }
        
        document.getElementById('decline-modal')?.remove();
        showToast('Training declined', 'success');
        renderTrainerAllocations();
        renderTrainerCalendar();
    } catch (error) {
        showToast('Error updating', 'error');
    }
}

window.showDeclineModal = showDeclineModal;
window.submitDecline = submitDecline;

// Check for pending allocations and show notification
function checkPendingAllocations() {
    const pending = state.trainerAllocations.filter(a => a.status === 'pending');
    
    // Group by groupId to count unique trainings
    const grouped = {};
    pending.forEach(a => {
        const key = a.groupId || a.id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(a);
    });
    
    const uniqueTrainings = Object.keys(grouped).length;
    
    if (uniqueTrainings > 0) {
        showPendingNotification(uniqueTrainings);
    }
}

function showPendingNotification(count) {
    const modal = document.createElement('div');
    modal.id = 'pending-notification-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>📋 New Training Assignment${count > 1 ? 's' : ''}</h3>
            <p>You have <strong>${count}</strong> training assignment${count > 1 ? 's' : ''} pending your confirmation.</p>
            <p style="color: var(--tnh-steel); font-size: 0.9rem; margin-top: 0.5rem;">Please review and confirm or decline each assignment in your Allocated Trainings section below.</p>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="document.getElementById('pending-notification-modal').remove(); document.getElementById('trainer-allocations').scrollIntoView({behavior: 'smooth'});">View Assignments</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function markTrainingDelivered(allocIds) {
    try {
        const ids = allocIds.split(',');
        
        for (const id of ids) {
            await db.collection('allocations').doc(id).update({
                delivered: true,
                deliveredAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const alloc = state.trainerAllocations.find(a => a.id === id);
            if (alloc) alloc.delivered = true;
        }
        
        showToast('Training marked as delivered', 'success');
        renderTrainerAllocations();
        renderTrainerCalendar();
    } catch (error) {
        showToast('Error updating', 'error');
    }
}

window.markTrainingDelivered = markTrainingDelivered;

async function respondToAllocation(allocIds, response) {
    try {
        const ids = allocIds.split(',');
        
        // Update all allocations in the group
        for (const id of ids) {
            await db.collection('allocations').doc(id).update({
                status: response,
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local state
            const alloc = state.trainerAllocations.find(a => a.id === id);
            if (alloc) alloc.status = response;
        }
        
        showToast(`Training ${response}`, 'success');
        renderTrainerAllocations();
        renderTrainerCalendar();
    } catch (error) {
        showToast('Error responding', 'error');
    }
}

// Make functions global
window.toggleTrainerDate = toggleTrainerDate;
window.clearTrainerSelection = clearTrainerSelection;
window.confirmAvailability = confirmAvailability;
window.respondToAllocation = respondToAllocation;
