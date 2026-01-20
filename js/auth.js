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
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        
        if (password.length < 6) {
            showAuthMessage('Password must be at least 6 characters.', 'error');
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
                showToast('Account created', 'success');
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
