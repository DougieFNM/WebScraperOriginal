Hearth Scraper project built with NodeJs to incorporate Puppeteer

https://github.com/puppeteer/puppeteer

https://www.npmjs.com/package/puppeteer-extra

The projects above is a web based scraping software used by a ton of online bot scrapers to help with website automation

Project requires Node latest 17^
This means the latest stable version of Node 16
clone the repo, make sure node is installed on your local machine.
Then Run node install or npm install

----
### Adding a configuration file

Do not copy and paste this in a file for configuration it WILL NOT WORK. Please copy example_brand.config.json

```{
  "baseUrl": "[URL]:REQUIRED",
  "name": [NAME],
  "manufacturer": [MANUFACTURER],
  "slug_name": [LOWERCASE NAME]:REQUIRED,
  "brand_sku": [ABBR:3]:REQUIRED,
  "baseUrls": { "[CATEGORY_SLUG]:REQ": "[CATEGORY_SLUG_URL]:REQ" },
  "sku_parse": [SKU_PARSE_STRING]:REQ,
  "productList": {
    "wrapper": "[CSS SELECTOR CONTAINER]",
    "fields": {
      "name": "[CSS SELECTOR]",
      "productUrl": ["href", [CSS SELECTOR]],
      "thumb": ["currentSrc",[CSS SELECTOR]],
      "productId": ["attr", [CSS SELECTOR], [SANATATION_ARRAY], [ATTRIBUTE]],
      "in_stock": [["so" AND "sold-out" OR 'anythingelse'], [CSS SELECTOR]]
    }
  },
  "productPage": {
    "wrapper": "[CSS SELECTOR CONTAINER]",
    "fields": {
      "secondary_name": [CSS SELECTOR],
      "price": [CSS SELECTOR],
      "short_description": [CSS SELECTOR],
      "description": [CSS SELECTOR],
      "images": ["src", [CSS SELECTOR], [SANATATION_ARRAY]],
    }
  }
}
```

### Be sure to have a correct config
The following commands are able to be ran. Run the initial command:

```node .\init.mjs```

This will scrape the entire source of the config file. Adding the argument ```--uploads``` will also add all files and images scraped with those tags at the end of the process.


Running ```node .\init.mjs --images``` will **ONLY** upload the files saved in the current working brand's ***current_products.json*** file
