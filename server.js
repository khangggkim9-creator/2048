const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

// Phục vụ toàn bộ file tĩnh
app.use(express.static(__dirname));

// Khi truy cập trang chủ
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
    console.log(`2048 running on port ${port}`);
});