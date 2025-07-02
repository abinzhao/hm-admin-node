const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");
const { optionalAuth } = require("../middlewares/auth");

// 全局搜索
router.get("/", optionalAuth, (req, res) => searchController.globalSearch(req, res));

// 高级搜索
router.post("/advanced", optionalAuth, (req, res) => searchController.advancedSearch(req, res));

// 搜索建议
router.get("/suggestions", (req, res) => searchController.getSearchSuggestions(req, res));

// 热门搜索
router.get("/trending", (req, res) => searchController.getTrendingSearches(req, res));

// 按分类搜索
router.get("/category/:categoryId", optionalAuth, (req, res) =>
  searchController.searchByCategory(req, res)
);

// 按标签搜索
router.get("/tag/:tagId", optionalAuth, (req, res) => searchController.searchByTag(req, res));

module.exports = router;
