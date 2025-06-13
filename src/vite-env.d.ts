/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_VERSION: string;
	readonly DEV: boolean;
	// Add other env variables as needed
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
