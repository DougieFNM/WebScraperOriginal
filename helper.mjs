// DEBUG

import * as readline from "node:readline/promises";
import {stdin as input, stdout as output} from "node:process";
import puppeteer from "puppeteer-extra";
import fs from "fs/promises";
import { createWriteStream} from "fs";
import crypto from "crypto";
import * as Path from "path";
import Axios from "axios";
import process from "process";

// import * as http from "http";
// import * as https from "https";
// import {Transform as Stream} from "node:stream";



const rl = readline.createInterface({input, output});
// const ObjectsToCsv = require("objects-to-csv");
// const puppeteer = require("puppeteer");


export const SAN = {
    "trim": (value) => value.trim(),
    "commas": (value) => "\"" + value + "\"",
    "leadingSlashes": (value) => value.replace(/^\/+/, ''),
    "trailingSlashes": (value) => value.endsWith("/") ? value.replace(/\/+$/, '') : value,
    "addLeadingSlash": (value) => "/" + value,
    "addTrailingSlash": (value) => value + "/",
    "remove": (value, removeValue) => value.replace(removeValue, "")
}

export const URL_TYPE_CONFIG_CALLBACKS = {
    "relative": async (el, selector, sanitizedPath) => sanitizedPath + await PUPGMO.href(el, selector, ["trim", "leadingSlashes", "addLeadingSlash"]),
    "absolute": async (el, selector) => await PUPGMO.href(el, selector, ["trim", "leadingSlashes", "trailingSlashes"]),
    "href": async (el, selector) => await PUPGMO.href(el, selector, ["trim"]),
    "src": async (el, selector) => await PUPGMO.src(el, selector, ["trim"]),
    "currentSrc": async (el, selector) => await PUPGMO.currentSrc(el, selector, ["trim"]),
    "attr": async (el, selector, attrname) => await PUPGMO.attr(el, selector, attrname, ["trim"]),
    "self": (el, selector, sanitizedPath) => new Promise(resolve => resolve(sanitizedPath)),
}

export const BASIC_ASYNC = {
    "innerText": async (el, sel) => await Gmg_Async.getProps(el, sel, "innerText", sanitizations),
    "innerHtml": async (el, sel, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, "innerHtml", sanitizations),
    "href": async (el, sel, sanitizations = ["leadingSlashes"]) => await Gmg_Async.getProps(el, sel, "href", sanitizations),
    "src": async (el, sel, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, "src", sanitizations),
    "currentSrc": async (el, sel, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, "currentSrc", sanitizations),
    "attr": async (el, sel, attrName, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, attrName, sanitizations)
};



export const PUPGMO = {
    "innerText": async (el, sel) => {
        // const tempEl = sel === "self" ? el : await el.$(sel);
        const tempEl = await el.$(sel);
        let value = await tempEl.getProperty("innerText");
        // console.log(value);
        return await value.jsonValue();
    },
    "innerHtml": async (el, sel, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, "innerHtml", sanitizations),
    "href": async (el, sel, sanitizations = ["leadingSlashes"]) => await Gmg_Async.getProps(el, sel, "href", sanitizations),
    "src": async (el, sel, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, "src", sanitizations),
    "currentSrc": async (el, sel, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, "currentSrc", sanitizations),
    "attr": async (el, sel, attrName, sanitizations = ["trim"]) => await Gmg_Async.getProps(el, sel, attrName, sanitizations),
    "battr": async (tempEl, search) => await tempEl.evaluate((element, s) => element.getAttribute(s), search)
}


export class GmgBrowser {


    static launchOpts (headless=true) {
        return {
            headless: headless,
            ignoreHTTPSErrors: true,
            defaultViewport: null,
        }

    }

    static async basic_launch(opts) {
        const browser = await puppeteer.launch(opts);
        const page = await browser.newPage();
        return page;
    }



    static browser_args(proxy_name = null) {
        let alwaysArgs;
        if (proxy_name) {
            alwaysArgs = [
                '--no-sandbox',
                '--proxy-server=http://' + proxy_name,
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-infobars',
                '--disable-automation',
                '--allow-insecure-localhost',
                '--disable-accelerated-2d-canvas',
                '--start-maximized',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--lang=en-US,en;q=0.9',
                '--ignore-certificate-errors'
            ];
        } else {
            alwaysArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-infobars',
                '--disable-automation',
                '--allow-insecure-localhost',
                '--disable-accelerated-2d-canvas',
                '--start-maximized',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--lang=en-US,en;q=0.9',
                '--ignore-certificate-errors'
            ];
        }

