require("dotenv").config();
const ftp = require("basic-ftp");

async function testFTP() {

    const client = new ftp.Client();

    try {

        await client.access({
            host: process.env.FTP_HOST,
            port: 21,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false
        });

        console.log("================================");
        console.log("✅ FTP Connected Successfully");
        console.log("================================");

        const remoteFolder = process.env.REMOTE_PATH;

        // Get file list
        const files = await client.list(remoteFolder);

        console.table(files);

    } catch (err) {

        console.log("================================");
        console.log("❌ FTP Connection Failed");
        console.log(err.message);

    } finally {

        client.close();

    }

}

testFTP();