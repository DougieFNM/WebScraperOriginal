// const pup = require('puppeteer');
import puppeteer from "puppeteer";
import fs from "fs/promises";
import {Gmg_Async, URL_TYPE_CONFIG_CALLBACKS, PUPGMO, SAN, GmgBrowser} from "./helper.mjs";
import path from "path";
import {fileURLToPath} from "url";
import ObjectsToCsv from "objects-to-csv";
import {GmgProductScraper} from "./gmgBrandScraper.mjs";
import {ImageHelper} from "./ImageHelper.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// console.log(__filename);
// console.log(__dirname);


export class BasicScraper {

    scrapeName;
    contentMap;
    contentType;
    urls;
    testUrls;
    _content = [];
    _imageContent = {};
    _imageContentId = 1;

    _fileContent = [];

    __imageMap = {};
    __currentObj = {};

    processArguments;

    _isDebugMode = false;

    _UP_DIR = './uploads/SITE_CONTENT/';
    _IM_DIR = './uploads/SITE_CONTENT_IMAGES/';


    constructor(configurationJson, pargs) {
        this.contentType = configurationJson.hasOwnProperty("content_type") ? configurationJson["content_type"] : "blog" ;
        this.scrapeName = configurationJson["scrapeName"];
        this.contentMap = configurationJson["content_mapping"];
        this.urls = configurationJson["urls"];
        if (pargs.includes('--dev') || pargs.includes('-d')) {
            this._isDebugMode = true;
        }

        this.processArguments = pargs;

        if (configurationJson.hasOwnProperty("test_urls")) {
            this.testUrls = configurationJson["test_urls"];
        }


    // TODO: CHANGE THIS TO ALLOW MULTIPLE CONFIGS and ALLOW JUST ARRAY IN productList etc
    }

    async _init() {
        if (this._isDebugMode) {
            console.log("Debug Mode is on");
            await Gmg_Async.ss(3);
        }
        if (this.contentType === "blog") {
            await this._scrapeBlogPosts();
        } else if (this.contentType === "faq") {
            await this._scrapeBlogPosts(true);
        }
    }

    async logDebug(theLog) {
        if (this._isDebugMode) {console.log(theLog)}
    }

    async _scrapeBlogPosts(singlePosts=false) {
        const browser = await puppeteer.launch(GmgProductScraper.launchOpts(false));
        const page = await browser.newPage();
        let theUrls = this._isDebugMode ? this.testUrls : this.urls;

        let totalUrls = theUrls.length;

        if (totalUrls > 0) {

            let containerCss = this.contentMap["container"];
            let htmlCss={}, textCss={}, imageMap = {};
            let fileContentId = 1, imageContentId = 1;
            if (this.contentMap.hasOwnProperty('html')) {
                htmlCss = this.contentMap['html'];
            }

            if (this.contentMap.hasOwnProperty('text')) {
                textCss = this.contentMap['text'];
            }

            if (this.contentMap.hasOwnProperty('images')) {

                let tempImageMap = this.contentMap['images'];

                if (tempImageMap.hasOwnProperty("css")) {
                    this.__imageMap = tempImageMap;
                }
            }

            if (singlePosts) {
                for (const singlePostUrl in theUrls) {
                    let postUrl = theUrls[singlePostUrl];
                    await page.goto(postUrl, {waitUntil: 'load', timeout: 0});
                    await page.waitForSelector(containerCss);
                    let blogPostContent = await page.$$(containerCss) ;
                    if (blogPostContent.length > 0) {
                        console.log(`Getting url ${blogPostContent.length} posts from url ${postUrl}`);
                        for (const blogPostContentKey in blogPostContent) {
                            this.__currentObj = {"page_url": postUrl};
                            let postElement = blogPostContent[blogPostContentKey]
                            // console.log(blogPostContent);
                            if (postElement !== null && postElement !== "") {
                                await this.grabHtmlOrTextItems(htmlCss, postElement);
                                await this.grabHtmlOrTextItems(textCss, postElement, true);
                                await this.grabImageMap(postElement);

                            }

                            this._content.push(this.__currentObj);
                        }
                    }

                }
            } else {

                for (const blogUrlId in theUrls) {
                    let blogUrl = theUrls[blogUrlId];
                    await page.goto(blogUrl, {waitUntil: 'load', timeout: 0});
                    await page.waitForSelector(containerCss);
                    let blogPostContent = await page.$(containerCss) ;
                    console.log(`Getting url ${blogUrlId + 1} of ${totalUrls}`);
                    this.__currentObj = {
                        "url": blogUrl
                    };
                    if (blogPostContent !== null && blogPostContent !== "") {
                        await this.grabHtmlOrTextItems(htmlCss, blogPostContent);
                        await this.grabHtmlOrTextItems(textCss, blogPostContent, true);

                        await this.grabImageMap(blogPostContent);

                    }

                    this._content.push(this.__currentObj);

                }
            }

        }

        await browser.close();
        await this._siteContentFileCreate();
    }

