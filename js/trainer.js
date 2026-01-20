/* TNH Scheduling - Trainer View */

function initTrainerView() {
    renderTrainerViewHTML();
    loadTrainerData();
    
    document.getElementById('prev-month').onclick = () => {
        state.currentMonth--;
        if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
        renderTrainerCalendar();
    };
    
    document.getElementById('next-month').onclick = () => {
        state.currentMonth++;
        if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
        renderTrainerCalendar();
    };
}

function renderTrainerViewHTML() {
    document.getElementById('trainer-view').innerHTML = `
        <div id="trainer-profile-card"></div>
        
        <div class="content-header">
            <h2>My Availability</h2>
            <p>Click on dates to toggle your availability. Green means you're available.</p>
        </div>
        <div class="calendar-controls">
            <button class="btn btn-icon" id="prev-month">←</button>
            <h3 id="current-month-year"></h3>
            <button class="btn btn-icon" id="next-month">→</button>
        </div>
        <div class="calendar-legend">
            <div class="legend-item"><span class="legend-dot available"></span><span>Available</span></div>
            <div class="legend-item"><span class="legend-dot unavailable"></span><span>Unavailable</span></div>
            <div class="legend-item"><span class="legend-dot allocated"></span><span>Allocated</span></div>
        </div>
        <div class="calendar" id="trainer-calendar"></div>
        <h3 style="margin-bottom:1rem;">My Upcoming Trainings</h3>
        <div id="trainer-allocations" class="allocations-list"></div>
    `;
    
    // Render profile card
    renderTrainerProfileCard();
}

async function loadTrainerData() {
    // Load availability
    const availDoc = await db.collection('availability').doc(state.currentUser.uid).get();
    state.availability = availDoc.exists ? (availDoc.data().dates || {}) : {};
    
    // Load allocations
    const allocSnap = await db.collection('allocations')
        .where('trainerId', '==', state.currentUser.uid)
        .orderBy('date', 'asc')
        .get();
    state.allocations = [];
    allocSnap.forEach(doc => state.allocations.push({ id: doc.id, ...doc.data() }));
    
    renderTrainerCalendar();
    renderTrainerAllocations();
}

function renderTrainerCalendar() {
    document.getElementById('current-month-year').textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
    
    const firstDay = new Date(state.currentYear, state.currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - ((firstDay.getDay() + 6) % 7));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        .map(d => `<div class="calendar-header">${d}</div>`).join('');
    
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const dateKey = getDateKey(currentDate);
        const isCurrentMonth = currentDate.getMonth() === state.currentMonth;
        const isToday = currentDate.getTime() === today.getTime();
        const isAvailable = state.availability[dateKey] === true;
        const isPast = currentDate < today;
        const allocation = state.allocations.find(a => a.date === dateKey);
        
        let classes = ['calendar-day'];
        if (!isCurrentMonth) classes.push('other-month');
        if (isToday) classes.push('today');
        if (allocation) classes.push('allocated');
        else if (isAvailable) classes.push('available');
        if (isWeekend(currentDate)) classes.push('weekend');
        
        const clickable = isCurrentMonth && !isPast && !allocation;
        
        html += `<div class="${classes.join(' ')}" 
            ${clickable ? `onclick="toggleAvailability('${dateKey}')"` : 'style="cursor:default"'}>
            <span class="date-number">${currentDate.getDate()}</span>
        </div>`;
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    document.getElementById('trainer-calendar').innerHTML = html;
}

async function toggleAvailability(dateKey) {
    const current = state.availability[dateKey] || false;
    state.availability[dateKey] = !current;
    
    try {
        await db.collection('availability').doc(state.currentUser.uid).set(
            { dates: state.availability, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
            { merge: true }
        );
        renderTrainerCalendar();
        showToast(state.availability[dateKey] ? 'Marked available' : 'Marked unavailable', 'success');
    } catch (e) {
        state.availability[dateKey] = current;
        showToast('Error saving', 'error');
    }
}

function renderTrainerAllocations() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = state.allocations.filter(a => new Date(a.date) >= today);
    
    if (!upcoming.length) {
        document.getElementById('trainer-allocations').innerHTML = '<p class="no-data">No upcoming trainings.</p>';
        return;
    }
    
    document.getElementById('trainer-allocations').innerHTML = upcoming.map(a => `
        <div class="allocation-card ${a.status}">
            <div class="allocation-details">
                <div class="title">${a.title}</div>
                <div class="meta">
                    <span>📅 ${formatDate(new Date(a.date))}</span>
                    ${a.location ? `<span>📍 ${a.location}</span>` : ''}
                    ${a.client ? `<span>🏢 ${a.client}</span>` : ''}
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">
                <span class="status-badge ${a.status}">${a.status}</span>
                ${a.status === 'pending' ? `
                    <div style="display:flex;gap:0.5rem;">
                        <button class="btn btn-success btn-sm" onclick="respondAllocation('${a.id}','confirmed')">Confirm</button>
                        <button class="btn btn-danger btn-sm" onclick="respondAllocation('${a.id}','declined')">Decline</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function respondAllocation(id, status) {
    try {
        await db.collection('allocations').doc(id).update({
            status,
            respondedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`Training ${status}`, 'success');
        loadTrainerData();
    } catch (e) {
        showToast('Error updating', 'error');
    }
}

// Make functions global
window.toggleAvailability = toggleAvailability;
window.respondAllocation = respondAllocation;
