import { test } from '@playwright/test';
import {
  DESKTOP,
  MAIN_SCREENS,
  MOBILE,
  PROFILES,
  captureScreen,
  gotoScreen,
  installDeterminism,
  loginAndSeed,
  setOfflineState,
} from './visualTestUtils.js';

const STATES = ['empty', 'with-data', 'offline'];
const VIEWPORTS = [
  ['desktop', DESKTOP],
  ['mobile', MOBILE],
];

test.describe('visual regression de la app completa', () => {
  for (const [profileKey] of Object.entries(PROFILES)) {
    const screensForProfile = MAIN_SCREENS.filter((screen) => !screen.profiles || screen.profiles.includes(profileKey));

    for (const state of STATES) {
      test(`${profileKey} / ${state} / pantallas principales`, async ({ context, page }) => {
        test.slow();
        await installDeterminism(context, page, { profileKey });
        if (state !== 'offline') {
          await loginAndSeed(page, state);
        } else {
          await loginAndSeed(page, 'with-data');
          await setOfflineState(context, page);
        }

        for (const screen of screensForProfile.filter((item) => !item.states || item.states.includes(state))) {
          await test.step(screen.id, async () => {
            await gotoScreen(page, screen);

            for (const [viewportName, viewport] of VIEWPORTS) {
              await captureScreen(page, screen, profileKey, state, viewportName, viewport);
            }
          });
        }
      });
    }
  }
});
