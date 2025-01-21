import process from "process";
import fs from "fs/promises";
import {Gmg_Async} from "./helper.mjs";
import {GmgProductScraper} from "./gmgBrandScraper.mjs";

(async () => {
    // If I remember correctly this is because the first two args are "node" and the file name
    const pargs = process.argv.slice(2);
    const BRANDS_DIR = './configs/brands/';
    const brandsDirectory = await fs.readdir(BRANDS_DIR);

    const scrapeBrand = await Gmg_Async.createAsyChoiceList("What brand would you like to scrape?", brandsDirectory)
    const configFile = await fs.readFile(`${BRANDS_DIR}${scrapeBrand}`);
    const brandConfig = await Gmg_Async.asyncParse(configFile);
    // console.log(brandConfig);
    // TODO: Confirm brandConfig

    const scraperClass = new GmgProductScraper(brandConfig, pargs);

    const FUNOPTS = ["--images", "--importify", "--scrape-media"];

    if (pargs.length > 0 && FUNOPTS.includes(pargs[0])) {
        if (FUNOPTS[0] === pargs[0]) {
            console.log("Loading images for "+scrapeBrand);
            await Gmg_Async.ss(5);
            await scraperClass.initImages();
        } else if (FUNOPTS[1] === pargs[0]) {
            console.log("Loading new CSV import file for "+scrapeBrand);
            await Gmg_Async.ss(3);
            await scraperClass.importify();
        } else if (FUNOPTS[2] === pargs[0]) {
            console.log("Scrape brand "+scrapeBrand+ " for images");
            await Gmg_Async.ss(3);
            await scraperClass.basicImageScraper();
        }
    } else {
        await scraperClass.init();
    }
})()