export function getDevHubAppId(): string {
  if (import.meta.env.VITE_HC_PORT !== undefined) return "DevHub";
  return "DevHub-0.1.0-beta-rc.2";
}
