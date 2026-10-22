import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',testMatch:'browser.spec.ts',workers:1,use:{baseURL:'http://127.0.0.1:8765',headless:true},webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:8765/dist/website/',reuseExistingServer:!process.env.CI},reporter:'list'});
