/* TNH Scheduling - Trainer Profile System */

// Profile setup modal for new trainers
function showProfileSetupModal() {
    const modal = document.createElement('div');
    modal.id = 'profile-setup-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-profile">
            <h2>Complete Your Profile</h2>
            <p class="modal-subtitle">Please complete your profile before accessing the scheduling system.</p>
            
            <div class="profile-form">
                <!-- Photo Upload -->
                <div class="photo-upload-section">
                    <div class="photo-preview" id="photo-preview">
                        <span class="photo-placeholder">📷</span>
                    </div>
                    <div class="photo-upload-controls">
                        <label class="btn btn-secondary btn-sm">
                            Upload Photo
                            <input type="file" id="profile-photo-input" accept="image/*" hidden>
                        </label>
                        <p class="photo-hint">Professional headshot recommended</p>
                    </div>
                </div>

                <!-- IOSH Membership -->
                <div class="form-group">
                    <label>IOSH Membership Level *</label>
                    <select id="profile-iosh-membership" required>
                        <option value="">Select membership level...</option>
                        <option value="none">None</option>
                        <option value="affiliate">Affiliate / Student</option>
                        <option value="tech">Tech IOSH (Technical Member)</option>
                        <option value="grad">Grad IOSH (Graduate Member)</option>
                        <option value="cert">Cert IOSH (Certified Member)</option>
                        <option value="cmiosh">CMIOSH (Chartered Member)</option>
                    </select>
                </div>

                <!-- IOSH Trainer Approval -->
                <div class="form-group">
                    <label>Are you an IOSH Approved Trainer? *</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="iosh-approved" value="yes"> Yes
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="iosh-approved" value="no" checked> No
                        </label>
                    </div>
                </div>

                <!-- Training Qualifications -->
                <div class="form-group">
                    <label>Training Qualifications (select all that apply) *</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="qualifications" value="iosh-train-trainer"> IOSH Train the Trainer
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="qualifications" value="aet-ptlls"> Level 3 Award in Education & Training (AET/PTLLS)
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="qualifications" value="nebosh-gc"> NEBOSH General Certificate
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="qualifications" value="nebosh-diploma"> NEBOSH Diploma
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="qualifications" value="iosh-level3"> IOSH Level 3 Certificate
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="qualifications" value="iosh-level6"> IOSH Level 6 Diploma
                        </label>
                    </div>
                </div>

                <!-- Courses They Can Deliver -->
                <div class="form-group">
                    <label>Courses You Can Deliver *</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="courses" value="managing-safely"> IOSH Managing Safely
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="courses" value="working-safely"> IOSH Working Safely
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="courses" value="managing-safely-refresher"> IOSH Managing Safely Refresher
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="courses" value="leading-safely"> IOSH Leading Safely
                        </label>
                    </div>
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <input type="text" id="profile-other-courses" placeholder="Other courses (comma separated)">
                    </div>
                </div>

                <!-- Experience -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Years of Training Experience *</label>
                        <input type="number" id="profile-training-years" min="0" max="50" required placeholder="e.g., 5">
                    </div>
                    <div class="form-group">
                        <label>Years in H&S Sector *</label>
                        <input type="number" id="profile-hs-years" min="0" max="50" required placeholder="e.g., 10">
                    </div>
                </div>

                <!-- Bio -->
                <div class="form-group">
                    <label>Short Bio</label>
                    <textarea id="profile-bio" rows="3" placeholder="Brief description of your background and expertise..."></textarea>
                </div>

                <!-- Submit -->
                <div class="form-actions">
                    <button class="btn btn-primary btn-lg" onclick="saveTrainerProfile()">Save Profile & Continue</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Photo upload handler
    document.getElementById('profile-photo-input').onchange = handlePhotoUpload;
}

let uploadedPhotoURL = null;

async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
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
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = `<img src="${event.target.result}" alt="Profile preview">`;
    };
    reader.readAsDataURL(file);
    
    // Try to upload to Firebase Storage
    try {
        const storageRef = firebase.storage().ref();
        const photoRef = storageRef.child(`profile-photos/${state.currentUser.uid}`);
        
        showToast('Uploading photo...', 'info');
        await photoRef.put(file);
        uploadedPhotoURL = await photoRef.getDownloadURL();
        showToast('Photo uploaded', 'success');
    } catch (error) {
        console.log('Storage not available, using base64', error);
        // Fallback: store as base64 in Firestore (not ideal but works without Storage)
        uploadedPhotoURL = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }
}

