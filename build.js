const fs = require("fs")
const { registerTransforms } = require('@tokens-studio/sd-transforms')
const StyleDictionary = require('style-dictionary')

registerTransforms(StyleDictionary)

const log = (obj) => console.dir(obj, { depth: null })

const tokenFile = "./style-dictionary/tokens/tokens.json"

const kebabCase = str => str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .join('-')
    .toLowerCase();

function MergeRecursive(obj1, obj2) {
  for (var p in obj2) {
    try {
      // Property in destination object set; update its value.
      if ( obj2[p].constructor==Object ) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      // Property in destination object not set; create it and set its value.
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

function writeThemeTokenFiles(tokenFile) {
  const filestream = fs.readFileSync(tokenFile)
  const tokenConfig = JSON.parse(filestream)
  const themeNames = tokenConfig.$themes.map((theme) => theme.name)
  const tokenSetOrder = tokenConfig.$metadata.tokenSetOrder

  log(`Processing ${tokenFile} with token set order:`)
  log(tokenSetOrder)

  for (let themeName of themeNames) {
    const themeTokenSets = tokenConfig.$themes.find((c) => c.name == themeName).selectedTokenSets
    log(themeName)
    log(themeTokenSets)

    const theme = {}
    tokenSetOrder.forEach(
      (tokenset) => {
        console.log(`Processing ${tokenset}...`)
        const enabled = themeTokenSets[tokenset]
        if (enabled && enabled[tokenset] !== 'disabled') {
          // add it
          for (let [key, value] of Object.entries(tokenConfig[tokenset])) {
            log(key)
            if (theme[key]) {
              theme[key] = MergeRecursive(theme[key], value)
            } else {
              theme[key] = value;
            }
          }
        }
      }
    );
    const tokenJSON = JSON.stringify(theme)
    fs.writeFileSync(`${kebabCase(themeName)}.json`, tokenJSON);
  }
  return themeNames.map(kebabCase);
}

const themeNames = writeThemeTokenFiles(tokenFile);

themeNames.forEach((themeName) => {
  const sd = StyleDictionary.extend({
    source: [`${themeName}.json`],
    platforms: {
      js: {
        transformGroup: 'tokens-studio',
        prefix: "nh",
        buildPath: `build/${themeName}/js/`,
        "files": [
          {
            "format": "javascript/module",
            "destination": "variables.js"
          },
          {
            "format": "typescript/module-declarations",
            "destination": "variables.d.ts"
          }
        ]
      },
      css: {
        transforms: [
          'ts/descriptionToComment',
          'ts/size/px',
          'ts/opacity',
          'ts/size/lineheight',
          'ts/type/fontWeight',
          'ts/resolveMath',
          'ts/size/css/letterspacing',
          'ts/typography/css/shorthand',
          'ts/border/css/shorthand',
          'ts/shadow/css/shorthand',
          'ts/color/css/hexrgba',
          'ts/color/modifiers',
          'name/cti/kebab',
        ],
        prefix: "nh",
        buildPath: `build/${themeName}/css/`,
        files: [
          {
            destination: 'variables.css',
            format: 'css/variables',
            options: {
              "outputReferences": true
            }
          },
        ],
      },
    },
  });
  sd.cleanAllPlatforms();
  sd.buildAllPlatforms();
})