require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const validUrl = require("valid-url");
const shortid = require("shortid");
const dns = require("dns");

const app = express();

const MONGO_URI = process.env.MONGO_URI; // Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// Connect to your MongoDB Atlas cluster (replace with your connection string)
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB Atlas");
});

// Define a URL model
const Url = mongoose.model("Url", {
  originalUrl: String,
  shortUrl: String,
});

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Shorten a URL
app.post("/api/shorturl", async (req, res) => {
  const { url } = req.body;

  if (!validUrl.isWebUri(url)) {
    return res.json({ error: "invalid url" });
  }
  const { hostname } = new URL(url);
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.status(400).json({ error: "invalid url" });
    }
  });

  const existingUrl = await Url.findOne({ originalUrl: url });

  if (existingUrl) {
    res.json({ original_url: url, short_url: existingUrl.shortUrl });
  } else {
    const shortURL = shortid.generate();

    const newUrl = new Url({
      originalUrl: url,
      shortUrl: shortURL,
    });

    try {
      await newUrl.save(); // Use await to handle the save operation
      res.json({ original_url: url, short_url: shortURL });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  }
});

// Expand a short URL
app.get("/api/shorturl/:shortURL", async (req, res) => {
  const { shortURL } = req.params;

  const existingUrl = await Url.findOne({ shortUrl: shortURL });

  if (existingUrl) {
    res.redirect(existingUrl.originalUrl);
  } else {
    res.status(404).json({ error: "Short URL not found" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
