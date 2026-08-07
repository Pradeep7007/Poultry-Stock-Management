const formatText = (text) => {
  if (!text) return text;
  return text
    .toString()
    .trim()
    .replace(/\s+/g, ' ') // Remove extra spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

module.exports = { formatText, formatDate };
