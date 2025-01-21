import process from "process";
import fs from "fs/promises";
import {Gmg_Async} from "./helper.mjs";
import {BasicScraper} from "./BasicScraper.mjs";



(async () => {
    // If I remember correctly this is because the first two args are "node" and the file name

    const pargs = process.argv.slice(2);
    const BRANDS_DIR = './configs/site_info/';
    const brandsDirectory = await fs.readdir(BRANDS_DIR);

    const scrapeBrand = await Gmg_Async.createAsyChoiceList("What site info would you like to scrape?", brandsDirectory)
    const configFile = await fs.readFile(`${BRANDS_DIR}${scrapeBrand}`);
    const brandConfig = await Gmg_Async.asyncParse(configFile);

    let basic = new BasicScraper(brandConfig, pargs);
    await basic._init();

    process.exit(1);
    // console.log(brandConfig);

})()