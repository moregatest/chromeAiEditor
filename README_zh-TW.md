# AI 表單助手 Chrome 擴充功能

一個 Chrome MV3 擴充功能，當偵測到特定回應標頭時，會根據頁面內容使用 AI 自動填寫網頁表單欄位。

## 功能特色

- 🤖 **自動觸發**：當偵測到 `X-AI-Assist: on` 回應標頭時自動啟動
- 📝 **內容收集**：從標記為 `data-ai-context` 的元素收集資料
- 🎯 **精確填寫**：僅根據設定填寫指定的表單欄位
- 🔧 **模擬模式**：無需 AI 端點即可進行測試
- ⚙️ **彈性設定**：支援標頭和頁面層級的設定
- 🔒 **安全性**：僅限 HTTPS、白名單網域、API 金鑰保護

## 安裝方式

1. 克隆或下載此儲存庫
2. 開啟 Chrome 並前往 `chrome://extensions/`
3. 在右上角啟用「開發者模式」
4. 點擊「載入未封裝項目」並選擇擴充功能目錄
5. 擴充功能圖示應該會出現在您的瀏覽器工具列中

## 設定

### 擴充功能設定

1. 點擊擴充功能圖示並選擇「開啟設定」
2. 設定您的 AI 端點 URL（選用 - 留空則使用模擬模式）
3. 如果您的 AI 服務需要，請新增您的 API 金鑰
4. 儲存設定

### 網頁整合

要觸發擴充功能，您的網頁必須包含回應標頭：

```
X-AI-Assist: on
```

#### 設定方法

**方法 1：回應標頭（適用於短設定）**
```
X-AI-Config: <base64url編碼的json>
```

**方法 2：頁面腳本（建議用於較大的設定）**
```html
<script type="application/json" id="ai-config">
{
  "prompt": "根據客戶資訊填寫表單",
  "targets": [
    {
      "name": "customerName",
      "selector": "#name",
      "type": "text"
    }
  ]
}
</script>
```

#### 內容標記

標記為 AI 提供內容的元素：

```html
<div data-ai-context="customer-info">
  <h3>客戶詳細資料</h3>
  <p>姓名：張三</p>
  <p>電子郵件：zhang@example.com</p>
</div>
```

## 設定結構

```json
{
  "prompt": "告訴 AI 如何填寫表單的指示",
  "targets": [
    {
      "name": "欄位名稱",
      "selector": "#css選擇器", 
      "type": "text|json"
    }
  ]
}
```

### 設定屬性

- **prompt**：發送給 AI 的指示
- **targets**：要填寫的表單欄位陣列
  - **name**：欄位的唯一識別碼
  - **selector**：用於尋找表單元素的 CSS 選擇器
  - **type**：純文字使用 "text"，JSON 資料使用 "json"

## 測試

### 使用範例伺服器

1. 導航到 `example/` 目錄
2. 執行測試伺服器：
   ```bash
   node simple-server.js
   ```
3. 在 Chrome 中開啟 `http://localhost:3000`
4. 頁面會自動觸發擴充功能

### 模擬模式測試

如果沒有設定 AI 端點，擴充功能會使用模擬回應：
- 欄位會填入「Mock content for [fieldName]」
- JSON 欄位會得到 `{"mock": true, "value": "Mock data for [fieldName]"}`

## AI 端點需求

您的 AI 服務應該接受此格式的 POST 請求：

**請求：**
```json
{
  "prompt": "使用者定義的指示",
  "context": {
    "title": "頁面標題",
    "description": "Meta 描述",
    "contextBlocks": [
      {
        "label": "內容標籤",
        "content": "內容內容"
      }
    ]
  },
  "targets": [
    {
      "name": "欄位名稱",
      "selector": "#選擇器",
      "type": "text"
    }
  ]
}
```

**回應：**
```json
{
  "欄位名稱": "產生的內容",
  "另一個欄位": "更多內容"
}
```

## 安全功能

- **僅限 HTTPS**：擴充功能僅在安全頁面上運作
- **僅限主框架**：忽略 iframe 請求
- **網域白名單**：可在 manifest.json 中設定
- **API 金鑰保護**：本地儲存，透過背景腳本發送

## 開發

### 專案結構

```
├── manifest.json          # 擴充功能清單
├── background.js          # 服務工作者（API 呼叫、標頭偵測）
├── content.js            # 內容腳本（DOM 操作、內容收集）
├── options.html/js       # 設定頁面
├── popup.html/js         # 擴充功能彈出視窗
├── example/              # 測試檔案
│   ├── test-form.html   # 範例網頁
│   └── simple-server.js # 帶標頭的測試伺服器
└── README.md
```

### 關鍵功能

- **標頭偵測**：`background.js` 監控 `webRequest.onHeadersReceived`
- **內容收集**：`content.js` 收集 `data-ai-context` 元素
- **欄位填寫**：帶視覺指示器的自動表單填寫
- **模擬模式**：未設定 AI 端點時的後備方案

## 疑難排解

### 擴充功能未觸發
- 驗證頁面具有 `X-AI-Assist: on` 回應標頭
- 檢查頁面是否透過 HTTPS 提供
- 開啟開發者工具網路標籤以確認標頭

### 欄位未填寫
- 確保目標中的 CSS 選擇器正確
- 檢查擴充功能執行時表單元素是否存在
- 驗證 AI 回應格式符合預期結構

### 模擬模式問題
- 清除擴充功能設定並重新載入
- 檢查主控台錯誤訊息
- 驗證頁面設定是否為有效的 JSON

## 瀏覽器相容性

- Chrome MV3（清單版本 3）
- 最低 Chrome 版本：88+

## 代辦列表 (TODO)

### 🚀 計劃中的功能改進

- [x] **介面改為側邊欄並支援多重對話**
  - 將現有的彈出視窗介面改為側邊欄形式
  - 實現多個對話會話的管理功能
  - 支援對話歷史記錄和切換
  - 改善使用者體驗和工作流程

- [x] **對話框顯示 JSON 回應並支援選擇性寫入**
  - 在對話框中直接顯示 AI 回應的 JSON 內容
  - 提供使用者預覽和確認機制
  - 允許使用者選擇是否要將資料寫入到伺服器
  - 取代強制性的表單填寫模式，提供更靈活的互動方式

### 📋 其他改進項目

- [x] 支援更多表單元素類型 (select, checkbox, radio)
- [ ] 添加批次處理功能
- [ ] 改善錯誤處理和使用者回饋
- [ ] 支援自訂 AI 模型選擇
- [ ] 添加使用統計和分析功能

## 授權條款

MIT 授權條款 - 詳見 LICENSE 檔案
