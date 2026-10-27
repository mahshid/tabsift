import { browser, type Browser } from "wxt/browser";
import { getInactiveTabs } from "./tab-analyzer";

export async function getTabs(): Promise<Browser.tabs.Tab[]> {
    return browser.tabs.query({ windowType: "normal" });
}

export async function getTabCount(): Promise<number> {
    const tabs = await getTabs();

    return tabs.length;
}

export async function getForgottenTabs(thresholdMinutes: number): Promise<Browser.tabs.Tab[]> {
    const tabs = await getTabs();

    return getInactiveTabs(tabs, thresholdMinutes, Date.now());
}