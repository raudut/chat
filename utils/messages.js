const moment = require('moment');

function formatMessage(username, text, time) {
  return {
    username,
    text,
    time
  };
}

module.exports = formatMessage;
