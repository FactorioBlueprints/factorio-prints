git push -f origin HEAD:stable \
	&& git push -f github HEAD:stable \
	&& yarn install \
	&& GENERATE_SOURCEMAP=false yarn run build \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git push origin prod -f
