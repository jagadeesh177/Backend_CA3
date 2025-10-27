const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

const API_KEY = "mysecureapikey";
let events = [];

function auth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY && key !== "adminkey") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = { key, role: key === "adminkey" ? "admin" : "user" };
  next();
}

app.post("/api/events", auth, (req, res) => {
  const { eventName, date, location, description, tags } = req.body;
  if (!eventName || !date || !location || !description) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const duplicate = events.find(
    (e) => e.eventName === eventName && e.date === date && e.createdBy === req.user.key
  );
  if (duplicate) {
    return res.status(400).json({ error: "Duplicate event for this user" });
  }

  const newEvent = {
    id: Date.now(),
    eventName,
    date,
    location,
    description,
    tags: tags || [],
    createdBy: req.user.key,
    createdAt: new Date().toISOString(),
  };

  events.push(newEvent);
  res.status(201).json({ message: "Event created successfully", data: newEvent });
});

app.get("/api/events", (req, res) => {
  const { date, location, tag, sort } = req.query;
  let result = [...events];

  if (date) result = result.filter((e) => e.date === date);
  if (location) result = result.filter((e) => e.location.toLowerCase() === location.toLowerCase());
  if (tag) result = result.filter((e) => e.tags.includes(tag));

  if (sort) {
    const [field, order] = sort.split(":");
    result.sort((a, b) => {
      const valA = a[field]?.toString().toLowerCase() || "";
      const valB = b[field]?.toString().toLowerCase() || "";
      if (valA < valB) return order === "desc" ? 1 : -1;
      if (valA > valB) return order === "desc" ? -1 : 1;
      return 0;
    });
  }

  res.json(result);
});

app.put("/api/events/:id", auth, (req, res) => {
  const { id } = req.params;
  const { location, description, tags, date } = req.body;
  const event = events.find((e) => e.id == id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  if (event.createdBy !== req.user.key) {
    return res.status(403).json({ error: "You are not authorized to update this event" });
  }

  if (location) event.location = location;
  if (description) event.description = description;
  if (Array.isArray(tags)) event.tags = tags;
  if (date) event.date = date;

  res.json({ message: "Event updated successfully", data: event });
});

app.delete("/api/events/:id", auth, (req, res) => {
  const { id } = req.params;
  const index = events.findIndex((e) => e.id == id);
  if (index === -1) return res.status(404).json({ error: "Event not found" });

  const event = events[index];
  if (event.createdBy !== req.user.key && req.user.role !== "admin") {
    return res.status(403).json({ error: "You are not authorized to delete this event" });
  }

  events.splice(index, 1);
  res.json({ message: "Event deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
