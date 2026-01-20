# TNH Scheduling - Setup Guide

This guide will walk you through setting up Firebase (for authentication and database) and EmailJS (for notifications).

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Enter project name: `tnh-scheduling` (or similar)
4. Disable Google Analytics (not needed) and click **Create**
5. Wait for the project to be created

---

## Step 2: Enable Authentication

1. In your Firebase project, click **"Build"** in the left sidebar
2. Click **"Authentication"**
3. Click **"Get started"**
4. Click **"Email/Password"** under "Native providers"
5. Toggle **"Enable"** to ON
6. Click **Save**

---

## Step 3: Create Firestore Database

1. Click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll secure it later)
4. Choose a location (e.g., `europe-west2` for UK)
5. Click **Enable**

---

## Step 4: Get Your Firebase Config

1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"**
4. Click the **web icon** `</>`
5. Enter app nickname: `TNH Scheduling`
6. **Don't** tick "Firebase Hosting"
7. Click **"Register app"**
8. You'll see a code block with `firebaseConfig` - copy these values

Your config will look like this:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyB.....................",
    authDomain: "tnh-scheduling.firebaseapp.com",
    projectId: "tnh-scheduling",
    storageBucket: "tnh-scheduling.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123..."
};
```

---

## Step 5: Update config.js

Open `js/config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

Also update:
```javascript
const appConfig = {
    initialAdminEmail: "your-actual-email@example.com",  // This will be the first admin
    companyName: "The Nuclear House",
    adminNotificationEmail: "admin@thenuclearhouse.com"
};
```

---

## Step 6: Set Up Firestore Security Rules

1. In Firebase Console, go to **Firestore Database**
2. Click the **"Rules"** tab
3. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users can read/write their own availability
    match /availability/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Allocations - admins can write, trainers can read their own and update status
    match /allocations/{allocId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow update: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true ||
        resource.data.trainerId == request.auth.uid
      );
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

4. Click **Publish**

---

## Step 7: Create Firestore Indexes

When you first use the app, you might see errors about missing indexes. Firebase will give you a link to create them. Alternatively, create them now:

1. Go to **Firestore Database** → **Indexes**
2. Click **"Create index"**
3. Create this index:
   - Collection: `allocations`
   - Fields: `trainerId` (Ascending), `date` (Ascending)
   - Query scope: Collection
4. Click **Create**

---

## Step 8: Set Up EmailJS (Optional - for notifications)

If you want email notifications when trainers are allocated:

1. Go to [EmailJS](https://www.emailjs.com/) and create a free account
2. Click **"Email Services"** → **"Add New Service"**
3. Choose your email provider (Gmail works well)
4. Follow the setup to connect your email
5. Note your **Service ID** (e.g., `service_abc123`)

6. Click **"Email Templates"** → **"Create New Template"**
7. Set up your template:
   - **Subject:** `Training Allocated: {{training_title}}`
   - **Body:**
   ```
   Hello {{trainer_name}},

   You have been allocated a training:

   Training: {{training_title}}
   Date: {{training_date}}

   {{message}}

   Please log in to TNH Scheduling to confirm your attendance.

   The Nuclear House
   ```
8. Note your **Template ID** (e.g., `template_xyz789`)

9. Go to **"Account"** → **"API Keys"**
10. Note your **Public Key**

11. Update `js/config.js`:
```javascript
const emailjsConfig = {
    publicKey: "YOUR_PUBLIC_KEY",
    serviceId: "YOUR_SERVICE_ID",
    templateId: "YOUR_TEMPLATE_ID"
};
```

---

## Step 9: Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g., `tnh-scheduling`)
2. Upload all the files:
   - `index.html`
   - `styles.css`
   - `js/` folder (with all .js files)
   - `assets/` folder (add your logo as `logo.png`)

3. Go to repository **Settings** → **Pages**
4. Under "Source", select **"Deploy from a branch"**
5. Choose **"main"** branch and **"/ (root)"** folder
6. Click **Save**

Your site will be live at: `https://yourusername.github.io/tnh-scheduling/`

---

## Step 10: Add Your Logo

1. Prepare your logo as `logo.png` (recommended: 120px height)
2. Add it to the `assets/` folder in your repository
3. The logo will automatically appear on the login page and header

---

## Testing the App

1. Visit your deployed site
2. Register with the email you set as `initialAdminEmail` - you'll automatically be an admin
3. Register another account to test as a trainer
4. As the trainer, mark some dates as available
5. As admin, go to "Allocate Training" and assign trainings

---

## Troubleshooting

**"Missing index" error:**
- Click the link in the browser console to create the required index

**Login not working:**
- Check that Authentication is enabled in Firebase
- Verify your `firebaseConfig` values are correct

**Data not saving:**
- Check Firestore rules are published
- Check browser console for permission errors

**Emails not sending:**
- EmailJS is optional - the app works without it
- Check your EmailJS dashboard for errors

---

## File Structure

```
tnh-scheduling/
├── index.html
├── styles.css
├── js/
│   ├── config.js      ← Your credentials go here
│   ├── utils.js
│   ├── auth.js
│   ├── trainer.js
│   ├── admin.js
│   └── app.js
└── assets/
    └── logo.png       ← Your logo
```

---

## Need Help?

If you run into issues, the most common fixes are:
1. Double-check your Firebase config values
2. Make sure Firestore rules are published
3. Create any missing indexes
4. Check the browser console (F12) for specific error messages
