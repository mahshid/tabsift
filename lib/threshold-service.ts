import { storage } from "wxt/utils/storage";

import { DEFAULT_THRESHOLD, THRESHOLD_OPTIONS, THRESHOLD_STORAGE_KEY } from "./constants";

export function isValidThreshold(value: number): boolean {
    return THRESHOLD_OPTIONS.some(
        (option) => option.value === value,
    );
}

export async function getSavedThreshold(): Promise<number> {
    const saved = await storage.getItem<number>(THRESHOLD_STORAGE_KEY);

    if (saved !== null && isValidThreshold(saved)) return saved;

    return DEFAULT_THRESHOLD;
}

export async function saveThreshold(value: number): Promise<void> {
    if (!isValidThreshold(value)) {
        throw new Error("Invalid threshold value");
    }

    await storage.setItem(THRESHOLD_STORAGE_KEY, value);
}