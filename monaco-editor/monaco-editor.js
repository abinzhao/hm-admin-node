/**
 * Monaco 编辑器管理器 - 简洁版
 * 使用官方中文语言包，无工具栏设计
 * @version 2.1.0
 */

class MonacoEditorManager {
  constructor() {
    // 编辑器实例
    this.editor = null;

    // 当前配置
    this.config = {
      language: "javascript",
      theme: "vs-dark",
      fontSize: 14,
      readOnly: false,
      wordWrap: "on",
      tabSize: 4,
      insertSpaces: true,
      minimap: { enabled: window.innerWidth > 768 },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      lineNumbers: "on",
      renderWhitespace: "selection",
      folding: true,
      showFoldingControls: "always",
      bracketPairColorization: { enabled: true },
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: true,
      contextmenu: true,
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      hover: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
      // 中文支持
      fontFamily:
        '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, "PingFang SC", "Microsoft YaHei", Consolas, monospace',
    };

    // 语言映射表
    this.languageMap = {
      javascript: { name: "JavaScript", ext: ".js", icon: "🟨" },
      typescript: { name: "TypeScript", ext: ".ts", icon: "🔷" },
      arkui: { name: "ArkUI", ext: ".ets", icon: "🔷" },
      html: { name: "HTML", ext: ".html", icon: "🌐" },
      css: { name: "CSS", ext: ".css", icon: "🎨" },
      json: { name: "JSON", ext: ".json", icon: "📦" },
      python: { name: "Python", ext: ".py", icon: "🐍" },
      java: { name: "Java", ext: ".java", icon: "☕" },
      csharp: { name: "C#", ext: ".cs", icon: "🔷" },
      cpp: { name: "C++", ext: ".cpp", icon: "⚡" },
      php: { name: "PHP", ext: ".php", icon: "🐘" },
      sql: { name: "SQL", ext: ".sql", icon: "🗄️" },
      xml: { name: "XML", ext: ".xml", icon: "📄" },
      yaml: { name: "YAML", ext: ".yaml", icon: "⚙️" },
      markdown: { name: "Markdown", ext: ".md", icon: "📝" },
      plaintext: { name: "纯文本", ext: ".txt", icon: "📄" },
    };

    // 初始化状态
    this.isInitialized = false;
    this.isFullscreen = false;
    this.currentFilename = "未命名.js";
    this.lastSaveTime = null;

    // 绑定DOM元素
    this.bindElements();

    // 初始化编辑器
    this.initializeEditor();
  }

