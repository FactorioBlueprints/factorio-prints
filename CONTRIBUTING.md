# Contributing

## Development build

### Install the toolchain

The preferred setup uses [mise](https://mise.jdx.dev/) to install the versions
of Node.js, Just, and Vite+ declared in `.mise/config.toml`:

```bash
mise install
vp install
```

Vite+ uses pnpm and the repository's `pnpm-lock.yaml` when it installs the root
dependencies. Do not run `npm install` in the repository root.

If you do not use mise, install [Node.js](https://nodejs.org/en/), Just, and the
Vite+ CLI globally, then run `vp install`.

### Run the development server

```bash
just dev
```

Or manually:

```bash
vp install
vp run dev
```

This will start the Vite dev server and run the app on localhost:5173. The app
will be connecting to the production database.

## Production build

Build and deploy with the Just recipes:

```bash
just build
just deploy
```

Or manually:

```bash
vp install
vp run build
vp run deploy:all
```

The Cloud Functions project under `functions/` intentionally retains its own npm
package and lockfile. The root deployment scripts install those dependencies
with npm before deploying.

## Validate changes

Run the same formatting, linting, type-checking, build, and test checks used
before committing:

```bash
just precommit
```

## View Firebase data

The Firebase CLI is installed with the root development dependencies and can be
run through Vite+:

```bash
just firebase-login
just database-export
```

Or manually:

```bash
vp install
vp exec firebase login
vp exec firebase database:get / > factorio-blueprints-export.json
```

Alternatively, install the
[Firebase CLI](https://firebase.google.com/docs/cli/) globally with
`npm install --global firebase-tools` and run the corresponding `firebase`
commands directly.

The firebase database is essentially one big JSON document, and asking to
download "/" is asking to download the whole thing. It will only download public
info, which means you might not have access to other users' favorites. If you
need the whole database to read and understand, @FactorioBlueprints can share a
copy. Here's some sample data.

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
      "tags": ["/power/solar/", "/general/tileable/", "/mods/vanilla/", "/version/0,15/"],
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
