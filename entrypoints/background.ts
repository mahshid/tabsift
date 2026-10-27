import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";

import { getForgottenTabs } from "@/lib/tab-service";
import { getSavedThreshold } from "@/lib/threshold-service";
import { THRESHOLD_STORAGE_KEY } from "@/lib/constants";

const BADGE_ALARM = "refresh-forgotten-tabs";
const BADGE_COLOR = "#B7743B";

export default defineBackground(() => {
    let isRefreshing = false;
    let refreshPending = false;

    async function updateBadge(): Promise<void> {
        try {
            const threshold = await getSavedThreshold();
            const forgottenTabs = await getForgottenTabs(threshold);

            const count = forgottenTabs.length;
            const badgeText =
                count === 0 ? "" : count > 999 ? "999+" : String(count);

            await browser.action.setBadgeBackgroundColor({
                color: BADGE_COLOR,
            });

            await browser.action.setBadgeText({
                text: badgeText,
            });
        } catch (error) {
            console.error("Failed to update TabSift badge:", error);

            try {
                await browser.action.setBadgeText({ text: "" });
            } catch (badgeError) {
                console.error("Failed to clear badge:", badgeError);
            }
        }
    }

    async function processBadgeRefresh(): Promise<void> {
        isRefreshing = true;

        try {
            while (refreshPending) {
                refreshPending = false;
                await updateBadge();
            }
        } finally {
            isRefreshing = false;
        }
    }

    function refreshBadge(): void {
        refreshPending = true;

        if (!isRefreshing) {
            void processBadgeRefresh();
        }
    }

    browser.tabs.onCreated.addListener(refreshBadge);
    browser.tabs.onRemoved.addListener(refreshBadge);
    browser.tabs.onActivated.addListener(refreshBadge);
    browser.tabs.onUpdated.addListener(refreshBadge);
    browser.tabs.onAttached.addListener(refreshBadge);
    browser.tabs.onDetached.addListener(refreshBadge);

    storage.watch<number>(THRESHOLD_STORAGE_KEY, refreshBadge);

    browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === BADGE_ALARM) {
            refreshBadge();
        }
    });

    async function initializeBadge(): Promise<void> {
        refreshBadge();

        try {
            const existingAlarm = await browser.alarms.get(BADGE_ALARM);

            if (!existingAlarm) {
                await browser.alarms.create(BADGE_ALARM, {
                    periodInMinutes: 1,
                });
            }
        } catch (error) {
            console.error("Failed to initialize badge alarm:", error);
        }
    }

    void initializeBadge();
});
