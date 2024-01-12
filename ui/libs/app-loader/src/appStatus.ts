import {
  DisabledAppReason,
  AppInfo,
} from "@holochain/client";
export function isAppRunning(app: AppInfo): boolean {
  return Object.keys(app.status).includes("running");
}

export function isAppDisabled(app: AppInfo): boolean {
  return Object.keys(app.status).includes("disabled");
}

export function isAppPaused(app: AppInfo): boolean {
  return Object.keys(app.status).includes("paused");
}

export function getStatus(app: AppInfo): string {
  if (isAppRunning(app)) {
    return "RUNNING"
  } else if (isAppDisabled(app)) {
    return "DISABLED"
  } else if (isAppPaused(app)) {
    return "PAUSED"
  } else {
    return "UNKNOWN"
  }
}

/**
 * TODO: This doesn't seem to be used...
 */
export function getReason(app: AppInfo): string | undefined {
  if (isAppRunning(app)) return undefined;
  if (isAppDisabled(app)) {
    const reason = (
      app.status as unknown as {
        disabled: {
          reason: DisabledAppReason;
        };
      }
    ).disabled.reason;

    if ((reason as any) === "never_started") {
      return "App was never started";
    } else if ((reason as any) === "user") {
      return "App was disabled by the user";
    } else {
      return `There was an error with this app: ${
        (
          reason as {
            error: string;
          }
        ).error
      }`;
    }
  } else {
    return (
      app.status as unknown as {
        paused: { reason: { error: string } };
      }
    ).paused.reason.error;
  }
}
