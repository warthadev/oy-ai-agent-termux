// time-utils.js - OY Anti Halusinasi
function getCurrentDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  return now.toLocaleString('id-ID', options);
}

function getCurrentDate() {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getCurrentYear() {
  return new Date().getFullYear();
}

module.exports = {
  getCurrentDateTime,
  getCurrentDate,
  getCurrentTime,
  getCurrentYear
};