async function saveTrainerProfile() {
    // Gather form data
    const membership = document.getElementById('profile-iosh-membership').value;
    const ioshApproved = document.querySelector('input[name="iosh-approved"]:checked')?.value === 'yes';
    const qualifications = Array.from(document.querySelectorAll('input[name="qualifications"]:checked')).map(cb => cb.value);
    const courses = Array.from(document.querySelectorAll('input[name="courses"]:checked')).map(cb => cb.value);
    const otherCourses = document.getElementById('profile-other-courses').value;
    const trainingYears = parseInt(document.getElementById('profile-training-years').value) || 0;
    const hsYears = parseInt(document.getElementById('profile-hs-years').value) || 0;
    const bio = document.getElementById('profile-bio').value;
    
    // Validation
    if (!membership) {
        showToast('Please select your IOSH membership level', 'error');
        return;
    }
    
    if (qualifications.length === 0) {
        showToast('Please select at least one qualification', 'error');
        return;
    }
    
    if (courses.length === 0) {
        showToast('Please select at least one course you can deliver', 'error');
        return;
    }
    
    if (!trainingYears && trainingYears !== 0) {
        showToast('Please enter your years of training experience', 'error');
        return;
    }
    
    // Save to Firestore
    try {
        const profileData = {
            ioshMembership: membership,
            ioshApprovedTrainer: ioshApproved,
            qualifications: qualifications,
            coursesCanDeliver: courses,
            otherCourses: otherCourses ? otherCourses.split(',').map(s => s.trim()) : [],
            trainingYearsExperience: trainingYears,
            hsSectorYears: hsYears,
            bio: bio,
            photoURL: uploadedPhotoURL || null,
            profileComplete: true,
            profileUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(state.currentUser.uid).update(profileData);
        
        // Update local state
        state.userProfile = { ...state.userProfile, ...profileData };
        
        // Remove modal and show trainer view
        document.getElementById('profile-setup-modal').remove();
        showToast('Profile saved successfully', 'success');
        initTrainerView();
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Error saving profile: ' + error.message, 'error');
    }
}

// Edit profile function (for existing trainers)
function showEditProfileModal() {
    const p = state.userProfile;
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
                <!-- Photo Upload -->
                <div class="photo-upload-section">
                    <div class="photo-preview" id="edit-photo-preview">
                        ${p.photoURL ? `<img src="${p.photoURL}" alt="Profile">` : '<span class="photo-placeholder">📷</span>'}
                    </div>
                    <div class="photo-upload-controls">
                        <label class="btn btn-secondary btn-sm">
                            Change Photo
                            <input type="file" id="edit-photo-input" accept="image/*" hidden>
                        </label>
                    </div>
                </div>

                <!-- IOSH Membership -->
                <div class="form-group">
                    <label>IOSH Membership Level</label>
                    <select id="edit-iosh-membership">
                        <option value="none" ${p.ioshMembership === 'none' ? 'selected' : ''}>None</option>
                        <option value="affiliate" ${p.ioshMembership === 'affiliate' ? 'selected' : ''}>Affiliate / Student</option>
                        <option value="tech" ${p.ioshMembership === 'tech' ? 'selected' : ''}>Tech IOSH</option>
                        <option value="grad" ${p.ioshMembership === 'grad' ? 'selected' : ''}>Grad IOSH</option>
                        <option value="cert" ${p.ioshMembership === 'cert' ? 'selected' : ''}>Cert IOSH</option>
                        <option value="cmiosh" ${p.ioshMembership === 'cmiosh' ? 'selected' : ''}>CMIOSH</option>
                    </select>
                </div>

                <!-- IOSH Trainer Approval -->
                <div class="form-group">
                    <label>IOSH Approved Trainer?</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="edit-iosh-approved" value="yes" ${p.ioshApprovedTrainer ? 'checked' : ''}> Yes
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="edit-iosh-approved" value="no" ${!p.ioshApprovedTrainer ? 'checked' : ''}> No
                        </label>
                    </div>
                </div>

                <!-- Qualifications -->
                <div class="form-group">
                    <label>Training Qualifications</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-qualifications" value="iosh-train-trainer" ${p.qualifications?.includes('iosh-train-trainer') ? 'checked' : ''}> IOSH Train the Trainer
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-qualifications" value="aet-ptlls" ${p.qualifications?.includes('aet-ptlls') ? 'checked' : ''}> Level 3 AET/PTLLS
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-qualifications" value="nebosh-gc" ${p.qualifications?.includes('nebosh-gc') ? 'checked' : ''}> NEBOSH General Certificate
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-qualifications" value="nebosh-diploma" ${p.qualifications?.includes('nebosh-diploma') ? 'checked' : ''}> NEBOSH Diploma
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-qualifications" value="iosh-level3" ${p.qualifications?.includes('iosh-level3') ? 'checked' : ''}> IOSH Level 3 Certificate
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-qualifications" value="iosh-level6" ${p.qualifications?.includes('iosh-level6') ? 'checked' : ''}> IOSH Level 6 Diploma
                        </label>
                    </div>
                </div>

                <!-- Courses -->
                <div class="form-group">
                    <label>Courses You Can Deliver</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-courses" value="managing-safely" ${p.coursesCanDeliver?.includes('managing-safely') ? 'checked' : ''}> IOSH Managing Safely
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-courses" value="working-safely" ${p.coursesCanDeliver?.includes('working-safely') ? 'checked' : ''}> IOSH Working Safely
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-courses" value="managing-safely-refresher" ${p.coursesCanDeliver?.includes('managing-safely-refresher') ? 'checked' : ''}> Managing Safely Refresher
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-courses" value="leading-safely" ${p.coursesCanDeliver?.includes('leading-safely') ? 'checked' : ''}> IOSH Leading Safely
                        </label>
                    </div>
                    <input type="text" id="edit-other-courses" placeholder="Other courses" value="${p.otherCourses?.join(', ') || ''}">
                </div>

                <!-- Experience -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Training Experience (years)</label>
                        <input type="number" id="edit-training-years" min="0" max="50" value="${p.trainingYearsExperience || 0}">
                    </div>
                    <div class="form-group">
                        <label>H&S Sector (years)</label>
                        <input type="number" id="edit-hs-years" min="0" max="50" value="${p.hsSectorYears || 0}">
                    </div>
                </div>

                <!-- Bio -->
                <div class="form-group">
                    <label>Short Bio</label>
                    <textarea id="edit-bio" rows="3">${p.bio || ''}</textarea>
                </div>

                <!-- Actions -->
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="closeEditProfileModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="updateTrainerProfile()">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Photo upload handler
    document.getElementById('edit-photo-input').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('edit-photo-preview').innerHTML = `<img src="${event.target.result}" alt="Profile">`;
        };
        reader.readAsDataURL(file);
        
        try {
            const storageRef = firebase.storage().ref();
            const photoRef = storageRef.child(`profile-photos/${state.currentUser.uid}`);
            await photoRef.put(file);
            uploadedPhotoURL = await photoRef.getDownloadURL();
            showToast('Photo uploaded', 'success');
        } catch (error) {
            uploadedPhotoURL = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }
    };
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.remove();
}

