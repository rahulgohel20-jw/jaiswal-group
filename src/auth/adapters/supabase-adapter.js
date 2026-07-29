/**
 * Legacy Supabase adapter removed.
 * The app now uses the custom auth flow based on local storage tokens.
 */
export const SupabaseAdapter = {
  async login() {
    throw new Error('Supabase auth is not enabled in this build.');
  },
  async signInWithOAuth() {
    throw new Error('Supabase auth is not enabled in this build.');
  },
  async register() {
    throw new Error('Supabase auth is not enabled in this build.');
  },
  async requestPasswordReset() {
    throw new Error('Supabase auth is not enabled in this build.');
  },
  async resetPassword() {
    throw new Error('Supabase auth is not enabled in this build.');
  },
  async resendVerificationEmail() {
    throw new Error('Supabase auth is not enabled in this build.');
  },
  async getCurrentUser() {
    return null;
  },
  async updateUserProfile() {
    return null;
  },
  async logout() {
    return null;
  },
  async isAvailable() {
    return false;
  },
};
