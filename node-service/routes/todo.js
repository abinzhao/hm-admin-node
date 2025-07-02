const express = require("express");
const router = express.Router();
const todoController = require("../controllers/todoController");
const { requireAuth, requirePermission, PERMISSIONS } = require("../middlewares/auth");

// 待办事项CRUD操作
router.post("/", requireAuth, (req, res) => todoController.createTodo(req, res));
router.get("/", requireAuth, (req, res) => todoController.getTodos(req, res));
router.get("/stats", requireAuth, (req, res) => todoController.getTodoStats(req, res));
router.get("/:id", requireAuth, (req, res) => todoController.getTodoById(req, res));
router.put("/:id", requireAuth, (req, res) => todoController.updateTodo(req, res));
router.delete("/:id", requireAuth, (req, res) => todoController.deleteTodo(req, res));

// 批量操作
router.post("/batch", requireAuth, (req, res) => todoController.batchOperation(req, res));

// 子任务管理
router.get("/:id/subtasks", requireAuth, (req, res) => todoController.getSubtasks(req, res));

module.exports = router;
