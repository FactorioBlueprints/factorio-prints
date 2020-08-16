git pushf origin HEAD:stable \
	&& git pushf github HEAD:stable \
	&& yarn install \
	&& GENERATE_SOURCEMAP=false yarn run build \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git pushf origin prod -f
