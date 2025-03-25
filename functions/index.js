const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
sgMail.setApiKey(functions.config().sendgrid.key);

exports.updateEmailSubscription = functions.https.onCall(async (data, context) => {
  const { enabled } = data;
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }

  const user = userDoc.data();
  const email = user.email;

  if (enabled) {
    const msg = {
      to: email,
      from: 'cloudexplorer1996@gmail.com', // Replace with your verified SendGrid sender
      subject: 'Welcome to CloudExplorer Updates',
      text: 'You’ve subscribed to receive progress reports and tips!',
    };
    await sgMail.send(msg);
    await userRef.update({ 'settings.emailUpdates': true });
    return { message: 'Subscribed to email updates' };
  } else {
    await userRef.update({ 'settings.emailUpdates': false });
    return { message: 'Unsubscribed from email updates' };
  }
});