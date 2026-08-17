const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../storage/lastOrder.json");

function getLastOrderDate() {

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    return data.lastOrderDate;
}

function saveLastOrderDate(date) {

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            {
                lastOrderDate: date
            },
            null,
            4
        )
    );
}

module.exports = {
    getLastOrderDate,
    saveLastOrderDate
};