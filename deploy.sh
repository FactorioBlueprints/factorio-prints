git push -f github HEAD:master && yarn install && yarn run build && firebase deploy && git tag prod HEAD -f && git push github prod -f
