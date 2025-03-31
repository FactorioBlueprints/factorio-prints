#!/bin/bash

set -exuo pipefail

git pushf open-source HEAD:factorio-prints.com \
	&& git pushf open-source HEAD:factorio-prints.com \
	&& npm install --no-optional --ignore-engines --ignore-platform --ignore-scripts \
	&& npm run build \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git pushf open-source prod -f
