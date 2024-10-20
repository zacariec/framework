import { defineConfig } from './src/core/config';

export default defineConfig({
	framework: {
		port: 3111,
		environments: {
			development: {
				themeId: 431230000000123,
				accessToken: 'shptka_random_access_token',
				shopifyUrl: 'test.myshopify.com',
				input: './test',
				ignores: ['**/node_modules/**', '**/dist/**'],
				viteAssetDirectory: 'src',
			},
		},
	},
});
