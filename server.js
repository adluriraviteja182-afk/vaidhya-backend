require("dotenv").config();
const app = require("./app");

// ✅ Use Railway dynamic port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Pragyan Backend running on port ${PORT}`);
});
