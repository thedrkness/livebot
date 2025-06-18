export const convertTime = (time) => {
  if (!time) return;

  const newTime = new Date(time).toISOString();

  const hours = newTime.slice(11, 13);
  const minutes = newTime.slice(14, 16);
  const seconds = newTime.slice(17, 19);

  return `${hours}hr ${minutes}m ${seconds}s`;
};

export const getRandomStreamId = () => {
  return (Math.floor(Math.random() * (99999999999 - 10000000000 + 1)) + 10000000000).toString();
};