  /**
   * 绑定DOM元素和事件监听器
   */
  bindElements() {
    // 获取DOM元素
    this.elements = {
      loadingOverlay: document.getElementById("loading-overlay"),
      statusFilename: document.getElementById("status-filename"),
      statusSize: document.getElementById("status-size"),
      statusLine: document.getElementById("status-line"),
      statusColumn: document.getElementById("status-column"),
      statusSelection: document.getElementById("status-selection"),
      editorContainer: document.getElementById("editor-container"),
    };

    // 绑定事件监听器
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 键盘快捷键
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // 窗口大小变化
    window.addEventListener("resize", () => {
      this.handleResize();
    });

    // 全屏状态变化
    document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange();
    });

    // 触摸事件 (移动端)
    if ("ontouchstart" in window) {
      this.setupTouchEvents();
    }
  }

  /**
   * 设置触摸事件 (移动端优化)
   */
  setupTouchEvents() {
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastTapTime = 0;

    this.elements.editorContainer?.addEventListener("touchstart", (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    });

    this.elements.editorContainer?.addEventListener("touchend", (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchDuration = Date.now() - touchStartTime;
      const touchDistance = Math.abs(touchEndY - touchStartY);

      // 双击手势 - 切换全屏
      if (touchDuration < 300 && touchDistance < 10) {
        const now = Date.now();
        if (lastTapTime && now - lastTapTime < 300) {
          this.toggleFullscreen();
        }
        lastTapTime = now;
      }
    });
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    if (this.editor) {
      this.editor.layout();

      // 移动端优化：自动调整minimap
      const shouldShowMinimap = window.innerWidth > 768;
      this.editor.updateOptions({
        minimap: { enabled: shouldShowMinimap },
      });
    }
  }

  /**
   * 处理全屏状态变化
   */
  handleFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
    if (this.isFullscreen) {
      this.showNotification("已进入全屏模式，按 ESC 或 F11 退出", "info");
    }
  }

  /**
   * 初始化Monaco编辑器
   */
  async initializeEditor() {
    try {
      this.updateProgress(20);

      // 配置Monaco加载路径
      require.config({
        paths: {
          vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs",
        },
        // 设置中文语言包
        "vs/nls": {
          availableLanguages: {
            "*": "zh-cn",
          },
        },
      });

      this.updateProgress(40);

      // 加载Monaco编辑器和中文语言包
      require(["vs/editor/editor.main"], () => {
        this.createEditor();
      });
    } catch (error) {
      console.error("初始化编辑器失败:", error);
      this.showNotification("编辑器初始化失败", "error");
    }
  }

  /**
   * 更新加载进度
   */
  updateProgress(percentage) {
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
  }

  /**
   * 创建编辑器实例
   */
  createEditor() {
    try {
      this.updateProgress(60);

      // 默认代码内容
      const defaultContent = `/**
 * 🚀 欢迎使用 Monaco 代码编辑器 - 简洁版
 * 现代化的代码编辑体验，专为开发者打造
 */

// 🌟 功能特性
const features = {
  智能提示: '🧠 IntelliSense 代码补全',
  语法高亮: '🎨 多语言语法着色',
  代码格式化: '✨ 一键美化代码',
  中文界面: '🇨🇳 官方中文语言包',
  移动端优化: '📱 触摸友好界面',
  简洁设计: '🎯 专注编码体验'
};

// 🎯 快速开始
function quickStart() {
  console.log('🎉 开始您的编程之旅！');
  
  // 💡 提示：尝试这些快捷键
  const shortcuts = {
    'Ctrl+S': '保存文件',
    'Ctrl+Shift+F': '格式化代码',
    'Ctrl+/': '切换注释',
    'F11': '全屏模式',
    'Ctrl+F': '查找文本',
    'Ctrl+H': '查找和替换'
  };
  
  return shortcuts;
}

// 🔥 立即体验
quickStart();

// 📝 在此编写您的代码...
// 右键查看中文菜单

class CodeEditor {
  constructor() {
    this.version = '2.1.0';
    this.features = [
      '官方中文语言包',
      '简洁界面设计',
      '完整功能支持'
    ];
  }
  
  start() {
    console.log('编辑器已启动');
    return this;
  }
}

new CodeEditor().start();
`;

      this.updateProgress(80);

      // 创建编辑器
      this.editor = monaco.editor.create(document.getElementById("monaco-editor"), {
        value: defaultContent,
        ...this.config,
      });

      this.updateProgress(100);

      // 隐藏加载动画
      setTimeout(() => {
        this.elements.loadingOverlay?.classList.add("hidden");
      }, 500);

      // 设置初始化完成标志
      this.isInitialized = true;

      // 隐藏class="overlayWidgets"的元素
      const overlayWidgets = document.querySelector(".overlayWidgets");
      if (overlayWidgets) {
        overlayWidgets.style.display = "none";
      }

      // 设置编辑器事件监听器
      this.setupEditorEventListeners();

      // 更新状态栏
      this.updateStatusBar();

      // 显示成功通知
      this.showNotification("🎉 编辑器加载完成，已启用中文界面", "success");
    } catch (error) {
      console.error("创建编辑器失败:", error);
      this.showNotification("创建编辑器失败", "error");
    }
  }

  /**
   * 设置编辑器事件监听器
   */
  setupEditorEventListeners() {
    if (!this.editor) return;

    // 内容变化事件
    this.editor.onDidChangeModelContent(() => {
      this.updateStatusBar();
    });

    // 光标位置变化事件
    this.editor.onDidChangeCursorPosition(() => {
      this.updateStatusBar();
    });

    // 选择内容变化事件
    this.editor.onDidChangeCursorSelection(() => {
      this.updateStatusBar();
    });

    // 编辑器焦点事件
    this.editor.onDidFocusEditorWidget(() => {
      console.log("编辑器获得焦点");
    });

    this.editor.onDidBlurEditorWidget(() => {
      console.log("编辑器失去焦点");
    });
  }

  /**
   * 更新状态栏信息
   */
  updateStatusBar() {
    if (!this.editor) return;

    try {
      // 获取当前位置
      const position = this.editor.getPosition();
      if (this.elements.statusLine) {
        this.elements.statusLine.textContent = position.lineNumber;
      }
      if (this.elements.statusColumn) {
        this.elements.statusColumn.textContent = position.column;
      }

      // 获取选择的文本长度
      const selection = this.editor.getSelection();
      const selectedText = this.editor.getModel().getValueInRange(selection);
      if (this.elements.statusSelection) {
        this.elements.statusSelection.textContent = selectedText.length;
      }

      // 获取文件大小
      const content = this.editor.getValue();
      const size = new TextEncoder().encode(content).length;
      if (this.elements.statusSize) {
        this.elements.statusSize.textContent = this.formatFileSize(size);
      }
    } catch (error) {
      console.error("更新状态栏失败:", error);
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 字节";
    const k = 1024;
    const sizes = ["字节", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  /**
   * 设置编程语言
   */
  setLanguage(language) {
    if (!this.editor || !this.languageMap[language]) return;

    try {
      // 更新编辑器语言
      monaco.editor.setModelLanguage(this.editor.getModel(), language);
      this.config.language = language;

      // 更新文件名
      const langInfo = this.languageMap[language];
      this.currentFilename = "未命名" + langInfo.ext;
      if (this.elements.statusFilename) {
        this.elements.statusFilename.textContent = `${langInfo.icon} ${this.currentFilename}`;
      }

      this.showNotification(`语言已切换为: ${langInfo.name}`, "success");
    } catch (error) {
      console.error("设置语言失败:", error);
      this.showNotification("设置语言失败", "error");
    }
  }

  /**
   * 设置编辑器主题
   */
  setEditorTheme(theme) {
    if (!this.editor) return;

    try {
      monaco.editor.setTheme(theme);
      this.config.theme = theme;
      this.showNotification(`编辑器主题已切换: ${theme}`, "success");
    } catch (error) {
      console.error("设置主题失败:", error);
      this.showNotification("设置主题失败", "error");
    }
  }

  /**
   * 设置字体大小
   */
  setFontSize(size) {
    if (!this.editor || size < 10 || size > 32) return;

    try {
      this.editor.updateOptions({ fontSize: size });
      this.config.fontSize = size;
      this.showNotification(`字体大小已设置为: ${size}px`, "success");
    } catch (error) {
      console.error("设置字体大小失败:", error);
      this.showNotification("设置字体大小失败", "error");
    }
  }

  /**
   * 切换只读模式
   */
  toggleReadOnly() {
    if (!this.editor) return;

    try {
      const newReadOnly = !this.config.readOnly;
      this.editor.updateOptions({ readOnly: newReadOnly });
      this.config.readOnly = newReadOnly;

      this.showNotification(`${newReadOnly ? "已开启" : "已关闭"}只读模式`, "info");
    } catch (error) {
      console.error("切换只读模式失败:", error);
      this.showNotification("切换只读模式失败", "error");
    }
  }

  /**
   * 切换全屏模式
   */
  toggleFullscreen() {
    try {
      if (!this.isFullscreen) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } catch (error) {
      console.error("切换全屏模式失败:", error);
      this.showNotification("切换全屏模式失败", "error");
    }
  }

  /**
   * 切换深浅色主题
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    // 更新编辑器主题
    const editorTheme = newTheme === "dark" ? "vs-dark" : "vs";
    if (this.editor) {
      this.setEditorTheme(editorTheme);
    }

    this.showNotification(`已切换到${newTheme === "dark" ? "深色" : "浅色"}主题`, "success");
  }

  /**
   * 格式化代码
   */
  formatCode() {
    if (!this.editor) return;

    try {
      this.editor.getAction("editor.action.formatDocument").run();
      this.showNotification("✨ 代码格式化完成", "success");
    } catch (error) {
      console.error("格式化代码失败:", error);
      this.showNotification("格式化代码失败", "error");
    }
  }

  /**
   * 保存文件
   */
  saveFile(filename = null) {
    if (!this.editor) return;

    try {
      const content = this.editor.getValue();
      const finalFilename = filename || this.currentFilename;

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      this.lastSaveTime = new Date();
      this.showNotification(`💾 文件已保存: ${finalFilename}`, "success");
    } catch (error) {
      console.error("保存文件失败:", error);
      this.showNotification("保存文件失败", "error");
    }
  }

  /**
   * 处理键盘快捷键
   */
  handleKeyboardShortcuts(e) {
    // Ctrl+S: 保存文件
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      this.saveFile();
    }

    // Ctrl+Shift+F: 格式化代码
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      e.preventDefault();
      this.formatCode();
    }

    // F11: 全屏
    if (e.key === "F11") {
      e.preventDefault();
      this.toggleFullscreen();
    }

    // Ctrl+Shift+T: 切换主题
    if (e.ctrlKey && e.shiftKey && e.key === "T") {
      e.preventDefault();
      this.toggleTheme();
    }

    // Ctrl+Shift+R: 切换只读模式
    if (e.ctrlKey && e.shiftKey && e.key === "R") {
      e.preventDefault();
      this.toggleReadOnly();
    }
  }

  /**
   * 显示通知
   */
  showNotification(message, type = "info", duration = 3000) {
    // 移除现有通知
    const existing = document.querySelector(".notification");
    if (existing) {
      existing.remove();
    }

    // 创建新通知
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // 添加到通知容器或body
    const container = document.getElementById("notification-container") || document.body;
    container.appendChild(notification);

    // 自动移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.transform = "translateX(100%)";
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, duration);

    // 点击移除通知
    notification.addEventListener("click", () => {
      notification.remove();
    });
  }

  // ============ 公共API方法 ============

  /**
   * 获取编辑器内容
   */
  getValue() {
    return this.editor ? this.editor.getValue() : "";
  }

  /**
   * 设置编辑器内容
   */
  setValue(content) {
    if (this.editor) {
      this.editor.setValue(content);
      this.updateStatusBar();
    }
  }

  /**
   * 在当前位置插入文本
   */
  insertText(text) {
    if (this.editor) {
      const position = this.editor.getPosition();
      this.editor.executeEdits("insert-text", [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: text,
        },
      ]);
    }
  }

  /**
   * 获取选中的文本
   */
  getSelectedText() {
    if (!this.editor) return "";
    const selection = this.editor.getSelection();
    return this.editor.getModel().getValueInRange(selection);
  }

  /**
   * 设置选中文本
   */
  setSelection(startLine, startColumn, endLine, endColumn) {
    if (this.editor) {
      const range = new monaco.Range(startLine, startColumn, endLine, endColumn);
      this.editor.setSelection(range);
    }
  }

  /**
   * 跳转到指定行
   */
  goToLine(lineNumber) {
    if (this.editor) {
      this.editor.revealLineInCenter(lineNumber);
      this.editor.setPosition({ lineNumber, column: 1 });
    }
  }

  /**
   * 查找文本
   */
  find(text, caseSensitive = false) {
    if (this.editor) {
      this.editor.getAction("actions.find").run();
    }
  }

  /**
   * 替换文本
   */
  replace() {
    if (this.editor) {
      this.editor.getAction("editor.action.startFindReplaceAction").run();
    }
  }

  /**
   * 撤销操作
   */
  undo() {
    if (this.editor) {
      this.editor.getModel().undo();
    }
  }

  /**
   * 重做操作
   */
  redo() {
    if (this.editor) {
      this.editor.getModel().redo();
    }
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    if (this.editor) {
      Object.assign(this.config, newConfig);
      this.editor.updateOptions(newConfig);
      this.updateStatusBar();
    }
  }

  /**
   * 获取编辑器实例
   */
  getEditor() {
    return this.editor;
  }

  /**
   * 获取当前语言
   */
  getLanguage() {
    return this.config.language;
  }

  /**
   * 获取当前主题
   */
  getTheme() {
    return this.config.theme;
  }

  /**
   * 获取字体大小
   */
  getFontSize() {
    return this.config.fontSize;
  }

  /**
   * 是否为只读模式
   */
  isReadOnly() {
    return this.config.readOnly;
  }

  /**
   * 获取当前文件名
   */
  getFilename() {
    return this.currentFilename;
  }

  /**
   * 设置文件名
   */
  setFilename(filename) {
    this.currentFilename = filename;
    if (this.elements.statusFilename) {
      this.elements.statusFilename.textContent = filename;
    }
  }

  /**
   * 获取编辑器状态信息
   */
  getStatusInfo() {
    if (!this.editor) return null;

    const position = this.editor.getPosition();
    const selection = this.editor.getSelection();
    const selectedText = this.editor.getModel().getValueInRange(selection);
    const content = this.editor.getValue();
    const size = new TextEncoder().encode(content).length;

    return {
      filename: this.currentFilename,
      language: this.config.language,
      theme: this.config.theme,
      fontSize: this.config.fontSize,
      readOnly: this.config.readOnly,
      line: position.lineNumber,
      column: position.column,
      selection: selectedText.length,
      size: size,
      sizeFormatted: this.formatFileSize(size),
      lastSaveTime: this.lastSaveTime,
    };
  }

  /**
   * 重置编辑器到默认状态
   */
  reset() {
    if (this.editor) {
      this.editor.setValue("");
      this.config.language = "javascript";
      this.config.theme = "vs-dark";
      this.config.fontSize = 14;
      this.config.readOnly = false;
      this.currentFilename = "未命名.js";

      this.editor.updateOptions(this.config);
      this.updateStatusBar();

      this.showNotification("编辑器已重置", "info");
    }
  }

  /**
   * 加载文件内容
   */
  loadFile(file) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        reject(new Error("参数必须是File对象"));
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target.result;
          this.setValue(content);

          // 根据文件扩展名设置语言
          const extension = file.name.split(".").pop().toLowerCase();
          const languageMap = {
            js: "javascript",
            ts: "typescript",
            ets: "typescript",
            html: "html",
            css: "css",
            json: "json",
            py: "python",
            java: "java",
            cs: "csharp",
            cpp: "cpp",
            c: "cpp",
            php: "php",
            sql: "sql",
            xml: "xml",
            yaml: "yaml",
            yml: "yaml",
            md: "markdown",
            txt: "plaintext",
          };

          const detectedLanguage = languageMap[extension] || "plaintext";
          this.setLanguage(detectedLanguage);
          this.setFilename(file.name);

          this.showNotification(`文件 ${file.name} 加载成功`, "success");
          resolve(content);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("文件读取失败"));
      };

      reader.readAsText(file, "UTF-8");
    });
  }

  /**
   * 销毁编辑器
   */
  dispose() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
      this.isInitialized = false;
    }
  }
}

