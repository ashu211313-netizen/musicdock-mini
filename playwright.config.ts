import {defineConfig} from '@playwright/test';
const baseURL=`http://127.0.0.1:${process.env.MUSICDOCK_PORT || 8765}`;
export default defineConfig({testDir:'tests',testMatch:'browser.spec.ts',workers:1,use:{baseURL,headless:true},webServer:process.env.MUSICDOCK_EXTERNAL_SERVER ? undefined : {command:'node scripts/serve.mjs',url:`${baseURL}/dist/website/`,reuseExistingServer:!process.env.CI},reporter:'list'});
