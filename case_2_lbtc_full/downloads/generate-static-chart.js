const puppeteer = require('puppeteer');
const path = require('path');

async function generateStaticChart() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Load the HTML file
    const htmlPath = path.join(__dirname, '../data/points-comparison-all.html');
    await page.goto(`file://${htmlPath}`);
    
    // Wait for the chart to be rendered
    await page.waitForSelector('canvas');
    
    // Get the canvas element
    const canvas = await page.$('canvas');
    
    // Take a screenshot of the canvas
    await canvas.screenshot({
        path: path.join(__dirname, '../data/points-comparison.png'),
        omitBackground: true
    });
    
    await browser.close();
    console.log('Static chart generated successfully!');
}

generateStaticChart().catch(console.error); 