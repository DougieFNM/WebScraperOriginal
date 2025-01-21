import process from "process";
import fs from "fs/promises";
import {Gmg_Async} from "./helper.mjs";


(async () => {
    // If I remember correctly this is because the first two args are "node" and the file name

    const dealerName = await Gmg_Async.getTextResponse("Name of the dealer?");
    const scrapeDealer = await Gmg_Async.getTextResponse("What website urls would you like to scrape?");
    // TODO: Check to see if https:// or http://
    // TODO: get the base domain
    // TODO : Create a base .htaccess file



    const brandConfig = await Gmg_Async.asyncParse(configFile);
    // console.log(brandConfig);

})()



// monitorEvents(window);
// unmonitorEvents(window, 'mouseout');
// unmonitorEvents(window, 'mouseover');
// unmonitorEvents(window, 'mousemove');
// unmonitorEvents(window, 'pointermove');
// unmonitorEvents(window, 'pointerover');
// unmonitorEvents(window, 'pointerout');
// unmonitorEvents(window, 'scroll');
// unmonitorEvents(window, 'blur');