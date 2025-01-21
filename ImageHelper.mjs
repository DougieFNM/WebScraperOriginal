// DEBUG

import fs from "fs/promises";
import {createWriteStream} from "fs";
import crypto from "crypto";
import * as Path from "path";
import Axios from "axios";

import * as http from "http";
import * as https from "https";
import {Transform as Stream} from "node:stream";
import {Gmg_Async, GmgBrowser} from "./helper.mjs";
import puppeteer from "puppeteer";



// const ObjectsToCsv = require("objects-to-csv");
// const puppeteer = require("puppeteer");

export class ImageHelper {

    static BACKIMAGE = "background-image-css";

    static s = ms => new Promise(r => setTimeout(r, ms));
    static ss = seconds => new Promise(r => setTimeout(r, seconds*1000));

    static ValidFileExtensions = ['jpg', 'png', 'jpeg'];

    static generateKey(isCrypto=false) {
        return new Promise((resolve, reject) => {
            let num = isCrypto
                ? crypto.randomBytes(16).toString("base64")
                : Math.random().toString(36).substring(2, 9);
            resolve(num);
        });
    }

    static async sanitizeSlug(slug) {
        return slug.replaceAll("™", "")
            .replaceAll("®", "")
            .replaceAll("/", "_")
            .replaceAll("\"", "-")
            .replaceAll("(", "")
            .replaceAll(")", "")
            .replaceAll("[", "")
            .replaceAll("]", "")
            .replaceAll(" ", "")
        ;
    }



    static async getAttr(el, sel, type, sanitizations = ["trim"]) {
        let tempEl = sel === "self" ? el : await el.$(sel);
        let value = await tempEl.evaluate((element, s) => element.getAttribute(s), type)
        return Gmg_Async.sanitize(value, sanitizations);
    }

    static async imgUrlData(url, fileDir, slug) {
        let originalName = url.split('/').pop();
        let fileExtension = 'jpg';
        console.log("Original Name of File: ", originalName);
        // let fileExtension = originalName.split('.').pop().trim();
        if (originalName.indexOf('.png') >= 0) {
            fileExtension = "png";
        } else if (originalName.indexOf('.jpeg') >= 0) {
            fileExtension = 'jpeg';
        }
        return `${fileDir}/${slug}.${fileExtension}`;
    }

    static async dsfnds(fileDir, imageUrls, slug, id) {
        let createdTheDirectory = await Gmg_Async.createDirCheck(fileDir);
        // console.log(createdTheDirectory);
        if (createdTheDirectory === false) {
            let lenImageUrl = imageUrls.length, fileLen = (await fs.readdir(fileDir)).length;
            console.log(`File Len: ${fileLen}`);
            console.log(`Image Urls: ${lenImageUrl}`);
            if (fileLen >= lenImageUrl) {
                console.log(`Product slug: ${slug} looks to have already been created`);
                return false;
            } else {
                id = fileLen-1;
                imageUrls = imageUrls.slice(id, lenImageUrl-1);
                console.log(`Starting at element ${id} and ending at element ${lenImageUrl-1}`);
            }
        }
    }

