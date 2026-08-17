const express = require("express");
const cors = require("cors");

const { startScheduler } = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 4200;

app.use(cors({
    origin: ["http://localhost:4200"],
    optionsSuccessStatus: 200
}));


// Health Check
app.get("/", (req, res) => {
    res.json({
        result: "success",
        message: `Welcome to KV Node Server! Running on ${PORT}`
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

    // Start Scheduler after server is running
    startScheduler();

});