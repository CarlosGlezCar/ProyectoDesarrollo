function query(value) {
  const result = {
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    populate: () => result,
    select: () => result
  };

  return result;
}

module.exports = { query };