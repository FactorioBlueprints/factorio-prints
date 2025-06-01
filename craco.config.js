const { ESLINT_MODES } = require("@craco/craco");
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

module.exports = {
    eslint: {
        mode: ESLINT_MODES.file
    },
    webpack: {
        configure: (webpackConfig) => {
            // Only add Sentry plugin if auth token is available
            if (process.env.SENTRY_AUTH_TOKEN) {
                webpackConfig.plugins.push(
                    sentryWebpackPlugin({
                        org: "factorio",
                        project: "factorio-prints",
                        authToken: process.env.SENTRY_AUTH_TOKEN,
                        release: {
                            name: process.env.REACT_APP_VERSION || 'unknown',
                            uploadLegacySourcemaps: {
                                paths: ["./build/static/js"],
                                ignore: ["node_modules"],
                            },
                        },
                        sourcemaps: {
                            deleteFilesAfterUpload: true,
                        },
                    })
                );
            }
            return webpackConfig;
        },
    },
};
