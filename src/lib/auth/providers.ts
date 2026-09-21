export type AuthProviderConfig = {
  providerId: string;
  label: string;
};

export const AUTH_PROVIDERS: readonly AuthProviderConfig[] = [
  { providerId: "google", label: "Google" },
  { providerId: "twitter", label: "X" },
];
