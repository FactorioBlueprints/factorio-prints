#!/bin/bash

set -exuo pipefail

git pushf open-source HEAD:factorio-prints.com \
	&& git pushf open-source HEAD:factorio-prints.com \
	&& yarn install --ignore-optional --ignore-engines --ignore--platform --ignore-scripts \
	&& yarn run build \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git pushf open-source prod -f
