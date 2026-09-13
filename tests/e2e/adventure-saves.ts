import type { Page } from '@playwright/test';
import { campaignStorageKey, type CampaignProgress } from '../../src/adventure/campaign';
import { adventureStorageKey, type AdventureProgress } from '../../src/adventure/progress';

export async function readCampaign(page: Page): Promise<CampaignProgress> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), campaignStorageKey);
}
export async function readAdventure(page: Page): Promise<AdventureProgress> {
  const campaign = await readCampaign(page);
  return campaign.chapters[campaign.activeChapterId];
}
/** Explicitly exercise single-chapter migration, rather than overwrite the authoritative campaign. */
export async function seedLegacyAdventure(page: Page, progress: AdventureProgress) {
  await page.evaluate(({ campaignKey, legacyKey, progress }) => {
    localStorage.removeItem(campaignKey);
    localStorage.setItem(legacyKey, JSON.stringify(progress));
  }, { campaignKey: campaignStorageKey, legacyKey: adventureStorageKey, progress });
}
