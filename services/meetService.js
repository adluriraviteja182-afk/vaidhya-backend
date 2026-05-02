function generateMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let roomId = '';
  for (let i = 0; i < 10; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const formatted = roomId.match(/.{1,3}/g).join("-");
  return `https://meet.google.com/${formatted}`;
}

module.exports = { generateMeetLink };
