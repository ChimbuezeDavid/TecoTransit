
'use server';

export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("Firebase API key is not configured.");
    return { success: false, error: "Server configuration error: Missing API key." };
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || 'An unknown error occurred.';
      console.error('Firebase Auth REST API error:', errorMessage);
      // Make error more user-friendly
      if (errorMessage.includes('EMAIL_NOT_FOUND')) {
        return { success: false, error: 'No account found with that email address.' };
      }
      return { success: false, error: `API Error: ${errorMessage}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Network error calling Firebase Auth REST API:', error);
    return { success: false, error: 'A network error occurred. Please try again.' };
  }
}