        return alwaysArgs;
    }

    static async browser_launch(headless = false, proxy = null) {
        let proxy_name = proxy === null ? '127.0.0.1:9876' : proxy['proxy_server'];
        let alwaysArgs = [
            '--no-sandbox',
            '--proxy-server=http://' + proxy_name,
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-infobars',
            '--disable-automation',
            '--allow-insecure-localhost',
            '--disable-accelerated-2d-canvas',
            '--start-maximized',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--lang=en-US,en;q=0.9',
            '--ignore-certificate-errors'
        ];
        let options = {
            headless: headless,
            ignoreHTTPSErrors: true,
            defaultViewport: null,
            args: alwaysArgs,
        };
        // if (proxy) {
        //     // TODO: Apply puppeteer stealth config and auto captcha where necessary
        //     await puppeteer.use(StealthPlugin());
        // }
        // return await puppeteer.launch(options);
    }
}

export class Gmg_Async {

    static BACKIMAGE = "background-image-css";

    static s = ms => new Promise(r => setTimeout(r, ms));
    static ss = seconds => new Promise(r => setTimeout(r, seconds*1000));

    static generateKey(isCrypto=false) {
        return new Promise((resolve, reject) => {
            let num = isCrypto
                ? crypto.randomBytes(16).toString("base64")
                : Math.random().toString(36).substring(2, 9);
            resolve(num);
        });
    }

    static async exists (path) {
        try {
            await fs.access(path)
            return true
        } catch {
            return false
        }
    }


    static async propertyCallback($el, arr, findAll=false) {
        let values=[], callback;
        if (arr.length >= 2) {
            let srcType = arr[0];
            let selector = arr[1];
            let sanitizations = ["trim"];

            let searchItem = srcType;
            // TODO: Also maybe set element find callback?
            let basicCallbacks = ["href", "src", "currentSrc", "innerText", "innerHtml"];
            if (srcType === "attr" && arr.length >= 3) {
                searchItem = arr[2];

                callback = async (tempEl, search) => await tempEl.evaluate((element, s) => element.getAttribute(s), search);

            } else if (basicCallbacks.includes(srcType)) {
                callback = async (tempEl, search) => await (await tempEl.getProperty(search)).jsonValue();
            } else {
                console.error(`Invalid URL callback type: ${srcType}`);
                console.error(`Valid URL callbacks included: ${Object.keys(URL_TYPE_CONFIG_CALLBACKS).join(', ')}`);
            }

            if (callback !== undefined) {
                if (Array.isArray($el)) {
                    for (const el in $el) {
                        let tempEl = selector === "self" ? $el : await $el[el].$(selector);
                        let v = await callback(tempEl, searchItem);
                        v = Gmg_Async.sanitize(v, sanitizations);
                        values.push(v)
                    }
                } else if(findAll === true) {
                    let temporaryElements = await $el.$$(selector);
                    //
                    // LOOK FOR ALL ELEMENTS ON THE PAGE FOR THE FOLLOWING
                    if (temporaryElements) {
                        for (const el in temporaryElements) {
                            // TODO: Check if field exists
                            let v = await callback(temporaryElements[el], searchItem);
                            v = Gmg_Async.sanitize(v, sanitizations);
                            values.push(v)
                        }
                    } else {
                        console.log(`No elements for selector ${selector}`)
                    }
                } else {
                    let tempEl = selector === "self" ? $el : await $el.$(selector);
                    if (tempEl === null) {
                        console.log("Element not found: ", $el, selector);
                    } else {
                        let v = await callback(tempEl, searchItem);
                        values.push(Gmg_Async.sanitize(v, sanitizations));
                    }
                }
            }

        } else {
            console.error(`To perform a callback for properties for an array please insert more than 2 variables in the array`)
        }

        // If the value is only one part return just that one part, otherwise return the whole array of values

        return values.length > 0 ? (values.length === 1 ? values[0] : values) : false;
    }

