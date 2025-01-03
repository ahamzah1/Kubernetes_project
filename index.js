const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// Directory and file for caching the image
const CACHE_DIR = path.join(__dirname, "cache");
const CACHE_FILE = path.join(CACHE_DIR, "hourly_image.jpg");
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds

// Ensure the cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// Function to fetch a new image and save it to the cache
async function fetchImage() {
  const url = "https://picsum.photos/1200";
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(CACHE_FILE);
      response.data.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  } catch (error) {
    console.error("Error fetching image:", error.message);
    throw new Error("Failed to fetch image");
  }
}

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));

// Route to get the cached image or fetch a new one
app.get("/image", async (req, res) => {
  try {
    const now = Date.now();
    const fileExists = fs.existsSync(CACHE_FILE);
    let needsRefresh = true;

    if (fileExists) {
      const stats = fs.statSync(CACHE_FILE);
      const lastModified = new Date(stats.mtime).getTime();
      needsRefresh = now - lastModified > CACHE_DURATION;
    }

    if (needsRefresh || !fileExists) {
      console.log("Fetching a new image...");
      await fetchImage();
    } else {
      console.log("Serving cached image...");
    }

    res.sendFile(CACHE_FILE);
  } catch (error) {
    res.status(500).send("Failed to load image.");
  }
});

// Route to render the HTML for the todo application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
