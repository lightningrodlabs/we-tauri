export function getDevHubAppId(): string {
  if (process.env.HC_PORT !== undefined) return "DevHub";
  return "DevHub-0.0.143";
}
