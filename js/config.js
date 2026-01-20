/* TNH Scheduling - Configuration
   Replace placeholder values with your actual credentials */

const firebaseConfig = {
    apiKey: "AIzaSyBjQhx6zJ7IV80uDT778yBzk977YI1d9Zk",
    authDomain: "tnh-scheduling.firebaseapp.com",
    projectId: "tnh-scheduling",
    storageBucket: "tnh-scheduling.firebasestorage.app",
    messagingSenderId: "605173901124",
    appId: "1:605173901124:web:bda51b625d5f908bad1911"
};

const emailjsConfig = {
    publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
    serviceId: "YOUR_EMAILJS_SERVICE_ID",
    templateId: "YOUR_EMAILJS_TEMPLATE_ID"
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
