interface ReleaseInfo {
	version: string;
	gitCommit: string;
	gitBranch: string;
	buildTime: string;
	environment: string;
	isDevelopment: boolean;
	isProduction: boolean;
	isPreview: boolean;
}

const parseGitDescribe = (gitDescribe: string): {tag: string; commitsSince: number; commitHash: string} => {
	const parts = gitDescribe.split('-');
	if (parts.length === 1) {
		return {tag: parts[0], commitsSince: 0, commitHash: parts[0]};
	}
	if (parts.length === 3) {
		return {
			tag: parts[0],
			commitsSince: Number.parseInt(parts[1], 10),
			commitHash: parts[2].replace('g', ''),
		};
	}
	return {tag: gitDescribe, commitsSince: 0, commitHash: gitDescribe};
};

export const getReleaseInfo = (): ReleaseInfo => {
	const gitDescribe = import.meta.env.VITE_APP_VERSION || '0.0.0-unknown';
	const {tag, commitsSince, commitHash} = parseGitDescribe(gitDescribe);

	const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
	const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
	const isPreview = import.meta.env.MODE === 'preview';

	let environment = 'development';
	if (isProduction && window.location.hostname === 'factorioprints.com') {
		environment = 'production';
	} else if (isProduction && window.location.hostname.includes('cloudflare')) {
		environment = 'preview';
	} else if (isPreview) {
		environment = 'preview';
	} else if (window.location.hostname === 'localhost') {
		environment = 'development';
	}

	const version = commitsSince > 0 ? `${tag}+${commitsSince}.${commitHash}` : tag;

	return {
		version,
		gitCommit: commitHash,
		gitBranch: import.meta.env.VITE_GIT_BRANCH || 'unknown',
		buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
		environment,
		isDevelopment,
		isProduction,
		isPreview,
	};
};

export const formatReleaseDisplay = (info: ReleaseInfo): string => {
	if (info.isDevelopment) {
		return `${info.version} (dev)`;
	}
	return info.version;
};

export const getReleaseMetadata = (): Record<string, string | boolean | number> => {
	const info = getReleaseInfo();
	return {
		version: info.version,
		commit: info.gitCommit,
		branch: info.gitBranch,
		buildTime: info.buildTime,
		environment: info.environment,
		isDevelopment: info.isDevelopment,
		isProduction: info.isProduction,
		isPreview: info.isPreview,
	};
};
