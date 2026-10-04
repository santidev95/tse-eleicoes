import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'official-desktop',
      testMatch: ['tse-official.spec.ts', 'governors.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5176' },
    },
    {
      name: 'official-mobile',
      testMatch: ['tse-official.spec.ts', 'governors.spec.ts'],
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        baseURL: 'http://127.0.0.1:5176',
      },
    },
    {
      name: 'desktop',
      testMatch: 'election.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1004 } },
    },
    {
      name: 'mobile',
      testMatch: 'election.spec.ts',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'tse-proxy',
      testMatch: ['tse-errors.spec.ts', 'tse-simulation.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5174' },
    },
    {
      name: 'tse-sim-mobile',
      testMatch: 'tse-simulation.spec.ts',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        baseURL: 'http://127.0.0.1:5174',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',
      url: 'http://127.0.0.1:5176',
      reuseExistingServer: !process.env.CI,
      env: { VITE_ELECTION_DATA_SOURCE: 'tse' },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: !process.env.CI,
      env: { VITE_ELECTION_DATA_SOURCE: 'mock' },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: !process.env.CI,
      env: { VITE_ELECTION_DATA_SOURCE: 'tse-sim', VITE_TSE_PROXY_URL: '/api/tse/presidential' },
    },
  ],
})
