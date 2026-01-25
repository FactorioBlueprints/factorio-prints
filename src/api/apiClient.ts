import axios, {type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig} from 'axios';

const PRIMARY_URL = 'https://factorioprints.xyz';
const FALLBACK_URL = 'https://factorio.school';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
	_retryWithFallback?: boolean;
	_originalBaseURL?: string;
}

function shouldFallback(error: AxiosError): boolean {
	if (!error.response) {
		return true;
	}
	const status = error.response.status;
	return status >= 500 && status < 600;
}

function createApiClient(): AxiosInstance {
	const instance = axios.create({
		baseURL: PRIMARY_URL,
	});

	instance.interceptors.response.use(
		(response) => response,
		async (error: AxiosError) => {
			const config = error.config as ExtendedAxiosRequestConfig | undefined;

			if (!config || config._retryWithFallback) {
				return Promise.reject(error);
			}

			if (!shouldFallback(error)) {
				return Promise.reject(error);
			}

			config._retryWithFallback = true;
			config._originalBaseURL = config.baseURL;
			config.baseURL = FALLBACK_URL;

			if (config.url?.startsWith(PRIMARY_URL)) {
				config.url = config.url.replace(PRIMARY_URL, FALLBACK_URL);
			}

			console.info(`[API] Primary server unavailable, falling back to ${FALLBACK_URL}`);

			return instance.request(config);
		},
	);

	return instance;
}

const apiClient = createApiClient();

export {PRIMARY_URL, FALLBACK_URL};
export default apiClient;
