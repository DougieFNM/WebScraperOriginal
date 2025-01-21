const fs = require('fs').promises;
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const puppeteer = require('puppeteer');
const path = require('path');

// Function to get the actual image URL from a Dropbox link
async function getActualImageUrl(page, dropboxUrl) {
    try {
        await page.goto(dropboxUrl);
        const imageUrl = await page.evaluate(() => {
            const img = document.querySelector('img');
            return img ? img.src.split('?')[0] : null;
        });
        if (!imageUrl) {
            console.error(`Image not found for URL: ${dropboxUrl}`);
        }
        return imageUrl;
    } catch (error) {
        console.error(`Error fetching image URL for: ${dropboxUrl} - ${error.message}`);
        return null;
    }
}

// Function to read the CSV file
async function readCSV(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return new Promise((resolve, reject) => {
        const rows = [];
        const parser = csv();
        parser.on('data', (row) => rows.push(row));
        parser.on('end', () => resolve(rows));
        parser.on('error', (error) => reject(error));
        parser.write(data);
        parser.end();
    });
}

// Function to write the CSV file
async function writeCSV(filePath, rows) {
    const headers = Object.keys(rows[0]);
    const csvWriter = createCsvWriter({
        path: filePath,
        header: headers.map(header => ({ id: header, title: header }))
    });

    await csvWriter.writeRecords(rows);
}

// Function to generate a new file path with a timestamp
function getNewFilePath(originalFilePath) {
    const timestamp = Date.now();
    const dir = path.dirname(originalFilePath);
    const ext = path.extname(originalFilePath);
    const baseName = path.basename(originalFilePath, ext);
    return path.join(dir, `${baseName}_NewFile_${timestamp}${ext}`);
}

// Function to process the CSV file
async function processCSV(inputFilePath) {
    const rows = await readCSV(inputFilePath);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (const row of rows) {
        if (row.Images) {
            const links = row.Images.split(',');
            for (let i = 0; i < links.length; i++) {
                const newUrl = await getActualImageUrl(page, links[i]);
                if (newUrl) {
                    links[i] = newUrl;
                } else {
                    console.error(`Failed to replace URL: ${links[i]}`);
                }
            }
            row.Images = links.filter(link => link).join(',') || '';
        } else {
            row.Images = '';
        }
        console.log(`Processed row.Images: ${row.Images}`);
    }

    await writeCSV(getNewFilePath(inputFilePath), rows);
    await browser.close();
    console.log('CSV file successfully processed and saved.');
}

// Main function
async function main() {
    const inputFilePath = process.argv[2];
    if (!inputFilePath) {
        console.error('Please provide a CSV file path as an argument.');
        process.exit(1);
    }
    await processCSV(inputFilePath);
}

main();
