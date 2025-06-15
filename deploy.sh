git pushf origin HEAD:stable \
	&& git pushf github HEAD:stable \
	&& npm install \
	&& GENERATE_SOURCEMAP=false npm run build \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git pushf origin prod -f
