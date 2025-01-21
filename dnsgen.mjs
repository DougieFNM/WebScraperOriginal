import fs from "fs/promises";
import {Gmg_Async} from "./helper.mjs";
import path from "path";
import * as process from "process";

/*
TODO: Need to grab the following items for dns info
TODO: And grab the Set the config variables
 */

const dnsConfigDir = (file) => `./configs/dns/${file}`;

(async () => {
    let dnsFunctions = [
        'Gather URLs',
        'Generate Server Info'
    ];


    let initFunction = await Gmg_Async.createAsyChoiceList("Which server are we on?", dnsFunctions);

    if (initFunction === 2) {

        let userPasswords = await Gmg_Async._readFileToJson(dnsConfigDir('user_template.json'));
        let dnsConfig = await Gmg_Async._readFileToJson(dnsConfigDir('dns.json'));
        let dnsData = {};
        let askUrl = await Gmg_Async.confirmText("Copy the url minus the https:// with the correct suffix.");
        let server = await Gmg_Async.createAsyChoiceList("Which server are we on?", dnsConfig.server);
    } else if (initFunction === 1) {

    }
    // TODO: Questions to ask.
    // Which Server?
    // Username
    // URL


    // TODO: Generate Me the Following
    // Staging URL
    // Staging Login URL
    // Live URL w/https
    // Staging .htaccess
    // Live .htaccess
    // Admin User and Our Users
    // Generate Tag Information???
    // Grab new plugin downloads???



    // TODO: Future, Ask to scrape the site. If so use Puppeteer and Scrape certain parts of site. Maybe create different program for this.
    // Scrape "Shop" Page and Products
    // Nav content
    // Page Content

})()
