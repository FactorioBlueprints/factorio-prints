git push -f origin HEAD:master && yarn install && yarn run build && firebase deploy && git tag prod HEAD -f && git push origin prod -f
