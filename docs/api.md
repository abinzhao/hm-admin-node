# API 接口文档

## 统一响应格式

```
{
  "code": 0,
  "msg": "操作成功",
  "data": { ... }
}
```

- code=0 表示成功，非 0 为错误码
- msg 为提示信息
- data 为返回数据

---

## 用户模块

### 注册

- 路径：POST /api/user/register
- 参数：username, password, email, phone, nickname, avatar, homepage, tags
- 返回：{ id, username }

### 登录

- 路径：POST /api/user/login
- 参数：username, password
- 返回：{ token, user }

### 查询用户

- 路径：GET /api/user/query
- 参数：id, username, keyword
- 返回：用户信息数组

---

## 内容模块

### 创建内容

- 路径：POST /api/content/create
- 参数：user_id, type, title, content, summary, tags, category, main_image, language
- 返回：内容对象

### 更新内容

- 路径：POST /api/content/update
- 参数：id, 其他可更新字段
- 返回：内容对象

### 删除内容

- 路径：POST /api/content/delete
- 参数：id
- 返回：无

### 查询内容

- 路径：GET /api/content/query
- 参数：type, user_id, keyword, tag, category, id, page, pageSize, order
- 返回：{ total, list, page, pageSize }

### 点赞/取消点赞

- 路径：POST /api/content/like
- 参数：user_id, content_id, like (true/false)
- 返回：无

### 收藏/取消收藏

- 路径：POST /api/content/collect
- 参数：user_id, content_id, collect (true/false)
- 返回：无

### 举报内容

- 路径：POST /api/content/report
- 参数：id, reason
- 返回：无

---

## 软件模块

### 发布软件

- 路径：POST /api/software/create
- 参数：user_id, name, package_name, icon, description, update_info, version, download_url, tags
- 返回：软件对象

### 编辑软件

- 路径：POST /api/software/update
- 参数：id, 其他可更新字段
- 返回：软件对象

### 删除软件

- 路径：POST /api/software/delete
- 参数：id
- 返回：无

### 查询软件

- 路径：GET /api/software/query
- 参数：keyword, tag, page, pageSize
- 返回：{ total, list, page, pageSize }

### 检查包名唯一

- 路径：GET /api/software/check-package
- 参数：package_name
- 返回：{ exists: true/false }

---

## 评论模块

### 发布评论

- 路径：POST /api/comment/create
- 参数：content_id, user_id, content
- 返回：评论对象

### 删除评论

- 路径：POST /api/comment/delete
- 参数：id
- 返回：无

### 查询评论

- 路径：GET /api/comment/query
- 参数：content_id, page, pageSize
- 返回：{ total, list, page, pageSize }

### 举报评论

- 路径：POST /api/comment/report
- 参数：id, reason
- 返回：无

---

## 通知模块

### 发布通知

- 路径：POST /api/notification/create
- 参数：user_id, type, content
- 返回：通知对象

### 编辑通知

- 路径：POST /api/notification/update
- 参数：id, content
- 返回：通知对象

### 删除通知

- 路径：POST /api/notification/delete
- 参数：id
- 返回：无

### 查询通知

- 路径：GET /api/notification/query
- 参数：user_id, page, pageSize
- 返回：{ total, list, page, pageSize }

### 标记已读

- 路径：POST /api/notification/read
- 参数：id
- 返回：无

---

## 代办事项模块

### 新增代办

- 路径：POST /api/todo/create
- 参数：user_id, title, description, status, priority, deadline
- 返回：事项对象

### 编辑代办

- 路径：POST /api/todo/update
- 参数：id, 其他可更新字段
- 返回：事项对象

### 删除代办

- 路径：POST /api/todo/delete
- 参数：id
- 返回：无

### 查询代办

- 路径：GET /api/todo/query
- 参数：user_id, status, priority, page, pageSize
- 返回：{ total, list, page, pageSize }

---

## 文件上传

### 上传文件

- 路径：POST /api/upload
- 参数：file（form-data），type（images/packages/other）
- 返回：{ url }

---

## 统一错误返回示例

```
{
  "code": 1,
  "msg": "错误信息",
  "data": {}
}
```