// 初始化编辑器管理器
let editorManager;

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  // 恢复主题设置
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  // 创建编辑器管理器实例
  editorManager = new MonacoEditorManager();

  // 将编辑器管理器暴露到全局
  window.monaco_editor = editorManager;

  // 拖拽文件支持
  const editorContainer = document.getElementById("editor-container");
  if (editorContainer) {
    // 防止默认拖拽行为
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      editorContainer.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 拖拽进入和离开的视觉反馈
    ["dragenter", "dragover"].forEach((eventName) => {
      editorContainer.addEventListener(eventName, highlight, false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      editorContainer.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
      editorContainer.style.background = "rgba(0, 217, 255, 0.1)";
    }

    function unhighlight(e) {
      editorContainer.style.background = "";
    }

    // 处理文件拖拽
    editorContainer.addEventListener("drop", handleDrop, false);

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;

      if (files.length > 0) {
        const file = files[0];
        if (window.monaco_editor) {
          window.monaco_editor.loadFile(file).catch((error) => {
            console.error("加载文件失败:", error);
            window.monaco_editor.showNotification("文件加载失败", "error");
          });
        }
      }
    }
  }
});

// ============ 全局便捷API ============

/**
 * 全局便捷方法 - 获取编辑器内容
 */
window.getEditorValue = () => {
  return window.monaco_editor ? window.monaco_editor.getValue() : "";
};

