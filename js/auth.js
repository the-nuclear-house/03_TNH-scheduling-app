/* TNH Scheduling - Authentication */

function initAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const resetForm = document.getElementById('reset-form');
    const authMessage = document.getElementById('auth-message');
    
    // Form toggles
    document.getElementById('show-register').onclick = (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        resetForm.classList.add('hidden');
        authMessage.classList.add('hidden');
    };
    
    document.getElementById('show-login').onclick = (e) => {
        e.preventDefault();
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        resetForm.classList.add('hidden');
        authMessage.classList.add('hidden');
    };
    
    document.getElementById('show-reset').onclick = (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        resetForm.classList.remove('hidden');
        authMessage.classList.add('hidden');
    };
    
    document.getElementById('show-login-from-reset').onclick = (e) => {
        e.preventDefault();
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        resetForm.classList.add('hidden');
        authMessage.classList.add('hidden');
    };
    
    // Login
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Signed in successfully', 'success');
        } catch (error) {
            showAuthMessage(getAuthError(error.code), 'error');
        }
    };
    
    // Register
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        clearFieldErrors();
        
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const emailConfirm = document.getElementById('register-email-confirm').value.trim();
        const phone = document.getElementById('register-phone').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        
        // Validation
        let hasErrors = false;
        
        if (!name) {
            showFieldError('register-name', 'Please enter your full name');
            hasErrors = true;
        }
        
        if (!email) {
            showFieldError('register-email', 'Please enter your email address');
            hasErrors = true;
        }
        
        if (email !== emailConfirm) {
            showFieldError('register-email-confirm', 'Email addresses do not match');
            hasErrors = true;
        }
        
        if (password.length < 6) {
            showFieldError('register-password', 'Password must be at least 6 characters');
            hasErrors = true;
        }
        
        if (password !== passwordConfirm) {
            showFieldError('register-password-confirm', 'Passwords do not match');
            hasErrors = true;
        }
        
        if (hasErrors) {
            showAuthMessage('Please fix the errors above', 'error');
            return;
        }
        
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            const isAdmin = email.toLowerCase() === appConfig.initialAdminEmail.toLowerCase();
            
            try {
                await db.collection('users').doc(cred.user.uid).set({
                    name, email, phone, isAdmin,
                    profileComplete: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Send email verification
                try {
                    await cred.user.sendEmailVerification();
                    showToast('Account created! Please check your email to verify.', 'success');
                } catch (verifyError) {
                    console.log('Email verification not sent:', verifyError);
                    showToast('Account created', 'success');
                }
            } catch (dbError) {
                console.error('Firestore error:', dbError);
                showAuthMessage(`Account created but profile save failed: ${dbError.message}`, 'error');
            }
        } catch (error) {
            console.error('Auth error:', error);
            showAuthMessage(getAuthError(error.code), 'error');
        }
    };
    
    // Password reset
    resetForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value;
        try {
            await auth.sendPasswordResetEmail(email);
            showAuthMessage('Reset email sent', 'success');
        } catch (error) {
            showAuthMessage(getAuthError(error.code), 'error');
        }
    };
    
    // Logout
    document.getElementById('logout-btn').onclick = () => auth.signOut();
    
    // Auth state listener
    auth.onAuthStateChanged(async (user) => {
        document.getElementById('loading-screen').classList.add('hidden');
        if (user) {
            state.currentUser = user;
            const doc = await db.collection('users').doc(user.uid).get();
            state.userProfile = doc.exists ? doc.data() : null;
            showApp();
        } else {
            state.currentUser = null;
            state.userProfile = null;
            showAuthScreen();
        }
    });
}

function showAuthMessage(msg, type) {
    const el = document.getElementById('auth-message');
    el.textContent = msg;
    el.className = `auth-message ${type}`;
    el.classList.remove('hidden');
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('field-error');
        // Add error message below field
        const existingError = field.parentNode.querySelector('.field-error-message');
        if (existingError) existingError.remove();
        
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error-message';
        errorEl.textContent = message;
        field.parentNode.appendChild(errorEl);
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    document.querySelectorAll('.field-error-message').forEach(el => el.remove());
}

function getAuthError(code) {
    const errors = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-not-found': 'No account found with this email. Please register first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes and try again.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
        'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Contact your administrator.'
    };
    return errors[code] || `Error: ${code || 'Unknown error. Please try again.'}`;
}

function showAuthScreen() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name').textContent = state.userProfile?.name || 'User';
    
    const badge = document.getElementById('user-role-badge');
    if (state.userProfile?.isAdmin) {
        badge.textContent = 'Admin';
        badge.classList.add('admin');
        document.getElementById('trainer-view').classList.add('hidden');
        document.getElementById('admin-view').classList.remove('hidden');
        initAdminView();
    } else {
        badge.textContent = 'Trainer';
        badge.classList.remove('admin');
        document.getElementById('trainer-view').classList.remove('hidden');
        document.getElementById('admin-view').classList.add('hidden');
        
        // Check if profile is complete
        if (!state.userProfile?.profileComplete) {
            showProfileSetupModal();
        } else {
            initTrainerView();
        }
    }
}
