/* TNH Scheduling - Trainer Profile System */

let uploadedPhotoURL = null;

function showProfileSetupModal() {
    const modal = document.createElement('div');
    modal.id = 'profile-setup-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-profile">
            <h2>Complete Your Profile</h2>
            <p class="modal-subtitle">Please complete all required fields (*) before accessing the scheduling system.</p>
            
            <div id="profile-error-summary" class="error-summary hidden"></div>
            
            <div class="profile-form">
                <!-- Photo Upload -->
                <div class="form-section">
                    <label class="section-label">Profile Photo</label>
                    <div class="photo-upload-row">
                        <div class="photo-preview" id="photo-preview">
                            <span class="photo-initial">${state.userProfile?.name?.charAt(0) || '?'}</span>
                        </div>
                        <div class="photo-controls">
                            <label class="btn btn-secondary">
                                Choose Photo
                                <input type="file" id="profile-photo-input" accept="image/*" hidden>
                            </label>
                            <span class="photo-hint">JPG or PNG, max 5MB</span>
                        </div>
                    </div>
                </div>

                <!-- IOSH Membership -->
                <div class="form-section" id="section-membership">
                    <label class="section-label">IOSH Membership Level *</label>
                    <select id="profile-iosh-membership" class="form-select">
                        <option value="">-- Select your membership level --</option>
                        <option value="none">None</option>
                        <option value="affiliate">Affiliate / Student</option>
                        <option value="tech">Tech IOSH (Technical Member)</option>
                        <option value="grad">Grad IOSH (Graduate Member)</option>
                        <option value="cert">Cert IOSH (Certified Member)</option>
                        <option value="cmiosh">CMIOSH (Chartered Member)</option>
                        <option value="cfiosh">CFIOSH (Chartered Fellow)</option>
                    </select>
                </div>

                <!-- IOSH Trainer Approval -->
                <div class="form-section">
                    <label class="section-label">Are you an IOSH Approved Trainer? *</label>
                    <div class="radio-buttons">
                        <label class="radio-option">
                            <input type="radio" name="iosh-approved" value="yes">
                            <span>Yes, I am approved to deliver IOSH courses</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="iosh-approved" value="no" checked>
                            <span>No</span>
                        </label>
                    </div>
                </div>

                <!-- Training Qualifications -->
                <div class="form-section" id="section-qualifications">
                    <label class="section-label">Training Qualifications *</label>
                    <p class="section-hint">Select all qualifications you hold</p>
                    <div class="checkbox-grid">
                        <label class="checkbox-option"><input type="checkbox" name="qualifications" value="iosh-train-trainer"><span>IOSH Train the Trainer</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="qualifications" value="aet-ptlls"><span>Level 3 AET/PTLLS</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="qualifications" value="nebosh-gc"><span>NEBOSH General Certificate</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="qualifications" value="nebosh-diploma"><span>NEBOSH Diploma</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="qualifications" value="iosh-level3"><span>IOSH Level 3 Certificate</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="qualifications" value="iosh-level6"><span>IOSH Level 6 Diploma</span></label>
                    </div>
                </div>

                <!-- Courses They Can Deliver -->
                <div class="form-section" id="section-courses">
                    <label class="section-label">Courses You Can Deliver *</label>
                    <div class="checkbox-grid">
                        <label class="checkbox-option"><input type="checkbox" name="courses" value="managing-safely"><span>IOSH Managing Safely</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="courses" value="working-safely"><span>IOSH Working Safely</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="courses" value="managing-safely-refresher"><span>Managing Safely Refresher</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="courses" value="leading-safely"><span>IOSH Leading Safely</span></label>
                    </div>
                    <input type="text" id="profile-other-courses" class="form-input" style="margin-top:0.75rem" placeholder="Other courses (comma separated)">
                </div>

                <!-- Experience -->
                <div class="form-section" id="section-experience">
                    <label class="section-label">Experience *</label>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="small-label">Years of training experience</label>
                            <input type="number" id="profile-training-years" min="0" max="50" class="form-input" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label class="small-label">Years in H&S sector</label>
                            <input type="number" id="profile-hs-years" min="0" max="50" class="form-input" placeholder="0">
                        </div>
                    </div>
                </div>

                <!-- Bio -->
                <div class="form-section">
                    <label class="section-label">Short Bio (optional)</label>
                    <textarea id="profile-bio" rows="3" class="form-textarea" placeholder="Brief description of your background..."></textarea>
                </div>

                <!-- Submit -->
                <button class="btn btn-primary btn-block" onclick="saveTrainerProfile()">Save Profile & Continue</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('profile-photo-input').onchange = handlePhotoUpload;
}

