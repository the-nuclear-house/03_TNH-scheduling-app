/* TNH Scheduling - Utility Functions */

// Global state
const state = {
    currentUser: null,
    userProfile: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    availability: {},
    allocations: [],
    trainers: []
};

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.add('show');
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

// Show confirmation modal
function showModal(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        modal.classList.remove('hidden');
        
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        
        const cleanup = () => {
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };
        
        confirmBtn.onclick = () => { modal.classList.add('hidden'); cleanup(); resolve(true); };
        cancelBtn.onclick = () => { modal.classList.add('hidden'); cleanup(); resolve(false); };
    });
}

// Date utilities
function formatDate(date) {
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Email sending functions
async function sendTrainingAssignmentEmail(allocation) {
    try {
        const templateParams = {
            trainer_name: allocation.trainerName,
            trainer_email: allocation.trainerEmail,
            training_title: allocation.title,
            training_dates: allocation.dates || formatDate(new Date(allocation.date)),
            training_type: allocation.trainingType === 'remote' ? 'Remote' : 'In Person',
            training_location: allocation.location || 'N/A',
            training_client: allocation.client || 'N/A',
            training_notes: allocation.notes || 'None'
        };
        
        await emailjs.send(
            emailjsConfig.serviceId,
            emailjsConfig.templateId,
            templateParams
        );
        console.log('Assignment email sent successfully');
    } catch (error) {
        console.error('Error sending assignment email:', error);
    }
}

async function sendTrainingReminderEmail(allocation) {
    try {
        const templateParams = {
            trainer_name: allocation.trainerName,
            trainer_email: allocation.trainerEmail,
            training_title: allocation.title,
            training_dates: allocation.dates || formatDate(new Date(allocation.date)),
            training_location: allocation.location || 'N/A',
            training_client: allocation.client || 'N/A'
        };
        
        await emailjs.send(
            emailjsConfig.serviceId,
            emailjsConfig.reminderTemplateId,
            templateParams
        );
        showToast('Reminder email sent', 'success');
    } catch (error) {
        console.error('Error sending reminder email:', error);
        showToast('Error sending reminder email', 'error');
    }
}
