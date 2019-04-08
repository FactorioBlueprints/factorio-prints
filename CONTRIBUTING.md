### Development Build

#### Install node.js.

https://nodejs.org/en/

#### Install yarn package manager

https://yarnpkg.com/en/docs/install

#### Install some command line tools that are node packages

```bash
yarn global add \
	firebase-tools@latest \
	create-react-app@latest \
	react-scripts@latest \
	antlr4@latest \
	eslint@latest \
	eslint-plugin-babel@latest \
	eslint-plugin-lodash@latest \
	eslint-plugin-no-loops@latest \
	eslint-plugin-promise@latest
```

Run the dev build:

```bash
yarn run start
```

This will build the app, run it on localhost:3000, and open a browser. The app will be connecting to the production database.

### Production build

Run the commands:

```bash
bash deploy.sh
```
