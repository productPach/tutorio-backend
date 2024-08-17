const getUsers = (request, response) => {
  // Get all users
};

const getUser = (request, response) => {
  const { userID } = request.params;
  response.status(200);
  response.send(`User ${userID}`);
};

const createUser = (request, response) => {
  // Create new user
  response.status(201);
  response.send(request.body);
};

const updateUser = (request, response) => {
  // Update user
};

const deleteUser = (request, response) => {
  // Delete user
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
