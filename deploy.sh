git push -f origin HEAD:master \
	&& yarn install \
	&& yarn run build \
	&& rm build/static/css/main.*.css.map build/static/js/main.*.js.map \
	&& firebase deploy \
	&& git tag prod HEAD -f \
	&& git push origin prod -f
