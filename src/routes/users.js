const router = require("express").Router();
const loggerUser = require("../middlewares/loggerUser");

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/users");

router.use(loggerUser);

router.get("/users/", getUsers);
router.get("/users/:userID", getUser);
router.post("/users/", createUser);
router.patch("/users/:userID", updateUser);
router.delete("/users/:userID", deleteUser);

module.exports = router;
