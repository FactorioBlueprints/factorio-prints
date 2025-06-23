#!/bin/bash

set -exuo pipefail

DATE_TAG="prod.$(date +%Y-%m-%d)"

git pushf open-source HEAD:factorio-prints.com \
	&& git pushf open-source HEAD:factorio-prints.com \
	&& git tag prod HEAD -f \
	&& git tag "$DATE_TAG" HEAD -f \
	&& npm run version:sync \
	&& npm install --ignore-scripts --legacy-peer-deps \
	&& op run -- npm run build \
	&& firebase deploy \
	&& git push open-source prod -f \
	&& git push open-source "$DATE_TAG" -f