async function updateTrainerProfile() {
    const profileData = {
        ioshMembership: document.getElementById('edit-iosh-membership').value,
        ioshApprovedTrainer: document.querySelector('input[name="edit-iosh-approved"]:checked')?.value === 'yes',
        qualifications: Array.from(document.querySelectorAll('input[name="edit-qualifications"]:checked')).map(cb => cb.value),
        coursesCanDeliver: Array.from(document.querySelectorAll('input[name="edit-courses"]:checked')).map(cb => cb.value),
        otherCourses: document.getElementById('edit-other-courses').value.split(',').map(s => s.trim()).filter(s => s),
        trainingYearsExperience: parseInt(document.getElementById('edit-training-years').value) || 0,
        hsSectorYears: parseInt(document.getElementById('edit-hs-years').value) || 0,
        bio: document.getElementById('edit-bio').value,
        profileUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (uploadedPhotoURL) {
        profileData.photoURL = uploadedPhotoURL;
    }
    
    try {
        await db.collection('users').doc(state.currentUser.uid).update(profileData);
        state.userProfile = { ...state.userProfile, ...profileData };
        closeEditProfileModal();
        showToast('Profile updated', 'success');
        
        // Refresh trainer view header
        if (document.getElementById('trainer-profile-card')) {
            renderTrainerProfileCard();
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    }
}

// Render trainer profile card in trainer view
function renderTrainerProfileCard() {
    const p = state.userProfile;
    const container = document.getElementById('trainer-profile-card');
    if (!container) return;
    
    const membershipLabels = {
        'none': 'No IOSH Membership',
        'affiliate': 'Affiliate Member',
        'tech': 'Tech IOSH',
        'grad': 'Grad IOSH',
        'cert': 'Cert IOSH',
        'cmiosh': 'CMIOSH'
    };
    
    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-photo">
                ${p.photoURL ? `<img src="${p.photoURL}" alt="${p.name}">` : `<div class="photo-placeholder-large">${p.name?.charAt(0) || '?'}</div>`}
            </div>
            <div class="profile-info">
                <h3>${p.name}</h3>
                <p class="profile-membership">${membershipLabels[p.ioshMembership] || 'Not specified'}</p>
                ${p.ioshApprovedTrainer ? '<span class="badge badge-success">IOSH Approved Trainer</span>' : ''}
                <p class="profile-experience">${p.trainingYearsExperience || 0} years training experience</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="showEditProfileModal()">Edit Profile</button>
        </div>
    `;
}

// Make functions global
window.showProfileSetupModal = showProfileSetupModal;
window.saveTrainerProfile = saveTrainerProfile;
window.showEditProfileModal = showEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.updateTrainerProfile = updateTrainerProfile;
window.renderTrainerProfileCard = renderTrainerProfileCard;