    static async imagePropertyCallback($el, arr, findAll=false) {
        let values=[], callback;
        if (arr.length >= 2) {
            let srcType = arr[0];
            let selector = arr[1];
            let sanitizations = ["trim"];

            let searchItem = srcType;
            // TODO: Also maybe set element find callback?
            let basicCallbacks = ["href", "src", "currentSrc", "innerText", "innerHtml"];
            if (srcType === "attr" && arr.length >= 3) {
                searchItem = arr[2];

                callback = async (tempEl, search) => await tempEl.evaluate((element, s) => element.getAttribute(s), search);

            } else if (basicCallbacks.includes(srcType)) {
                callback = async (tempEl, search) => await (await tempEl.getProperty(search)).jsonValue();
            } else {
                console.error(`Invalid URL callback type: ${srcType}`);
                console.error(`Valid URL callbacks included: ${Object.keys(URL_TYPE_CONFIG_CALLBACKS).join(', ')}`);
            }

            if (callback !== undefined) {
                if (Array.isArray($el)) {
                    for (const el in $el) {
                        let tempEl = selector === "self" ? $el : await $el[el].$(selector);
                        let v = await callback(tempEl, searchItem);
                        v = Gmg_Async.sanitize(v, sanitizations);
                        values.push(v)
                    }
                } else if(findAll === true) {
                    let temporaryElements = await $el.$$(selector);
                    //
                    // LOOK FOR ALL ELEMENTS ON THE PAGE FOR THE FOLLOWING
                    if (temporaryElements) {
                        for (const el in temporaryElements) {
                            // TODO: Check if field exists
                            let v = await callback(temporaryElements[el], searchItem);
                            v = Gmg_Async.sanitize(v, sanitizations);
                            values.push(v)
                        }
                    } else {
                        console.log(`No elements for selector ${selector}`)
                    }
                } else {
                    let tempEl = selector === "self" ? $el : await $el.$(selector);
                    if (tempEl === null) {
                        console.log("Element not found: ", $el, selector);
                    } else {
                        let v = await callback(tempEl, searchItem);
                        values.push(Gmg_Async.sanitize(v, sanitizations));
                    }
                }
            }

        } else {
            console.error(`To perform a callback for properties for an array please insert more than 2 variables in the array`)
        }

        // If the value is only one part return just that one part, otherwise return the whole array of values

        return values.length > 0 ? (values.length === 1 ? values[0] : values) : false;
    }

    static async booleanCallback($el, arr) {
        if (arr.length === 2) {
            let boolNegation = arr[0];
            let selector = arr[1];
            let element = await $el.$(selector);
            let elementFound = element ? true : false;

            return boolNegation === "sold-out" || boolNegation === "so" ? !elementFound : elementFound;

        } else {
            console.error(`Boolean callbacks need exactly 2 variables`);
            console.error(`The first should be "ok" or "sold-out". Sold-out is the negation part if this selector is found in the element`);
            console.error(`Second part is the selector you are looking for.`);
        }

        return false;
    }


    static async getProps(el, sel, type, sanitizations = ["trim"]) {
        let tempEl = sel === "self" ? el : await el.$(sel);
        if (!tempEl) {
            console.log(`NOT FOUND: ${type}`);
            console.log(`Selector: ${sel}`);
            console.log(`Parent Element: ${el}`);
            return "";
        } else {

            let value;
            // console.log(tempEl);
            if (type === "innerHtml") {
                //WORKS AS INTENDED NOW FOR INNER HTML
                value = await tempEl.evaluate((element) => element.innerHTML);
            } else {
                value = await (await tempEl.getProperty(type)).jsonValue()
            }

            if (type === 'price') {
                sanitizations.push("remove::$");
            }

            return Gmg_Async.sanitize(value, sanitizations);
        }
    }

    static async getInner(el, sel, isHtml=false) {
        let tempEl = sel === "self" ? el : await el.$(sel), propertyType = isHtml ? "innerHtml" : "innerText";
        // console.log(tempEl);
        return await (await tempEl.getProperty(propertyType)).jsonValue();
    }

    static async getInnerText(el, sel, isHtml=false) {
        let tempEl =  await el.$(sel);
        // console.log(tempEl);
        // let val = await tempEl.getProperty("innerHtml");
        let val = await tempEl.evaluate((element) => element.innerHTML);
        // console.log(val);
        // let actVal = await val.jsonValue();
        // console.log(actVal);
        return val;
    }



    static async getAttrSimple(el, sel, type) {
        let tempEl = sel === "self" ? el : await el.$(sel);
        let value = await tempEl.evaluate((element, s) => element.getAttribute(s), type)
        return value;
    }

    static async getAttr(el, sel, type, sanitizations = ["trim"]) {
        let tempEl = sel === "self" ? el : await el.$(sel);
        let value = await tempEl.evaluate((element, s) => element.getAttribute(s), type)
        return Gmg_Async.sanitize(value, sanitizations);
    }

    static sanitize(value, sanitizations=["trim"]) {
        if ((value === null || value === undefined) || typeof value !== "string") {
            console.log(value);
        } else {
            if (sanitizations.length > 0) {
                for (let i in sanitizations) {
                    let s = sanitizations[i];
                    // console.log(s.indexOf("remove"));
                    if (s.indexOf("remove") === 0) {
                        let rstring = s.split("::");
                        value = value.replace(rstring[1], "");
                    } else if (s.indexOf("prepend") === 0) {
                        let rstring = s.split("::");
                        value = rstring[1] + value;
                    } else if (SAN.hasOwnProperty(s)) {
                        value = SAN[s](value);
                    }
                }
            }

        }


        //#ember2248 > div > div

        return value;
    }

