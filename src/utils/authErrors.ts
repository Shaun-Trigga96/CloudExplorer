// src/utils/authErrors.ts
export const authErrorMessages: { [key: string]: string } = {
    'auth/email-already-in-use': 'This email address is already in use.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'The password you entered is incorrect.',
    'auth/network-request-failed': 'Network error. Please check connection.',
    '1001': 'Sign-in cancelled.',
    'SIGN_IN_CANCELLED': 'Sign-in cancelled.',
    'network error': 'Internet connection required for sign-in.',
  };