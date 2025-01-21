// const pup = require('puppeteer');
import puppeteer from "puppeteer";
import fs from "fs/promises";
import {Gmg_Async, URL_TYPE_CONFIG_CALLBACKS, PUPGMO, SAN, GmgBrowser} from "./helper.mjs";
import axios from "axios";
import path from "path";
import {fileURLToPath} from "url";
import * as process from "process";
import ObjectsToCsv from "objects-to-csv";
import csvToJson from "convert-csv-to-json";
import {ImageHelper} from "./ImageHelper.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// console.log(__filename);
// console.log(__dirname);

const STANTS = {
    'catSort': {
        "GLOG": [["Product > Hearth > Log Set & Burner"], ["Design Style"]],
        'FP': [["Product > Hearth", "Fuel Type"], ["Product Type", "Fuel Type", "Design Style"]],
        'OUT': [["Product > Hearth > Outdoor", "Fuel Type"], ["Product Type", "Fuel Type", "Design Style"]],
        "GRILLS": [["Product > Grill", "Fuel Type"], ["Product Type", "Fuel Type", "Design Style"]],
        "ACCESS": [["Product > Hearth > Hearth Accessory"], ["Product Type", "Design Style"]],
        "PF": [["Product > Outdoor Living", "Collection"], ["Product Type", "Collection", "Material Type", "Design Style"]],
        "OK": [["Product > Outdoor Living > Kitchen"], ["Product Type", "Design Style"]]
    }
}

const addAttr = function(title, value, i=0) {

    const ln = `Attribute ${i} name`,lv = `Attribute ${i} value(s)`,lis = `Attribute ${i} visible`,lg = `Attribute ${i} global`;
    return {[ln]: title, [lv]: value, [lis]: 1, [lg]: 1};
}

const addCat = function(parent, category) {
    return `${parent} > ${category}`;
}

export class GmgProductScraper {

    _products = [];
    _tempProducts = [];
    plistConfig;
    plistFields;
    ppageConfig;
    ppageFields;
    config;

    _UP_DIR = './uploads/';


    constructor(configurationJson, pargs) {
        this.processArguments = pargs;
        this.config = configurationJson;
        this.plistConfig = configurationJson["productList"];
        this.plistFields = Array.isArray(this.plistConfig) ? this.plistConfig[1] : this.plistConfig["fields"];
        if (configurationJson.hasOwnProperty("productPage")) {
            this.ppageConfig = configurationJson["productPage"] ;
            this.ppageFields = this.ppageConfig["fields"];
        }
    // TODO: CHANGE THIS TO ALLOW MULTIPLE CONFIGS and ALLOW JUST ARRAY IN productList etc
    }

    static launchOpts (headless=false) {
        return {headless: headless, ignoreHTTPSErrors: true, defaultViewport: null}
    }

    get BDIR () {
        return `${this._UP_DIR}${this.config["slug_name"]}`;
    }

    async init () {
        const browser = await puppeteer.launch(GmgProductScraper.launchOpts(false));
        const page = await browser.newPage();

        if (this.config.hasOwnProperty("login")) {
            let logconf = this.config["login"];
            await page.goto(logconf["url"]);
            await page.waitForSelector(logconf["wrapper"]);
            await page.type(logconf["username"][0], logconf["username"][1]);
            await Gmg_Async.ss(2);
            await page.type(logconf["password"][0], logconf["password"][1]);
            await Gmg_Async.ss(2);
            await page.click(logconf["button"][0]);
            await Gmg_Async.ss(5);
        }

        let BRAND_DIR = `${this._UP_DIR}/${this.config["slug_name"]}`;
        // console.log(`Brand Dir: ${BRAND_DIR}`);
        await Gmg_Async.createDir(BRAND_DIR);

        //TODO if the config file has baseUrls then go through each as a category,
        // Otherwise just us the baseUrl for each "wrapper"
        if (this.config.hasOwnProperty("baseUrls")) {
            let baseUrls = this.config["baseUrls"];
            console.log(baseUrls);
            for await (const [cat, url] of Object.entries(baseUrls)) {
                console.log(`Running category: ${cat} under URL: ${url}`);
                await this.productScrapeFromUrl(browser, page, this.plistConfig["wrapper"], url, cat);
            }
        } else {
            for (const category in this.plistConfig["wrapper"]) {
                await this.productScrapeFromUrl(browser, page, this.plistConfig["wrapper"][category], this.config["baseUrl"], category);
            }
        }

        if (this.config.hasOwnProperty('singleProductUrls')) {

        }

        await Gmg_Async._writeToFile(this._products, `${BRAND_DIR}/current_products.json`)
        if (this.processArguments.includes("--uploads")) {
            await this.initImages(false);
        }

        await this.importify(false);

        // TODO: Wrapper category used if baseUrls is not found
        process.exit();

        console.log(this._products);
    }

