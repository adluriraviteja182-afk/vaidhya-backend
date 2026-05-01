const { v4: uuidv4 } = require("uuid");

function generateMeetLink() {
  const roomId = uuidv4().replace(/-/g, "").substring(0, 10);
  const formatted = roomId.match(/.{1,3}/g).join("-");
  return `https://meet.google.com/${formatted}`;
}

module.exports = { generateMeetLink };
