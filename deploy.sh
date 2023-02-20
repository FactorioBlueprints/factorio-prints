git pushf open-source HEAD:factorio-prints.com \
	&& git pushf open-source HEAD:factorio-prints.com \
	&& yarn install \
	&& yarn run build \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git pushf open-source prod -f
