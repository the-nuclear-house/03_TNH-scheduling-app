/* TNH Scheduling - Configuration
   Replace placeholder values with your actual credentials */

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const emailjsConfig = {
    publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
    serviceId: "YOUR_EMAILJS_SERVICE_ID",
    templateId: "YOUR_EMAILJS_TEMPLATE_ID"
};

const appConfig = {
    initialAdminEmail: "your-admin-email@example.com",
    companyName: "The Nuclear House",
    adminNotificationEmail: "admin@thenuclearhouse.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize EmailJS (will fail silently if not configured)
try {
    emailjs.init(emailjsConfig.publicKey);
} catch (e) {
    console.log('EmailJS not configured');
}
