const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // parse JSON bodies

const authRoutes = require("./routes/auth.routes");

app.use("/api", authRoutes);

// Simple test route
app.get("/", (req, res) => {
  res.json({ message: "API is running ✅" });
});

// Later we'll mount auth routes here, e.g. app.use('/auth', authRoutes);

const testRoutes = require("./routes/test.routes");
app.use("/api", testRoutes);

const itemRoutes = require("./routes/items.routes");
app.use("/api", itemRoutes);

const categoryRoutes = require("./routes/categories.routes");
app.use("/api", categoryRoutes);

const orderRoutes = require("./routes/orders.routes");
app.use("/api", orderRoutes);

// Get port from env or default to 4000
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
