// functions/index.js (or functions/src/index.js if using TS source)
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize Admin SDK (runs only once on cold start)
try {
    if (admin.apps.length === 0) { // Prevent re-initialization
         admin.initializeApp();
    }
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
  const db = admin.firestore(); // Define db globally here
  const auth = admin.auth();    // Get Auth instance

// Set SendGrid API Key (ensure key is set in config: firebase functions:config:set sendgrid.key="YOUR_KEY")
try {
    // Use functions.config() safely
    const sendgridKey = functions.config().sendgrid?.key;
    if (sendgridKey) {
         sgMail.setApiKey(sendgridKey);
    } else if (process.env.NODE_ENV !== 'test') { // Don't warn during tests maybe
        console.warn('SendGrid API key (sendgrid.key) not found in Functions config.');
    }
} catch (e) {
    console.error('SendGrid API key configuration error.', e);
}


// --- Existing Callable Function ---
exports.updateEmailSubscription = functions.https.onCall(async (data, context) => {
  const { enabled } = data;
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userRef = admin.firestore().collection('users').doc(userId);

  try {
      const userDoc = await userRef.get(); // Check existence inside try/catch

      if (!userDoc.exists) {
         throw new functions.https.HttpsError('not-found', 'User not found.');
      }
      const user = userDoc.data();
      const email = user.email; // Assuming email exists

      if (enabled) {
          if (email) { // Only attempt send if email exists
              const msg = {
                to: email,
                from: 'cloudexplorer1996@gmail.com', // Replace with your verified SendGrid sender
                subject: 'Welcome to CloudExplorer Updates',
                text: 'You’ve subscribed to receive progress reports and tips!',
              };
              await sgMail.send(msg);
          } else {
               console.warn(`User ${userId} enabled email updates but has no email address.`);
          }
         await userRef.update({ 'settings.emailUpdates': true });
         return { message: 'Subscribed to email updates' };

      } else {
         await userRef.update({ 'settings.emailUpdates': false });
         return { message: 'Unsubscribed from email updates' };
      }
  } catch (error) {
       console.error("Error in updateEmailSubscription for user:", userId, error);
       if (error instanceof functions.https.HttpsError) {
           throw error; // Re-throw HttpsError
       }
       // Throw a generic internal error for other issues
       throw new functions.https.HttpsError('internal', 'An error occurred while updating email subscription.');
  }
});

// --- NEW Auth Trigger Function ---
exports.initializeNewUser = functions.auth.user().onCreate(async (user) => {
    functions.logger.log(`Initializing Firestore document for new user: ${user.uid} (${user.email})`);

    const db = admin.firestore(); // Get Firestore instance
    const userRef = db.collection('users').doc(user.uid);

    // Default data for a new user
    const newUserProfile = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || null, // TODO: Add your default avatar URL here
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        bio: '',
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        learningProgress: {
            completedModules: [],
            completedQuizzes: [],
            completedExams: [],
            score: 0,
        },
        settings: {
            notificationsEnabled: true,
            darkMode: false,
            emailUpdates: true, // Default to subscribed?
            syncData: true,
            soundEffects: false,
        },
         // Add 'role' field if using Firestore for roles (though custom claims often better)
        role: 'user',
    };

    try {
        await userRef.set(newUserProfile);
        functions.logger.log(`Successfully created Firestore user document for ${user.uid}`);
        // Optional: Create a welcome notification
        const notificationRef = db.collection('notifications').doc(); // Auto-ID
        await notificationRef.set({
             notificationId: notificationRef.id,
             userId: user.uid,
             title: 'Welcome to Cloud Explorer!',
             message: 'Start your cloud learning journey today!',
             type: 'welcome',
             read: false,
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.log(`Welcome notification created for ${user.uid}`);

    } catch (error) {
        functions.logger.error(`Error creating Firestore user document for ${user.uid}:`, error);
        // Consider adding more robust error handling/reporting if needed
    }
    // No return value needed for onCreate trigger usually
});