    async _siteContentFileCreate() {

        let tstamp = new Date().getTime();
        let scrapeNameInternal = `${this.scrapeName}_${tstamp}`;
        let fileScrapeName = `${this._UP_DIR}${scrapeNameInternal}.csv`;
     
        const csv = new ObjectsToCsv(this._content);
        await csv.toDisk(fileScrapeName, {});

        console.log(this.processArguments.includes("--images"));
        console.log(Object.keys(this._imageContent).length > 0);

        if (Object.keys(this._imageContent).length > 0 && this.processArguments.includes("--images")) {
            console.log("Hit 1st Level");

            let ScrapeImgDir = `${this._IM_DIR}${scrapeNameInternal}`;
            await Gmg_Async.createDir(ScrapeImgDir);
            for (const imageId in this._imageContent) {
                let imgObj = this._imageContent[imageId];
                let itemIdDirectory = `${ScrapeImgDir}/${imageId}`
                await Gmg_Async.createDir(itemIdDirectory);
                for (const imgName in imgObj) {
                    let imgUrl = imgObj[imgName];
                    let imgSlug = await ImageHelper.sanitizeSlug(imgName);
                    let imgDownloadPath = `${itemIdDirectory}/${imgSlug}.jpg`;
                    console.log(imgDownloadPath);
                    await ImageHelper._streamImageToDiskHelper(imgUrl, imgDownloadPath);

                }
            }
        }
        
    }


    async grabSingleHtmlOrText (contentCss, postContent, isText=false) {

            let css = contentCss[hi];
            // let contentTitle = `HtmlContent_${i}`;
            console.log(`Looking ${hi} in css ${css}`);
            await Gmg_Async.s(500);
            let tempEl = await postContent.$$(css);
            if (tempEl.length > 0) {
                let value = "";
                for (const tempElKey in tempEl) {
                    let tempElementContent = tempEl[tempElKey];
                    let tempValue;
                    if (isText === true) {
                        tempValue = await tempElementContent.evaluate((element) => element.innerText);
                    } else {
                        tempValue = await tempElementContent.evaluate((element) => element.innerHTML);
                    }
                    // console.log(tempValue);
                    if (tempValue !== null && tempValue !== "") {
                        value += tempValue;
                    }
                }
                this.__currentObj[hi] = value;
                console.log(value);
            }
    }


    async grabHtmlOrTextItems (contentCss, postContent, isText=false) {
        if (Object.keys(contentCss).length > 0) {
            for (const hi in contentCss) {
                let css = contentCss[hi];
                // let contentTitle = `HtmlContent_${i}`;
                console.log(`Looking ${hi} in css ${css}`);
                await Gmg_Async.s(500);
                let tempEl = await postContent.$$(css);
                if (tempEl.length > 0) {
                    let value = "";
                    for (const tempElKey in tempEl) {
                        let tempElementContent = tempEl[tempElKey];
                        let tempValue;
                        if (isText === true) {
                            tempValue = await tempElementContent.evaluate((element) => element.innerText);
                        } else {
                            tempValue = await tempElementContent.evaluate((element) => element.innerHTML);
                        }
                        // console.log(tempValue);
                        if (tempValue !== null && tempValue !== "") {
                            value += tempValue;
                        }
                    }
                    this.__currentObj[hi] = value;
                    console.log(value);
                }
            }
        }
    }

    async grabImageMap(postContent) {
        if (Object.keys(this.__imageMap).length > 0) {

            // let contentTitle = `HtmlContent_${i}`;
            // await Gmg_Async.s(500);
            console.log(`Looking for images`);
            let imageContent = await postContent.$$(this.__imageMap["css"]);
            if (imageContent.length > 0) {
                let imgs = {};
                let i = 1;
                for (const tempElKey of imageContent) {
                    let imgSrc;
                    let imgName = this.__imageMap["title"] === "none" ? i : await (await tempElKey.getProperty(this.__imageMap["title"])).jsonValue();
                    imgSrc = await (await tempElKey.getProperty(this.__imageMap["src_attr"])).jsonValue();

                    imgs[imgName] = imgSrc;
                    i++;

                }
                console.log(imgs);
                this._imageContent[this._imageContentId] = imgs;
                this.__currentObj["imageId"] = this._imageContentId;
                this.__currentObj["imageContent"] = JSON.stringify(imgs);
                this._imageContentId++;
            } else {
                console.log("No Images found");
            }


        }
    }





}