async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById('photo-preview') || document.getElementById('edit-photo-preview');
        if (preview) {
            preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        }
    };
    reader.readAsDataURL(file);
    
    // Upload to Firebase Storage
    try {
        if (!firebase.storage) {
            throw new Error('Firebase Storage not initialized');
        }
        
        const storageRef = firebase.storage().ref();
        const photoRef = storageRef.child(`profile-photos/${state.currentUser.uid}`);
        
        showToast('Uploading photo...', 'info');
        
        await photoRef.put(file);
        uploadedPhotoURL = await photoRef.getDownloadURL();
        
        showToast('Photo uploaded successfully', 'success');
    } catch (err) {
        console.error('Photo upload error:', err);
        
        // Fallback to base64
        uploadedPhotoURL = await new Promise(r => {
            const fr = new FileReader();
            fr.onload = e => r(e.target.result);
            fr.readAsDataURL(file);
        });
        
        showToast('Photo ready (saved locally)', 'success');
    }
}

async function saveTrainerProfile() {
    clearProfileErrors();
    
    const membership = document.getElementById('profile-iosh-membership').value;
    const qualifications = Array.from(document.querySelectorAll('input[name="qualifications"]:checked')).map(c => c.value);
    const courses = Array.from(document.querySelectorAll('input[name="courses"]:checked')).map(c => c.value);
    const trainingYears = document.getElementById('profile-training-years').value;
    const hsYears = document.getElementById('profile-hs-years').value;
    
    const errors = [];
    if (!membership) errors.push({ section: 'section-membership', msg: 'Select your IOSH membership level' });
    if (qualifications.length === 0) errors.push({ section: 'section-qualifications', msg: 'Select at least one qualification' });
    if (courses.length === 0) errors.push({ section: 'section-courses', msg: 'Select at least one course you can deliver' });
    if (trainingYears === '') errors.push({ section: 'section-experience', msg: 'Enter your training experience' });
    if (hsYears === '') errors.push({ section: 'section-experience', msg: 'Enter your H&S sector experience' });
    
    if (errors.length > 0) {
        showProfileErrors(errors);
        return;
    }
    
    try {
        const data = {
            ioshMembership: membership,
            ioshApprovedTrainer: document.querySelector('input[name="iosh-approved"]:checked')?.value === 'yes',
            qualifications,
            coursesCanDeliver: courses,
            otherCourses: document.getElementById('profile-other-courses').value.split(',').map(s => s.trim()).filter(Boolean),
            trainingYearsExperience: parseInt(trainingYears) || 0,
            hsSectorYears: parseInt(hsYears) || 0,
            bio: document.getElementById('profile-bio').value,
            photoURL: uploadedPhotoURL || null,
            profileComplete: true,
            profileUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(state.currentUser.uid).update(data);
        state.userProfile = { ...state.userProfile, ...data };
        document.getElementById('profile-setup-modal').remove();
        showToast('Profile saved', 'success');
        initTrainerView();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function showProfileErrors(errors) {
    const summary = document.getElementById('profile-error-summary');
    summary.innerHTML = `<strong>Please fix the following:</strong><ul>${errors.map(e => `<li>${e.msg}</li>`).join('')}</ul>`;
    summary.classList.remove('hidden');
    summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    errors.forEach(e => document.getElementById(e.section)?.classList.add('section-error'));
}

function clearProfileErrors() {
    document.getElementById('profile-error-summary')?.classList.add('hidden');
    document.querySelectorAll('.section-error').forEach(el => el.classList.remove('section-error'));
}

function showEditProfileModal() {
    const p = state.userProfile;
    uploadedPhotoURL = p.photoURL || null;
    
    const modal = document.createElement('div');
    modal.id = 'edit-profile-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-profile">
            <div class="modal-header-row">
                <h2>Edit Profile</h2>
                <button class="btn btn-icon" onclick="closeEditProfileModal()">✕</button>
            </div>
            
            <div class="profile-form">
                <div class="form-section">
                    <div class="photo-upload-row">
                        <div class="photo-preview" id="edit-photo-preview">
                            ${p.photoURL ? `<img src="${p.photoURL}">` : `<span class="photo-initial">${p.name?.charAt(0) || '?'}</span>`}
                        </div>
                        <label class="btn btn-secondary btn-sm">Change Photo<input type="file" id="edit-photo-input" accept="image/*" hidden></label>
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-label">IOSH Membership</label>
                    <select id="edit-iosh-membership" class="form-select">
                        <option value="none" ${p.ioshMembership === 'none' ? 'selected' : ''}>None</option>
                        <option value="affiliate" ${p.ioshMembership === 'affiliate' ? 'selected' : ''}>Affiliate</option>
                        <option value="tech" ${p.ioshMembership === 'tech' ? 'selected' : ''}>Tech IOSH</option>
                        <option value="grad" ${p.ioshMembership === 'grad' ? 'selected' : ''}>Grad IOSH</option>
                        <option value="cert" ${p.ioshMembership === 'cert' ? 'selected' : ''}>Cert IOSH</option>
                        <option value="cmiosh" ${p.ioshMembership === 'cmiosh' ? 'selected' : ''}>CMIOSH</option>
                        <option value="cfiosh" ${p.ioshMembership === 'cfiosh' ? 'selected' : ''}>CFIOSH</option>
                    </select>
                </div>

                <div class="form-section">
                    <label class="section-label">IOSH Approved Trainer?</label>
                    <div class="radio-buttons">
                        <label class="radio-option"><input type="radio" name="edit-iosh-approved" value="yes" ${p.ioshApprovedTrainer ? 'checked' : ''}><span>Yes</span></label>
                        <label class="radio-option"><input type="radio" name="edit-iosh-approved" value="no" ${!p.ioshApprovedTrainer ? 'checked' : ''}><span>No</span></label>
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-label">Qualifications</label>
                    <div class="checkbox-grid">
                        <label class="checkbox-option"><input type="checkbox" name="edit-qual" value="iosh-train-trainer" ${p.qualifications?.includes('iosh-train-trainer') ? 'checked' : ''}><span>Train the Trainer</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-qual" value="aet-ptlls" ${p.qualifications?.includes('aet-ptlls') ? 'checked' : ''}><span>AET/PTLLS</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-qual" value="nebosh-gc" ${p.qualifications?.includes('nebosh-gc') ? 'checked' : ''}><span>NEBOSH GC</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-qual" value="nebosh-diploma" ${p.qualifications?.includes('nebosh-diploma') ? 'checked' : ''}><span>NEBOSH Diploma</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-qual" value="iosh-level3" ${p.qualifications?.includes('iosh-level3') ? 'checked' : ''}><span>IOSH L3</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-qual" value="iosh-level6" ${p.qualifications?.includes('iosh-level6') ? 'checked' : ''}><span>IOSH L6</span></label>
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-label">Courses</label>
                    <div class="checkbox-grid">
                        <label class="checkbox-option"><input type="checkbox" name="edit-courses" value="managing-safely" ${p.coursesCanDeliver?.includes('managing-safely') ? 'checked' : ''}><span>Managing Safely</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-courses" value="working-safely" ${p.coursesCanDeliver?.includes('working-safely') ? 'checked' : ''}><span>Working Safely</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-courses" value="managing-safely-refresher" ${p.coursesCanDeliver?.includes('managing-safely-refresher') ? 'checked' : ''}><span>MS Refresher</span></label>
                        <label class="checkbox-option"><input type="checkbox" name="edit-courses" value="leading-safely" ${p.coursesCanDeliver?.includes('leading-safely') ? 'checked' : ''}><span>Leading Safely</span></label>
                    </div>
                    <input type="text" id="edit-other-courses" class="form-input" style="margin-top:0.5rem" value="${p.otherCourses?.join(', ') || ''}" placeholder="Other courses">
                </div>

                <div class="form-row-2">
                    <div class="form-group">
                        <label class="small-label">Training exp (yrs)</label>
                        <input type="number" id="edit-training-years" class="form-input" value="${p.trainingYearsExperience || 0}">
                    </div>
                    <div class="form-group">
                        <label class="small-label">H&S sector (yrs)</label>
                        <input type="number" id="edit-hs-years" class="form-input" value="${p.hsSectorYears || 0}">
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-label">Bio</label>
                    <textarea id="edit-bio" rows="2" class="form-textarea">${p.bio || ''}</textarea>
                </div>

                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="closeEditProfileModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="updateTrainerProfile()">Save</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('edit-photo-input').onchange = handlePhotoUpload;
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal')?.remove();
    uploadedPhotoURL = null;
}

async function updateTrainerProfile() {
    const data = {
        ioshMembership: document.getElementById('edit-iosh-membership').value,
        ioshApprovedTrainer: document.querySelector('input[name="edit-iosh-approved"]:checked')?.value === 'yes',
        qualifications: Array.from(document.querySelectorAll('input[name="edit-qual"]:checked')).map(c => c.value),
        coursesCanDeliver: Array.from(document.querySelectorAll('input[name="edit-courses"]:checked')).map(c => c.value),
        otherCourses: document.getElementById('edit-other-courses').value.split(',').map(s => s.trim()).filter(Boolean),
        trainingYearsExperience: parseInt(document.getElementById('edit-training-years').value) || 0,
        hsSectorYears: parseInt(document.getElementById('edit-hs-years').value) || 0,
        bio: document.getElementById('edit-bio').value,
        profileUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (uploadedPhotoURL) data.photoURL = uploadedPhotoURL;
    
    try {
        await db.collection('users').doc(state.currentUser.uid).update(data);
        state.userProfile = { ...state.userProfile, ...data };
        closeEditProfileModal();
        showToast('Profile updated', 'success');
        renderTrainerProfileCard();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function renderTrainerProfileCard() {
    const p = state.userProfile;
    const container = document.getElementById('trainer-profile-card');
    if (!container) return;
    
    const labels = { none: 'No Membership', affiliate: 'Affiliate', tech: 'Tech IOSH', grad: 'Grad IOSH', cert: 'Cert IOSH', cmiosh: 'CMIOSH', cfiosh: 'CFIOSH' };
    
    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-photo">
                ${p.photoURL ? `<img src="${p.photoURL}" alt="${p.name}">` : `<div class="photo-placeholder-large">${p.name?.charAt(0) || '?'}</div>`}
            </div>
            <div class="profile-info">
                <h3>${p.name}</h3>
                <p class="profile-membership">${labels[p.ioshMembership] || 'Not specified'}</p>
                ${p.ioshApprovedTrainer ? '<span class="badge badge-success">IOSH Approved</span>' : ''}
                <p class="profile-experience">${p.trainingYearsExperience || 0} yrs training exp</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="showEditProfileModal()">Edit Profile</button>
        </div>
    `;
}

window.showProfileSetupModal = showProfileSetupModal;
window.saveTrainerProfile = saveTrainerProfile;
window.showEditProfileModal = showEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.updateTrainerProfile = updateTrainerProfile;
window.renderTrainerProfileCard = renderTrainerProfileCard;
