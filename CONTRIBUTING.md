### Development Build

Install node.js version 6.x.

https://nodejs.org/en/

Run the commands:

```bash
npm install
npm start
```

This will build the app, run it on localhost:3000, and open a browser. The app will be connecting to the production database.

### Production build

Run the commands:

```bash
npm run build
firebase deploy
```

### To see the firebase data

Install the [Firebase CLI](https://firebase.google.com/docs/cli/). 

```bash
npm install -g firebase-tools
firebase login
```

```bash
firebase database:get /
```

The firebase database is essentially one big json document, and asking to download "/" is asking to download the whole thing. It will only download public info which means you might not have access to other users' favorites. If you need the whole database to read and understand, @FactorioBlueprints can share a copy. Here's some sample data.

```json
{
  "blueprints" : {
    "-KYVL2qnlOpHomJAj-eB" : {
      "author" : {
        "displayName" : "Factorio Blueprints",
        "userId" : "H3QlaVpvadfVuTpGGxs7016oR2K3"
      },
      "blueprintString" : "H4sIAAAAAAAA/53c327 <snipped>",
      "createdDate" : 1481232629231,
      "descriptionMarkdown" : "*Pretty* close to perfect ratios, tileable, 100% space efficient. You can remove the roboports and replace them with accumulators to improve the ratio.",
      "favorites" : {
        "ENzfJCtGyUOchJw8Jzvqyp8J5bj2" : true,
        "H3QlaVpvadfVuTpGGxs7016oR2K3" : false,
        "QuLNeBP8k3bMQ4M0ji6k4VtIbB53" : true,
        "vD3BS94FIATJaUWLbhYId5PjdGv1" : false
      },
      "imageUrl" : "https://firebasestorage.googleapis.com/v0/b/facorio-blueprints.appspot.com/o/Zuris_Solar_Layout%5B1%5D.jpg?alt=media&token=3494c5fe-1dbc-46c3-8d40-83751c7e07b7",
      "lastUpdatedDate" : 1481232629231,
      "numberOfFavorites" : 2,
      "thumbnail" : "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD <snipped>",
      "title" : "MadZuri's Mk3 Solar Build"
    }
  },
  "moderators" : {
    "H3QlaVpvadfVuTpGGxs7016oR2K3" : true
  },
  "users" : {
    "H3QlaVpvadfVuTpGGxs7016oR2K3" : {
      "blueprints" : {
        "-KYVL2qnlOpHomJAj-eB" : true,
        "-KY_A4qxNbkiBv1yNPI5" : true,
        "-KY_BySvaQCx8DR0S_NZ" : true
      },
      "displayName" : "Factorio Blueprints",
      "email" : "factorio.prints@gmail.com",
      "favorites" : {
        "-KYVL2qnlOpHomJAj-eB" : false,
        "-KYbIg8cULtwPnFfpb7b" : true,
        "-KYeNAYQVgk2DcbuORde" : true,
        "-KYg29KBbu1eohSzp3gh" : true,
        "-KYg56ks0BIqpNvpIHFm" : true,
        "-KYpWpPzU2MW56wDabTt" : true
      },
      "photoURL" : "https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg"
    }
  }
}
```
