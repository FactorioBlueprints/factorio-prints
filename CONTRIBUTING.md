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
yarn run build
firebase deploy
```

### To see the firebase data

Install the [Firebase CLI](https://firebase.google.com/docs/cli/). 

```bash
npm install -g firebase-tools
firebase login
```

```bash
firebase database:get / > factorio-blueprints-export.json
```

The firebase database is essentially one big json document, and asking to download "/" is asking to download the whole thing. It will only download public info which means you might not have access to other users' favorites. If you need the whole database to read and understand, @FactorioBlueprints can share a copy. Here's some sample data.

```json
{
  "blueprintSummaries": {
    "-KYVL2qnlOpHomJAj-eB": {
      "imgurId": "l5ajJXt",
      "imgurType": "image/jpeg",
      "lastUpdatedDate": 1498010275386,
      "numberOfFavorites": 71,
      "title": "☀️ MadZuri's Mk3 Solar Build"
    }
  },
  "blueprints": {
    "-KYVL2qnlOpHomJAj-eB": {
      "author": {
        "userId": "H3QlaVpvadfVuTpGGxs7016oR2K3"
      },
      "authorId": "H3QlaVpvadfVuTpGGxs7016oR2K3",
      "blueprintString": "0eNqdnctuG0cQRX <snipped>",
      "createdDate": 1481232629231,
      "descriptionMarkdown": "*Pretty* close to perfect ratios, tileable, 100% space efficient.\n\nYou can remove the roboports and replace them with accumulators to improve the ratio.",
      "favorites": {
        "EuA0qrMegObNUi83yFVJllIgCAO2": true,
        "YZ79eCKXovfsxXD9fmNAuyd9mlc2": true,
        "gikbOCGvWwY7hiFgsIoZrxMh4x93": true,
        "yEkV5AJi4TdlypuvUIb1yqbiznG3": true,
        "zuzzQ4UJUleX2sWuorCTBET66Tq1": true
      },
      "image": {
        "deletehash": "<masked>",
        "height": 644,
        "id": "l5ajJXt",
        "type": "image/jpeg",
        "width": 645
      },
      "imageUrl": "https://firebasestorage.googleapis.com/v0/b/facorio-blueprints.appspot.com/o/Zuris_Solar_Layout%5B1%5D.jpg?alt=media&token=3494c5fe-1dbc-46c3-8d40-83751c7e07b7",
      "lastUpdatedDate": 1498010275386,
      "numberOfFavorites": 71,
      "tags": [
        "/power/solar/",
        "/general/tileable/",
        "/mods/vanilla/",
        "/version/0,15/"
      ],
      "title": "☀️ MadZuri's Mk3 Solar Build"
    }
  },
  "moderators": {
    "H3QlaVpvadfVuTpGGxs7016oR2K3": true
  },
  "users": {
    "H3QlaVpvadfVuTpGGxs7016oR2K3": {
      "blueprints": {
        "-KYVL2qnlOpHomJAj-eB": true,
        "-KY_A4qxNbkiBv1yNPI5": true
      },
      "displayName": "Factorio Blueprints",
      "email": "factorio.prints@gmail.com",
      "emailVerified": true,
      "favorites": {
        "-KYbIg8cULtwPnFfpb7b": true,
        "-KYpSfx8hRix5nVPBLwS": true
      },
      "photoURL": "https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg",
      "providerId": "google.com"
    }
  }
}
```