/**
 * 全局便捷方法 - 设置编辑器内容
 */
window.setEditorValue = (content) => {
  if (window.monaco_editor) {
    window.monaco_editor.setValue(content);
  }
};

/**
 * 全局便捷方法 - 设置编程语言
 */
window.setEditorLanguage = (language) => {
  if (window.monaco_editor) {
    window.monaco_editor.setLanguage(language);
  }
};

/**
 * 全局便捷方法 - 设置编辑器主题
 */
window.setEditorTheme = (theme) => {
  if (window.monaco_editor) {
    window.monaco_editor.setEditorTheme(theme);
  }
};

/**
 * 全局便捷方法 - 设置字体大小
 */
window.setEditorFontSize = (size) => {
  if (window.monaco_editor) {
    window.monaco_editor.setFontSize(size);
  }
};

/**
 * 全局便捷方法 - 设置只读模式
 */
window.setEditorReadOnly = (readOnly) => {
  if (window.monaco_editor && window.monaco_editor.isReadOnly() !== readOnly) {
    window.monaco_editor.toggleReadOnly();
  }
};

/**
 * 全局便捷方法 - 格式化代码
 */
window.formatEditorCode = () => {
  if (window.monaco_editor) {
    window.monaco_editor.formatCode();
  }
};

/**
 * 全局便捷方法 - 保存文件
 */