    static async _streamImageToDiskHelper(url, filePath) {
        const writer = createWriteStream(filePath);

        const response = await Axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
            }
        });

        if (response.status !== 404) {
            await Gmg_Async.s(2000);

            response.data.pipe(writer);

        }

        return new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

    }


    static async _streamImageWithStream(url, filename) {

        let client = http;
        if (url.toString().indexOf("https") === 0){
            client = https;
        }

        client.request(url, function(response) {
            let data = new Stream();

            response.on('data', function(chunk) {
                data.push(chunk);
            });

            response.on('end', function() {
                fs.writeFile(filename, data.read());
            });
        }).end();
    };


    static async basicImageScraper(brand_dir, sel, imgCallback, imageConfig, page, slugName) {

        const naming = imageConfig["name"];
        await page.goto(imageConfig["page"]);
        await page.waitForSelector(sel);

        let imgElements = await page.$$(sel), imgCount = 0;
        console.log("Image count: "+imgElements.length);
        if (imgElements.length > 0) {
            for (const imgElement of imgElements) {
                let imgUrl = await imgCallback(imgElement);
                let imgName = null;

                if (imgUrl) {
                    console.log(imgUrl);
                    if (naming === "title") {
                        imgName = await imgElement.evaluate((element) => element.getAttribute("title"));
                        imgName = `${imgName}_${imgCount}`;
                        console.log(imgName);
                    } else if (naming === "alt") {
                        imgName = await imgElement.evaluate((element) => element.getAttribute("alt"));
                        imgName = `${imgName}_${imgCount}`;
                        console.log(imgName);
                    }

                    if (!imgName) {
                        imgName = `${slugName}_${imgCount}`;
                    } else {
                        imgName = await ImageHelper.sanitizeSlug(imgName);
                        console.log(imgName);
                    }
                    let filePath = await ImageHelper.imgUrlData(imgUrl, brand_dir, imgName);
                    if (filePath) {
                        await ImageHelper._streamImageToDiskHelper(imgUrl, filePath);
                        await Gmg_Async.ss(2);
                        imgCount++;
                    }
                } else {
                    console.log("A valid url was not found on this image");
                }

            }
        } else {
            console.log("No images found with config :");
            console.table(imageConfig);
        }

    }

    static async productDataImageScraper (brand_dir, sel, imgCallback, imageConfig, page) {
        // If the Page variable is not found we are going to be looping through the current products and will be scraping each photo individually

        let urlCollection = {};
        let products = await Gmg_Async._readFileToJson(`${brand_dir}/current_products.json`);
        const wrapper = imageConfig["wrapper"], max = imageConfig["max"] ?? 25;

        for (let p of products) {
            let productSlug = p["slug"];
            console.log(`Product Slug ${productSlug}`);
            if (p.hasOwnProperty("productUrl")) {
                await page.goto(p["productUrl"], {waitUntil: 'load', timeout: 0});
                await page.waitForSelector(wrapper);
                let productDir = `${brand_dir}/${productSlug}`;

                let allImages = await page.$$(sel);
                let created = await Gmg_Async.createDirCheck(productDir),
                    productDirectoryFiles = await fs.readdir(productDir);
                console.log(`There are ${allImages.length} photos found for slug ${productSlug}`);

                if (allImages.length > productDirectoryFiles.length) {
                    // TODO: Change to fori loop
                    urlCollection[productSlug] = [];
                    let  slugId = productDirectoryFiles.length, allImgLen = allImages.length;

                    for (let i = slugId; i < allImgLen; i++) {
                        let img = allImages[i], imgSlug = `${productSlug}_${i}`;

                        let imgUrl = await imgCallback(img);
                        if (max >= slugId && imgUrl.indexOf("https://") === 0) {
                            if (imgUrl.indexOf('?ext=.') > 0) {
                                imgUrl = imgUrl.replaceAll("?ext=.", "");
                            }

                            let filePath = await ImageHelper.imgUrlData(imgUrl, productDir, imgSlug);

                            // urlCollection[productSlug].append(imgUrl);
                            try {
                                await ImageHelper._streamImageToDiskHelper(imgUrl, filePath);
                                console.log(`URL : ${imgUrl}`);
                                console.log(`AddedTo : ${filePath}`);
                            } catch (e) {
                                await Gmg_Async.ss(10);
                                console.log(`Not added : ${imgUrl} \r\n\r\n ${filePath} \r\n\r\n`);
                                console.log(e);
                            }
                            slugId++;
                        }

                    }

                    if (slugId === 0) {
                        await Gmg_Async.removeDirectory(productDir);
                    }

                }


            } else {
                console.log(`No product images for product slug: ${productSlug}`)
            }

        }
    }


    static async initImagesCollection(brand_dir, productsCollection = null) {

        const ValidFileExtensions = ['jpg', 'png', 'jpeg', 'aspx'];

        for (let p of productsCollection) {
            // console.log(p);
            if (p.hasOwnProperty("slug")) {
                let slug = await ImageHelper.sanitizeSlug(p["slug"]);
                let i = 0;
                // let p = this._products[product];
                if (p.hasOwnProperty("imageUrls") && p["imageUrls"].length > 0) {
                    let fileDir = `${brand_dir}/${slug}`, alreadyComplete = false, imageUrls = p["imageUrls"];
                    let createdTheDirectory = await Gmg_Async.createDirCheck(fileDir);
                    // console.log(createdTheDirectory);
                    if (createdTheDirectory === false) {
                        let lenImageUrl = imageUrls.length, fileLen = (await fs.readdir(fileDir)).length;
                        console.log(`File Len: ${fileLen}`);
                        console.log(`Image Urls: ${lenImageUrl}`);
                        if (fileLen >= lenImageUrl) {
                            console.log(`Product slug: ${slug} looks to have already been created`);
                            alreadyComplete = true;
                        } else {
                            i = fileLen-1;
                            imageUrls = imageUrls.slice(i, lenImageUrl-1);
                            console.log(`Starting at element ${i} and ending at element ${lenImageUrl-1}`);
                        }
                    }

                    if (!alreadyComplete) {
                        for (let u of imageUrls) {
                            if (u !== "") {
                                u = u.split(",")[0];
                                console.log("Current Url:  ", u);
                                let originalName = u.split('/').pop();
                                console.log("Original Name of File: ", originalName);
                                let fileExtension = originalName.split('.').pop().trim();
                                if (!ValidFileExtensions.includes(fileExtension)) {
                                    fileExtension = ".jpg";
                                }

                                //TODO: Maybe check if this extension is supported?
                                let fileName = `${slug}_${i}.${fileExtension}`;
                                // if (await Gmg_Async.exists(fileDir)) {
                                // }
                                let filePath = `${fileDir}/${fileName}`;
                                console.log("New File Path: ", filePath);
                                await Gmg_Async._streamImageToDisk(u, filePath);
                                console.log(`Added file: ${originalName}`);
                                await Gmg_Async.ss(5);
                                i++;
                            }
                        }
                    }


                }

            }

        }

    }

    static async basicFileScraper (productElement, fileConfig) {
        let productFiles = "";
        if (fileConfig.hasOwnProperty("css")) {
            if (fileConfig.hasOwnProperty("name")) {

            } else {

                let moreImagesArray = await Gmg_Async.propertyCallback(productElement, fileConfig, true);
                if (moreImagesArray.length > 0) {
                    // Remember to reset the variable for concat
                    productFiles += moreImagesArray;
                }
            }
        }

        return productFiles.length > 0 ? productFiles.join("") : "" ;


    }


    static cleanFileLink (title, url) {
        return `<a href="${url} target="_blank">${title}</a>`;
    }





}
