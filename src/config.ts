const env = import.meta.env;

export const config = {
  apiBaseUrl: (env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
  googlePlayUrl:
    env.VITE_GOOGLE_PLAY_URL ??
    'https://play.google.com/store/apps/details?id=your.package',
  appStoreUrl: env.VITE_APP_STORE_URL ?? 'https://apps.apple.com/app/id000000000',
};