    static capital (v) {
        return v.charAt(0).toUpperCase() + v.slice(1);
    }


    static async asyncStringify(content) {
        return JSON.stringify(content);
    }

    static promStringify(content) {
        return new Promise((resolve, reject) => {
            resolve(JSON.stringify(content));
        });
    }

    static promParse(str) {
        return new Promise((resolve, reject) => {
            resolve(JSON.parse(str));
        });
    }

    static async asyncParse(str) {
        return JSON.parse(str);
    }

    static async createDir (d) {
        try {
            await fs.mkdir(d);
        } catch (e) {
            console.log(`The directory ${d} was probably already created`);
        }
    }

    static async removeDirectory(d) {
        await fs.rmdir(d);
    }

    static async createDirCheck (d) {
        try {
            await fs.mkdir(d);
        } catch (e) {
            console.log(`The directory ${d} was probably already created`);
            return false;
        }
        return true;
    }

    static async _streamImageToDisk(url, filePath, proxy=false) {
        const writer = createWriteStream(filePath)

        const response = await Axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        if (response.status !== 404) {
            await Gmg_Async.s(2000);

            response.data.pipe(writer);

        }

        return new Promise((resolve, reject) => {
            response.data.on('end', resolve)
            response.data.on('error', reject)
        });

    }


    static async _writeToFile(content, filePathName) {

        // console.log(typeof content);
        if (typeof content === "object") {
            console.log("Is Object")
            content = await Gmg_Async.asyncStringify(content);
            // await fs.writeFile(filePath, content);
        }

        await fs.writeFile(filePathName, content);
    }

    static async _readFileToJson(filePathName) {
        let fileContents = await fs.readFile(filePathName);
        return await Gmg_Async.asyncParse(fileContents);
    }

    static async createAsyChoiceList(questionStr, choices, getChoiceNumber = false, allowMultipleChoices = false) {
        let s = questionStr + "\n\r";
        choices.forEach(function (i, a) {
            s += `[${a + 1}] ${i}\n\r`;
        });
        s += "[0] CANCEL\n\r";

        let answer = null;

        if (allowMultipleChoices) {
            answer = [];
            while (answer.length <= 0) {
                let a = await rl.question(s);
                let a_arr = a.split(",")
                // console.log(a);
                for (const aArrKey in a_arr) {
                    let actualValue = parseInt(aArrKey) - 1
                    if (actualValue === -1) {
                        process.exit(1);
                    } else if (actualValue >= 0 && choices.length >= actualValue) {
                        answer.push(choices[actualValue]);
                    }
                }
            }
        } else {

            while (!answer) {
                let a = await rl.question(s);
                // console.log(a);
                let actualValue = parseInt(a) - 1
                if (actualValue === -1) {
                    process.exit(1);
                } else if (actualValue >= 0 && choices.length >= actualValue) {

                    answer = getChoiceNumber === true ? actualValue : choices[actualValue];
                    // answer = choices[actualValue];
                }
            }
        }

        return answer;

    }

    static async getTextResponse(questionStr) {
        let answer = null;
        while (typeof answer !== 'string' && answer !== '') {
            let a = await rl.question(questionStr);
            // console.log(a);
            a = a.trim();
            if (a.length > 0) {
                answer = a;
            } else {
                process.exit(1);
            }
        }

        return answer;

    }

    static async confirmRequest(confirmationString) {
        let s = confirmationString + "\n\r[1]YES\n\r[0] NO\n\r";
        let answer = null;
        while (answer !== 1 || answer !== 0) {
            let a = await rl.question(s);
            // console.log(a);
            if (a >= 0) {
                answer = a;
            } else {
                process.exit(1);
            }
        }

        return answer;

    }

    static async confirmText(confirmationString) {
        let s = confirmationString ;
        let answer = null;
        while (answer !== "" || answer !== null) {
            let a = await rl.question(s);
            let areYouSure = `Are you sure you want your answer to be: ${a}`;
            // console.log(a);
            if (await Gmg_Async.confirmRequest(areYouSure)) {
                answer = a;
            }
        }
        return answer;
    }

    async convertProductsJsonToCsv(name, products, sanitizerFields = ["short_description", "description", "tags"]) {
        //sanatizerFields of new test
        for (const i of products) {
            // let i = products[item];
            for (const field of sanitizerFields) {
                // let field = sanitizerFields[t];
                if (i.hasOwnProperty(field)) {
                    i[field] = "\"" + i[field] + "\"";
                }
            }
            console.log(i);
        }

        const csv = new ObjectsToCsv(products);
        await csv.toDisk(name + '.csv', {allColumns: true});
    }

}
