// index.js
const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public")); // serve your frontend files

// Simple in-memory storage for messages (optional, Firebase handles messages)
const messages = [];

// API endpoints (if needed)
app.get("/messages", (req, res) => {
    res.json(messages);
});

app.post("/messages", (req, res) => {
    const { user, text } = req.body;
    if (user && text) {
        messages.push({ user, text, timestamp: Date.now() });
        res.status(200).send("Message sent!");
    } else {
        res.status(400).send("User and text are required.");
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
