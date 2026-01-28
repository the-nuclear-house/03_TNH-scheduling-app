/* TNH Scheduling - Configuration
   Replace placeholder values with your actual credentials */

const firebaseConfig = {
    apiKey: "AIzaSyDvoW0C-CLMkYRvFV-jdWKhny9wyEi5Y7A",
    authDomain: "tnh-scheduling-496b1.firebaseapp.com",
    projectId: "tnh-scheduling-496b1",
    storageBucket: "tnh-scheduling-496b1.firebasestorage.app",
    messagingSenderId: "872521888849",
    appId: "1:872521888849:web:2086a030296cc4fe457470"
};

const emailjsConfig = {
    publicKey: "4iRDEQGs9VZHFqh6Z",
    serviceId: "service_h8e7tei",
    templateId: "TNH_Newassignment",
    reminderTemplateId: "TNH_Reminder"
};

const appConfig = {
    initialAdminEmail: "login@thenuclearhouse.co.uk",
    companyName: "The Nuclear House",
    adminNotificationEmail: "login@thenuclearhouse.co.uk"
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