    async productScrapeFromUrl(browser, page, plistwrapper, url, cat) {

        // console.log(`Beginning Process: ${process.pid} PPID: ${process.ppid}`)

        await page.goto(url, {waitUntil: 'load', timeout: 0});
        await page.waitForSelector(plistwrapper);


        let productCards = await page.$$(plistwrapper);
        console.log(`Products found: ${productCards.length} in category ${cat}`);

        if (productCards.length !== 0) {
            let productCategories = await this.convertCategoryToTags(this.config, cat);

            // if (!this.plistFields.hasOwnProperty("productUrl")) {
            //     console.log("The product list config must have a productUrl Field");
            // }
            let BRAND_PATH = path.resolve(__dirname, this._UP_DIR, this.config["slug_name"]);
            console.log(`Brand Path: ${BRAND_PATH}`);


            let productNumber = 1;
            // let pathCallback = URL_TYPE_CONFIG_CALLBACKS[urlType];
            for (const e in productCards) {
                let productElement = productCards[e],
                    theProduct = {
                        "imageUrls": []
                    },
                    shouldGather = true;

                if (this.plistFields.hasOwnProperty("dont_gather")) {
                    //TODO: If there is a certain take that can stop you from gathering these items.
                    if (Array.isArray(this.plistFields["dont_gather"])) {
                        let no_gathers = this.plistFields["dont_gather"];
                        if (typeof no_gathers[0] === "string") {
                            shouldGather = await Gmg_Async.booleanCallback(productElement, this.plistFields["dont_gather"]);
                        } else if (typeof no_gathers[0] === "number") {
                            console.log(no_gathers);
                            if (no_gathers.includes(productNumber)) {
                                shouldGather = false;
                            }
                        }
                    }
                }

                if (shouldGather) {

                    // theProduct["name"] = await PUPGMO.innerText(productElement, this.plistFields["name"]);
                    if (this.plistFields.hasOwnProperty("name")) {
                        try {
                            theProduct["name"] = await PUPGMO.innerHtml(productElement, this.plistFields["name"]);
                            theProduct["slug"] = theProduct["name"].toLowerCase().replaceAll(" ", "-")
                                .replaceAll("™", "")
                                .replaceAll("®", "")
                                .replaceAll("/", "-")
                                .replaceAll(",", "_")
                                .replaceAll("\"", "")
                                .replaceAll("' ", " ft")
                            ;
                        } catch (e) {
                            theProduct["name"] = "None";
                        }
                    }

                    if (this.plistFields.hasOwnProperty("thumb")) {
                        // theProduct["thumbnailUrl"] = await Gmg_Async.propertyCallback(productElement, this.plistFields["thumb"])
                        try {
                            let thumbnailUrl = await Gmg_Async.propertyCallback(productElement, this.plistFields["thumb"]);
                            theProduct["imageUrls"].push(thumbnailUrl);
                            console.log(theProduct);
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    if (this.plistFields.hasOwnProperty("short_tags")) {
                        theProduct["short_tags"] = await PUPGMO.innerHtml(productElement, this.plistFields["short_tags"]);
                    }
                    if (this.plistFields.hasOwnProperty("productId")) {
                        theProduct["productId"] = await Gmg_Async.propertyCallback(productElement, this.plistFields["productId"]);
                    }
                    if (this.plistFields.hasOwnProperty("description")) {
                        theProduct["description"] = await PUPGMO.innerText(productElement, this.plistFields["description"]);
                    }

                    if (this.plistFields.hasOwnProperty("short_description")) {
                        theProduct["short_description"] = await PUPGMO.innerText(productElement, this.plistFields["short_description"]);
                    }

                    if (this.plistFields.hasOwnProperty("sku") && await productElement.$(this.plistFields["sku"])) {
                        // console.log(await productElement.$(this.plistFields["sku"]));
                        theProduct["sku"] = await PUPGMO.innerText(productElement, this.plistFields["sku"]);
                    }

                    // TODO: Add price here also

                    if (this.plistFields.hasOwnProperty("in_stock")) {
                        theProduct["in_stock"] = await Gmg_Async.booleanCallback(productElement, this.plistFields["in_stock"]);
                    }



                    if (this.plistFields.hasOwnProperty("productUrl")) {
                        theProduct["productUrl"] = await Gmg_Async.propertyCallback(productElement, this.plistFields["productUrl"]);
                    } else if (this.plistFields.hasOwnProperty("productUrlAttr")) {
                        let prodUrl = this.plistFields["productUrlAttr"], urlElement = await productElement.$(prodUrl[1]);
                        const someUrl = await PUPGMO.battr(urlElement, prodUrl[0])
                        theProduct["productUrl"] =  prodUrl[2] + someUrl;
                    } else if (this.plistFields.hasOwnProperty("productDetailsSection")) {
                        let productDetailsSection = this.plistFields["productDetailsSection"], productDetailsWrapper = productDetailsSection["wrapper"];
                        let productDetailsCss = await Gmg_Async.getAttr(productElement, productDetailsWrapper[0], productDetailsWrapper[1]);
                        let temporaryProductArea = await page.$(`${productDetailsWrapper[2]}${productDetailsCss}`);
                        console.log(productDetailsCss);
                        theProduct["detail"] = await PUPGMO.innerHtml(temporaryProductArea, productDetailsSection["detail"]);
                    }
                    // console.log(theProduct);
                    this._tempProducts.push({...theProduct, ...productCategories});
                }

                console.log(theProduct);

                productNumber++;

            }

            // TODO : Create a json file that holds all this information first, prompting the user to then gather the rest of the information

            // PRODUCT SKIMMING

            if (this.ppageFields !== undefined && this.ppageConfig) {
                const doNotGatherValue = this.ppageFields.hasOwnProperty("do_not_gather_urls_with") ? this.ppageFields["do_not_gather_urls_with"] : null;
                // TODO: Click Data?
                // TODO: FOR EACH PRODUCT WE CREATED, GO TO EACH PAGE AND SCRAPE MORE DATA
                for (let product in this._tempProducts) {
                    let p = this._tempProducts[product];
                    console.log(p);
                    if (p.hasOwnProperty("productUrl")) {
                        let currentProductUrl = p["productUrl"];
                        if (doNotGatherValue === null || currentProductUrl.indexOf(doNotGatherValue) < 0) {
                            try {
                                let productPage = await browser.newPage();
                                console.log(p["productUrl"]);
                                await productPage.goto(p["productUrl"], {waitUntil: 'load', timeout: 0});
                                if (this.ppageConfig.hasOwnProperty("waitForTime")) {
                                    await Gmg_Async.ss(this.ppageConfig["waitForTime"]);
                                } else if (this.ppageConfig.hasOwnProperty("delay")) {
                                    await Gmg_Async.ss(this.ppageConfig["delay"]);
                                }
                                await productPage.waitForSelector(this.ppageConfig["wrapper"]);
                                let productPageElement;
                                if (this.ppageConfig.hasOwnProperty("page") && this.ppageConfig["page"]) {
                                    productPageElement = productPage;
                                } else {
                                    productPageElement = await productPage.$(this.ppageConfig["wrapper"]);
                                    if (productPageElement) {
                                        console.log(`Container "${this.ppageConfig["wrapper"]}" found`)
                                    } else {
                                        console.log("Container not found");
                                    }
                                }

                                let theProduct = await this.normalProductChecks(p, productPageElement);
                                console.log(theProduct);

                                this._products.push(theProduct);
                                await Gmg_Async.ss(3);
                                await productPage.close();
                            } catch (e) {
                                console.error(e);
                            }
                        } else {
                            this._products.push(p);
                        }

                        // console.log(theProduct);
                    }
                    // let productPath = await Gmg.productElement.$()
                }
                //Reset the temporary Products just in case

            } else {
                for (let product in this._tempProducts) {
                    let p = this._tempProducts[product];
                    console.log(p);
                    this._products.push(p);
                }
            }
            this._tempProducts = [];
        } else {
            console.error("For some reason the products could not be found in: \r\n", `Wrapper: ${plistwrapper}`);
        }

    }

    async normalProductChecks(productObj, productElement) {

        let gather = true;
        if (this.ppageFields.hasOwnProperty("gather_element")) {
            gather = false;
            let productGather = await productElement.$(this.ppageFields["gather_element"]);
            // console.log(productGather);
            if (productGather) {
                gather = true;
            }
        }

        if (gather) {
            const CHECK_BOOLEAN = "in_stock";
            if (this.ppageFields.hasOwnProperty(CHECK_BOOLEAN)) {
                productObj[CHECK_BOOLEAN] = await Gmg_Async.booleanCallback(productElement, this.ppageFields[CHECK_BOOLEAN]);
            }

            if (this.ppageFields.hasOwnProperty("productId")) {
                productObj["productId"] = await Gmg_Async.propertyCallback(productElement, this.ppageFields["productId"])
            }

            const GET_TEXT_FIELDS = ["secondary_name", "name", "price", "sku",
                "weight_kg", "weight", "length_cm", "width_cm",
                "height_cm", "productId", "secondary_name",
                "text_short_description", "text_description", "model_id"];
            for (const fieldKey of GET_TEXT_FIELDS) {
                // let fieldKey = GET_TEXT_FIELDS[key];
                if (this.ppageFields.hasOwnProperty(fieldKey)) {
                    let fieldValue = this.ppageFields[fieldKey];

                    if (typeof fieldValue === "string" && fieldValue !== "") {
                        // TODO: Check if field exists
                        let fieldContext = await PUPGMO.innerText(productElement, fieldValue);
                        productObj[fieldKey] = fieldContext;
                    } else {
                        console.error(`The field value of the field ${fieldKey} needs to be a valid JSON string`);
                    }
                }
            }

            const GET_HTML_FIELDS = ["short_description", "description", "description_1", "file_html"];
            for (const fieldKey of GET_HTML_FIELDS) {
                // let fieldKey = GET_HTML_FIELDS[key];
                if (this.ppageFields.hasOwnProperty(fieldKey)) {
                    let fieldValue = this.ppageFields[fieldKey].split("?");
                    if (fieldValue.length > 1) {
                        for (let value in fieldValue) {
                            let foundElement = await productElement.$(fieldValue[value]);
                            if (foundElement) {
                                fieldValue = fieldValue[value]
                            }
                        }
                    } else {
                        fieldValue = fieldValue[0];
                        //
                        // let foundElement = await productElement.$(fieldValue);
                        // // if (!foundElement) {
                        // //     fieldValue = null;
                        // // }
                    }
                    if (typeof fieldValue === "string" && fieldValue !== "") {
                        // TODO: Check if field exists
                        let foundItem = await PUPGMO.innerHtml(productElement, fieldValue);
                        productObj[fieldKey] = foundItem;
                    }
                }
            }

            const GET_EVERYTHING = "all_description";

            if (this.ppageFields.hasOwnProperty(GET_EVERYTHING)){
                let everythingConfig = this.ppageFields[GET_EVERYTHING];

                let tempEl = await productElement.$$(everythingConfig[0]);
                if (tempEl.length > 0) {
                    let htmlValue = [];
                    if (everythingConfig.length > 1 && everythingConfig[1] === true) {
                        let i = 0;
                        for (const tempElKey in tempEl) {
                            let tempElementContent = tempEl[tempElKey];
                            let tempValue, tempName = "dataPiece"+i;

                            tempValue = await tempElementContent.evaluate((element) => element.innerText);
                            productObj[tempName] = tempValue;
                            i++;
                        }
                    } else {

                        for (const tempElKey in tempEl) {
                            let tempElementContent = tempEl[tempElKey];
                            let tempValue;

                            tempValue = await tempElementContent.evaluate((element) => element.innerText);
                            htmlValue.push(tempValue);
                        }

                        productObj["objDescription"] = htmlValue.join("<br>");
                    }
                }
            }

            if (this.ppageFields.hasOwnProperty("images")) {
                let imagesConfig = this.ppageFields["images"];
                if (Array.isArray(imagesConfig)) {
                    let moreImagesArray = await Gmg_Async.propertyCallback(productElement, imagesConfig, true);
                    if (moreImagesArray.length > 0) {
                        // Remember to reset the variable for concat
                        productObj["imageUrls"] = productObj["imageUrls"].concat(moreImagesArray);
                    }
                }
            }

            if (this.ppageFields.hasOwnProperty("background-image")) {
                let backImageItem = await productElement.$(this.ppageFields["background-image"]);
                let backgroundImage = await backImageItem.evaluate((el) => window.getComputedStyle(el).backgroundImage);
                let imgUrlSections = backgroundImage.split('"');
                let l = imgUrlSections.length > 0 ? imgUrlSections[1] : imgUrlSections[0];
                productObj["imageUrls"].push(l);
            }

            if (this.ppageFields.hasOwnProperty("more_images")) {
                let imagesConfig = this.ppageFields["more_images"];
                if (Array.isArray(imagesConfig)) {
                    let moreImagesArray = await Gmg_Async.propertyCallback(productElement, imagesConfig, true);
                    if (moreImagesArray.length > 0) {
                        // Remember to reset the variable for concat
                        productObj["imageUrls"] = productObj["imageUrls"].concat(moreImagesArray);
                    }
                }
            }

            if (this.ppageFields.hasOwnProperty("files")) {
                let fileConfig = this.ppageFields["files"];
                if (fileConfig.type === "list" && fileConfig.hasOwnProperty("wrapper")) {
                    let $fileWrappers = await productElement.$$(fileConfig.wrapper), productFiles = "";

                    if ($fileWrappers.length > 0 ) {
                        console.log($fileWrappers.length + " Files are on this page.")
                        if (fileConfig.hasOwnProperty("link_attr")) {
                            // Check for "name" or "name_attr"
                            let linkSelector, linkAttr, productFileArray = [];
                            [linkSelector, linkAttr] = fileConfig.link_attr

                            for (const $fileWrapper of $fileWrappers) {
                                // console.log($fileWrapper);
                                let fileText = await Gmg_Async.getInnerText($fileWrapper, fileConfig["name"]);
                                // console.log(fileText);
                                let theInformation = [
                                    fileText,
                                    await Gmg_Async.getAttrSimple($fileWrapper, linkSelector, linkAttr)
                                ];
                                console.log(theInformation);

                                // process.exit();
                                productFileArray.push(theInformation.join(";"))
                            }

                            if (productFileArray.length > 0) {
                                productFiles += productFileArray.join(",");
                            }
                        }
                    }
                    // Grab the wrapper
                    // For each item of the wrapper find the name and the link and join with a ";"
                    // Join the list of files with a ","
                    productObj["Meta: product_files_list"] = productFiles;
                } else {

                    let productFiles = await ImageHelper.basicFileScraper(productElement, fileConfig);
                    if (productFiles !== "") {
                        productObj["Meta: product_files"] = productFiles;
                    }
                }
            }

        }
        return productObj;


    }

    async getElementThatExists(productElement, fieldKey) {
        let fieldValue = this.ppageFields[fieldKey].split("?");
        console.log(fieldValue);
        if (fieldValue > 1) {
            for (let value in fieldValue) {
                let foundElement = await productElement.$(fieldValue[value]);
                if (foundElement) {
                    fieldValue = fieldValue[value];
                }
            }
        } else {
            fieldValue = fieldValue[0];
        }

        return fieldValue;
    }

    async convertCategoryToTags(brandConfig, category=null) {
        //
        const Z = ["Fuel Type"];
        // let splBy = category.indexOf('-') !== -1 ? '-' : ' ';
        let categoryArray = category === null ? brandConfig["categories"] : category.split("_");
        const catLeng = categoryArray.length;
        console.log(categoryArray);
        let brandName = brandConfig["name"], helpers, isFireProductAccessory;
        let tags = [brandName], categories = [addCat("Brand", brandName)], attributes = addAttr("Brand", brandName);
        if (catLeng > 0) {
            let id = categoryArray.shift();
            const categoryTargets = STANTS['catSort'];

            if (categoryTargets.hasOwnProperty(id) && catLeng >= 1) {
                // console.log("Hit the function part");
                if (id === "GLOG") {
                    let fuel = "Gas", hearthStyle = "Log Set & Burner";
                    categories.push(addCat(Z[0], fuel));
                    attributes = {...attributes, ...addAttr("Product Type", hearthStyle, catLeng+1)};
                }
                let ctarget = categoryTargets[id];
                let cats = ctarget[0], attrs = ctarget[1];

                await Gmg_Async.ss(5);

                for (let i = 0; i < catLeng; i++) {
                    if (cats.length > i) {
                        categories.push(addCat(cats[i], categoryArray[i]))
                    }
                    if (attrs.length > i) {
                        attributes = {...attributes, ...addAttr(attrs[i], categoryArray[i], i+1)};
                    }
                }

            } else if (categoryArray.length >= 1) {
                let titleAttribute = '';

            } else {
                console.error("Incorrect Category Type "+ id );
            }

        }

        const v = {"brand_sku": brandConfig["brand_sku"], "Tags" : tags.join(", "), "Categories": categories.join(", "), ...attributes};
        console.log(v);
        return v;
        // let defaultProduct = {type: "simple", tax_status: "taxable", published: 1, is_featured: 0, visible_catalog: "visible", allow_reviews: 1};
    }




    static skuify (skuFormat, product, brandId) {

        const MODIFIED_VALUES = {
            "name_lowercase_underscored": (prodArr) => prodArr["name"].toLowerCase().replaceAll(" ", "_"),
            "name_beginning": (prodArr) => prodArr["name"].split(" ")[0]
        }

        for (const modifiedValue of Object.keys(MODIFIED_VALUES)) {
            if (skuFormat.indexOf(modifiedValue) !== -1) {
                skuFormat = skuFormat.replaceAll(`%${modifiedValue}%`, MODIFIED_VALUES[modifiedValue](product));
            }
        }

        let skuString = `${brandId}-${skuFormat}`;
        console.log(skuString, skuFormat);
        product["sku_other"] = skuString;
        return product;
    }

    async importify(isInit = true) {
        let brand_dir = `${this._UP_DIR}${this.config["slug_name"]}`;
        let products = isInit
            ? await Gmg_Async._readFileToJson(`${brand_dir}/current_products.json`)
            : this._products;

        let csv_products_json = [];

        for (let p of products) {
            if (p.hasOwnProperty("imageUrls")) {
                let pim = p["imageUrls"], pimType = typeof pim;

                p["images"] = typeof p["imageUrls"] === "boolean" ? "" : (typeof p["imageUrls"] === "string" ? p["imageUrls"] : p["imageUrls"].join(","));
                delete p.imageUrls;
            }
            // if (p.hasOwnProperty("productUrl")) {delete p.productUrl;}
            if (p.hasOwnProperty("brand_id")) {delete p.brand_id;}
            if (p.hasOwnProperty("brand_url")) {delete p.brand_url;}
            if (p.hasOwnProperty("productUrl")) {
                p["Meta: product_url"] = p["productUrl"];
                delete p.productUrl;
            }
            if (p.hasOwnProperty("Attribute 0 value(s)") && p.hasOwnProperty("name")) {
                let brandName = p["Attribute 0 value(s)"], productName = p["name"];
                p["name"] =  `${brandName} - ${productName}`;
                p["old_name"] = productName;
            }

            if (p.hasOwnProperty("sku")) {
                // TODO: Generate sku here.
                p["sku"] = `${p["brand_sku"]}_${p["sku"]}`;
                delete p.brand_sku;
            } else {
                let oldName = p["old_name"].toUpperCase().replaceAll(" ", "")
                    .replaceAll("™", "")
                    .replaceAll("®", "")
                    .replaceAll("/", "")
                    .replaceAll(",", "")
                    .replaceAll("\"", "")
                    .replaceAll("' ", "");
                oldName.split(" ");
                let skuBuild="";
            }


            csv_products_json.push(p);
        }

        await Gmg_Async._writeToFile(csv_products_json, `${brand_dir}/import_current_products.json`);
        const csv = new ObjectsToCsv(csv_products_json);
        await csv.toDisk(`${brand_dir}/import_current_products.csv`, {});


    }


    async initImages(isInit=true, sanitizeUrl=false) {
        let brand_dir = `${this._UP_DIR}${this.config["slug_name"]}`;
        await Gmg_Async.createDir(brand_dir);

        let products = isInit
            ? await Gmg_Async._readFileToJson(`${brand_dir}/current_products.json`)
            : this._products;

        await ImageHelper.initImagesCollection(brand_dir, products);

        //TODO : Copy from above and work in this function for images
        // TODO: Exit code if not init
    }

    async basicImageScraper() {
        let brand_dir = `${this._UP_DIR}${this.config["slug_name"]}`;
        await Gmg_Async.createDir(brand_dir);

        const browser = await puppeteer.launch(GmgBrowser.launchOpts(false));

        if (this.config.hasOwnProperty('images')) {

            let imageConfig = this.config["images"], imgCount = 0, imgCallback;
            const sel = imageConfig["selector"], loc = imageConfig["location"] ?? "src";
            if (loc === "background-image") {
                imgCallback = async function (imgEl) {
                    let backgroundImage = await imgEl.evaluate((el) => window.getComputedStyle(el).backgroundImage);
                    let imgUrlSections = backgroundImage.split('"');
                    return imgUrlSections.length > 0 ? imgUrlSections[1] : imgUrlSections[0];
                }
            } else if (loc === "realsrc" || loc === "data-realsrc") {
                imgCallback = async function (imgEl) {
                    let val = await imgEl.evaluate((element) => element.getAttribute("data-realsrc"));
                    console.log(val);
                    return val;
                }
            } else if (loc === "href") {
                imgCallback = async function (imgEl) {
                    return await (await imgEl.getProperty("href")).jsonValue();
                }
            } else {
                imgCallback = async function (imgEl) {
                    return await (await imgEl.getProperty("src")).jsonValue();
                }
            }
            const page = await browser.newPage();
            if (imageConfig.hasOwnProperty("page")) {

                await ImageHelper.basicImageScraper(brand_dir, sel, imgCallback, imageConfig, page, this.config["slug_name"]);
            } else {

                await ImageHelper.productDataImageScraper(brand_dir, sel, imgCallback, imageConfig, page);

                // If the Page variable is not found we are going to be looping through the current products and will be scraping each photo individually
            }

        } else {
            console.log("No image config");
        }


        await browser.close();

    }

    async patioSortingFunction() {
        console.log(this.BDIR);
        const brandsDirectory = await fs.readdir(this.BDIR);
        const scrapeBrand = await Gmg_Async.createAsyChoiceList("What brand would you like to scrape?", brandsDirectory)
        const configFile = csvToJson.getJsonFromCsv(`${this.BDIR}/${scrapeBrand}`);


        // Choose the file
        // Choose the Column to use
        // Choose the
    }

}
