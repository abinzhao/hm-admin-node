const express = require("express");
const router = express.Router();
const todoController = require("../controllers/todoController");

// 新增代办事项
router.post("/create", todoController.createTodo);
// 编辑代办事项
router.post("/update", todoController.updateTodo);
// 删除代办事项
router.post("/delete", todoController.deleteTodo);
// 查询代办事项
router.get("/query", todoController.queryTodo);

module.exports = router;
