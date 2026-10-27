export const THRESHOLD_STORAGE_KEY = "local:forgottenThreshold";

export const DEFAULT_THRESHOLD = 15;

export const THRESHOLD_OPTIONS = [
        { value: 5, label: "5 minutes" },
        { value: 15, label: "15 minutes" },
        { value: 30, label: "30 minutes" },
        { value: 60, label: "1 hour" },
        { value: 180, label: "3 hours" },
        { value: 1440, label: "1 day" },
] as const;