window.saveEditorFile = (filename) => {
  if (window.monaco_editor) {
    window.monaco_editor.saveFile(filename);
  }
};

/**
 * 全局便捷方法 - 切换主题
 */
window.toggleEditorTheme = () => {
  if (window.monaco_editor) {
    window.monaco_editor.toggleTheme();
  }
};

/**
 * 全局便捷方法 - 切换全屏
 */
window.toggleEditorFullscreen = () => {
  if (window.monaco_editor) {
    window.monaco_editor.toggleFullscreen();
  }
};

/**
 * 全局便捷方法 - 获取编辑器状态
 */
window.getEditorStatus = () => {
  return window.monaco_editor ? window.monaco_editor.getStatusInfo() : null;
};

/**
 * 全局便捷方法 - 获取编辑器实例
 */
window.getEditorInstance = () => {
  return window.monaco_editor ? window.monaco_editor.getEditor() : null;
};

/**
 * 全局便捷方法 - 加载文件
 */
window.loadEditorFile = (file) => {
  if (window.monaco_editor) {
    return window.monaco_editor.loadFile(file);
  }
  return Promise.reject(new Error("编辑器未初始化"));
};

/**
 * 全局便捷方法 - 重置编辑器
 */
window.resetEditor = () => {
  if (window.monaco_editor) {
    window.monaco_editor.reset();
  }
};

/**
 * 全局便捷方法 - 跳转到指定行
 */
window.goToEditorLine = (lineNumber) => {
  if (window.monaco_editor) {
    window.monaco_editor.goToLine(lineNumber);
  }
};

/**
 * 全局便捷方法 - 插入文本
 */
window.insertEditorText = (text) => {
  if (window.monaco_editor) {
    window.monaco_editor.insertText(text);
  }
};

/**
 * 全局便捷方法 - 获取选中文本
 */
window.getEditorSelectedText = () => {
  return window.monaco_editor ? window.monaco_editor.getSelectedText() : "";
};

console.log("🚀 Monaco 编辑器简洁版已就绪！");
console.log("📚 使用 window.monaco_editor 访问完整API");
console.log("🔧 或使用便捷方法: getEditorValue(), setEditorValue(), setEditorLanguage() 等");
console.log("⌨️  快捷键: Ctrl+S(保存), Ctrl+Shift+F(格式化), F11(全屏), Ctrl+Shift+T(切换主题)");
console.log("📁 支持文件拖拽加载");
console.log("🇨🇳 已启用官方中文语言包，右键菜单为中文");
