#!/bin/bash

set -exuo pipefail

DATE_TAG="prod.$(date +%Y-%m-%d)"

git pushf open-source HEAD:factorio-prints.com \
	&& git pushf open-source HEAD:factorio-prints.com \
	&& npm install --ignore-scripts --legacy-peer-deps \
	&& npm run build \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git tag "$DATE_TAG" HEAD -f \
	&& git push open-source prod -f \
	&& git push open-source "$DATE_TAG" -f
