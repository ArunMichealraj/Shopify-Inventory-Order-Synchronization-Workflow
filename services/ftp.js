require("dotenv").config();

const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const ftp = require("basic-ftp");
const sftp = new ftp.Client();

// const sftp = new Client();

/**
 * ---------------------------------------------------------
 * Download Latest Inventory File
 * ---------------------------------------------------------
 * 1. Connect to FTP/SFTP
 * 2. Get all files
 * 3. Find latest .DAT file
 * 4. Skip if already downloaded
 * 5. Download new file
 * ---------------------------------------------------------
 */
async function downloadLatestInventoryFile() {

    try {

        await sftp.access({
            host: process.env.FTP_HOST,
            port: Number(process.env.FTP_PORT),
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false
        });
        logger.writeLog("FTP Connected Successfully");

        const remoteFolder = process.env.REMOTE_PATH;

        // Get file list
        const files = await sftp.list(remoteFolder);

        // Filter only DAT files
        const datFiles = files.filter(file =>
            file.name.startsWith("SHOPIFY_INV_PRICE") &&
            file.name.toLowerCase().endsWith(".dat")
        );

        if (datFiles.length === 0) {

            console.log("No DAT files found.");
            logger.writeLog("No DAT files found.");

            return false;
        }

        // Sort newest first
        datFiles.sort((a, b) => b.modifyTime - a.modifyTime);

        const latestFile = datFiles[0];

        logger.writeLog(`Latest File : ${latestFile.name}`);

        // Create download folder
        if (!fs.existsSync(process.env.LOCAL_PATH)) {

            fs.mkdirSync(process.env.LOCAL_PATH, {
                recursive: true
            });

        }

        const remoteFile =
            `${remoteFolder}/${latestFile.name}`;

        const localFile =
            path.join(process.env.LOCAL_PATH, latestFile.name);

        /**
         * Skip download if file already exists
         */
        if (fs.existsSync(localFile)) {

            console.log("================================");
            console.log("Latest inventory file already processed.");
            console.log("Waiting for a new inventory file...");
            console.log("================================");

            logger.writeLog("Latest file already downloaded.");

            return false;
        }

        logger.writeLog("Downloading latest inventory file...");

        await sftp.downloadTo(remoteFile, localFile);

        console.log("================================");
        console.log("Download Completed");
        console.log(localFile);
        console.log("================================");

        logger.writeLog(`Downloaded : ${localFile}`);

        return true;

    } catch (err) {

        console.error("FTP Download Failed");
        console.error(err.message);

        logger.writeLog("FTP Download Failed");
        logger.writeLog(err.message);

        return false;

    } finally {

        try {
            await sftp.close();
        } catch (e) { }

    }

}

/**
 * Download latest Order Status file
 * File Format:
 * SHOPIFY_ORD_STATUS.YYYYMMDD.HHmm.dat
 */
async function downloadLatestStatusFile() {

    try {

        await sftp.access({
            host: process.env.FTP_HOST,
            port: Number(process.env.FTP_PORT),
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false
        });


        const remoteFolder = process.env.REMOTE_PATH;

        const files = await sftp.list(remoteFolder);

        const statusFiles = files.filter(file =>
            file.name.startsWith("SHOPIFY_ORD_STATUS") &&
            file.name.toLowerCase().endsWith(".dat")
        );

        if (statusFiles.length === 0) {
            console.log("No Order Status files found.");
            return false;
        }

        statusFiles.sort((a, b) => b.modifyTime - a.modifyTime);

        const latestFile = statusFiles[0];

        const localFolder =
            path.join(__dirname, "../status");

        if (!fs.existsSync(localFolder)) {
            fs.mkdirSync(localFolder, { recursive: true });
        }

        const localFile =
            path.join(localFolder, latestFile.name);

        if (fs.existsSync(localFile)) {

            console.log("Latest status file already downloaded.");

            return false;
        }

        await sftp.downloadTo(
            `${remoteFolder}/${latestFile.name}`,
            localFile
        );

        console.log("Downloaded:", latestFile.name);

        return localFile;

    } catch (err) {

        console.log(err);
        logger.writeLog(err.message);

        return false;

    } finally {

        try {
            await sftp.close();
        } catch (err) {
            logger.writeLog("FTP Disconnect Failed");
        }

    }

}

/**
 * ---------------------------------------------------------
 * Copy Order File to Local Out Folder
 * ---------------------------------------------------------
 * Currently copies to:
 *
 * /out
 *
 * Later this function can be replaced with
 * FTP Upload (uploadFrom)
 * ---------------------------------------------------------
 */
// async function uploadFile(localFile) {

//     try {

//         const outFolder =
//             path.join(__dirname, "../out");

//         // Create out folder
//         if (!fs.existsSync(outFolder)) {

//             fs.mkdirSync(outFolder, {
//                 recursive: true
//             });

//         }

//         const destination =
//             path.join(
//                 outFolder,
//                 path.basename(localFile)
//             );

//         // Copy file
//         fs.copyFileSync(localFile, destination);

//         console.log("================================");
//         console.log("Order file copied successfully");
//         console.log(destination);
//         console.log("================================");

//         logger.writeLog(`Order File Copied : ${destination}`);

//         return destination;

//     } catch (err) {

//         console.error("Order File Copy Failed");
//         console.error(err.message);

//         logger.writeLog("Order File Copy Failed");
//         logger.writeLog(err.message);

//         return null;

//     }

// }

/**
 * ---------------------------------------------------------
 * Upload Order File to FTP Server
 * ---------------------------------------------------------
 * Uploads the generated order DAT file to the
 * remote FTP/SFTP OUT folder.
 *
 * @param {string} localFile Local file path
 * @returns {boolean} Upload status
 * ---------------------------------------------------------
 */
async function uploadFile(localFile) {

    try {

        // Check if local file exists
        if (!fs.existsSync(localFile)) {

            console.log("Order file not found:", localFile);
            logger.writeLog(`Order file not found: ${localFile}`);

            return false;
        }

        // Connect to FTP/SFTP Server
        await sftp.access({
            host: process.env.FTP_HOST,
            port: Number(process.env.FTP_PORT),
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false
        });

        const remoteFile =
            `${process.env.REMOTE_OUT_PATH}/${path.basename(localFile)}`;

        console.log("Uploading Order File...");
        logger.writeLog(`Uploading: ${remoteFile}`);

        // Upload file
        await sftp.uploadFrom(localFile, remoteFile);

        console.log("================================");
        console.log("Order File Uploaded Successfully");
        console.log(remoteFile);
        console.log("================================");

        logger.writeLog(`Order File Uploaded: ${remoteFile}`);

        return true;

    } catch (err) {

        console.error("Order File Upload Failed");
        console.error(err.message);

        logger.writeLog("Order File Upload Failed");
        logger.writeLog(err.message);

        return false;

    } finally {

        // Always close FTP connection
        try {
            await sftp.close();
        } catch (e) {
            // Ignore close errors
        }

    }
}


module.exports = {
    downloadLatestInventoryFile,
    uploadFile,
    downloadLatestStatusFile,
};
