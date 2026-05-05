export const AppConstants = {
  Firebase: {
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'partyplay-8',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1003126250476:web:6914df967838f18ffa7ec9',
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://partyplay-8-default-rtdb.firebaseio.com',
  },
  URLs: {
    privacyPolicy: 'https://www.playvirals.com/privacy.html',
    termsOfService: 'https://www.playvirals.com/terms.html',
    marketingSite: 'https://www.playvirals.com',
  },
  Invite: {
    allowedHosts: ['playvirals.com', 'www.playvirals.com', 'app.playvirals.com'],
    inviteScheme: 'invite',
  },
  RevenueCat: {
    apiKeyIOS: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '',
    apiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '',
  },
  Gemini: {
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  },
  Economy: {
    dailyReward: 5,
    inviteReward: 10,
    aiCardCostFree: 5,
    aiCardCostPremium: 1,
    freeAIGenerationsPerDay: 5,
  },
  Game: {
    minPlayersForMultiplayer: 2,
    maxPlayersPerRoom: 12,
    roomCodeLength: 6,
    sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  },
};
