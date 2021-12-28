/**
 * Author: Sebastian Romero
 * Created: 23.06.2020
 */

const Figma = require('figma-api');
const fs = require('fs')
const request = require('request-promise');
require('dotenv').config();

const FIGMA_API_ACCESS_TOKEN = process.env.FIGMA_API_ACCESS_TOKEN;
const FIGMA_ICON_FILE_ID = process.env.FIGMA_ICON_FILE_ID;

const FILE_FORMAT = "svg";
const DOWNLOAD_PATH = './assets/';

const normalizeFilename = (name) => {
    const nameWithoutSlashes = replaceAllOccurrences(name, "/", "-");
    const nameWithoutSpaces = replaceAllOccurrences(nameWithoutSlashes, " ", "-");
    return nameWithoutSpaces.toLowerCase();
}

const downloadFile = async (url, path) => {
    const getImageOptions = { url: url, encoding: null, resolveWithFullResponse: true };
    return request.get(getImageOptions)
        .then(res => {
            fs.writeFileSync(path, res.body);
            console.log(path + ' downloaded ✅');
            return path;         
        })
        .catch( err => {
            console.log("Couldn't download " + url);
            console.log(err);
        });
}

const downloadIconFiles = async (iconsInfo, imageIDs) => {
    if (!fs.existsSync(DOWNLOAD_PATH)){
        fs.mkdirSync(DOWNLOAD_PATH);
    }
    
    let promises = [];

    let i = 0;
    for (var imageID in imageIDs) {
        const imageURL = imageIDs[imageID];
        const path = DOWNLOAD_PATH + normalizeFilename(iconsInfo[i].name) + "." + FILE_FORMAT;

        console.log("Downloading " + imageURL);
        promises.push(downloadFile(imageURL, path));                
        ++i;
    }    

    return Promise.all(promises);
}

const replaceAllOccurrences = (text, search, replace) => {
    return text.split(search).join(replace);
}

const replaceContent = (file, search, replace) => {
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        var result = replaceAllOccurrences(data, search, replace);

        fs.writeFile(file, result, 'utf8', function (err) {
            if (err) return console.log(err);
        });
    });
}

const extractIconsInfo = async (file) => {
    let iconsData = [];

    for (var nodeID in file.components) {
        const name = file.components[nodeID].name;
        if (name.includes("Figma")) {
            continue;
        }
        //const componentKey = file.components[nodeID].key;
        //console.log(nodeID + " : " + componentKey + " : " + name);
        iconsData.push({ "name": name, "nodeID": nodeID });
    }
    return iconsData;
}

const main = async () => {
    const api = new Figma.Api({
        personalAccessToken: FIGMA_API_ACCESS_TOKEN,
    });

    console.log("Getting info for Figma file with ID " + FIGMA_ICON_FILE_ID);
    const file = await api.getFile(FIGMA_ICON_FILE_ID);
    const icons = await extractIconsInfo(file);
    console.log("Found " + icons.length + " icon components");

    const allIconIDs = icons.map(function (element) {
        return element.nodeID;
    }).join(",");

    console.log("Fetching image URLs...");
    const imageResults = await api.getImage(FIGMA_ICON_FILE_ID, { ids: allIconIDs, format: FILE_FORMAT })
    const iconFiles = await downloadIconFiles(icons, imageResults.images);
    console.log(iconFiles.length + " icons downloaded");

    for (var iconFile of iconFiles) {
        console.log("Removing black fill attributes in: " + iconFile)
        replaceContent(iconFile, "fill=\"black\"", "");
    }

    console.log("Done.");
    return true;
}

main();
