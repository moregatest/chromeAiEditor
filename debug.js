class DebugLogger {
  static async isEnabled() {
    try {
      const settings = await chrome.storage.local.get(['debugMode']);
      return settings.debugMode === true;
    } catch (error) {
      return false;
    }
  }
  
  static async log(context, message, data = null) {
    if (await this.isEnabled()) {
      const timestamp = new Date().toISOString();
      const prefix = `[AI-Assistant] ${timestamp} [${context}]`;
      
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }
  
  static async warn(context, message, data = null) {
    if (await this.isEnabled()) {
      const timestamp = new Date().toISOString();
      const prefix = `[AI-Assistant] ${timestamp} [${context}]`;
      
      if (data) {
        console.warn(prefix, message, data);
      } else {
        console.warn(prefix, message);
      }
    }
  }
  
  static async error(context, message, error = null) {
    if (await this.isEnabled()) {
      const timestamp = new Date().toISOString();
      const prefix = `[AI-Assistant] ${timestamp} [${context}]`;
      
      if (error) {
        console.error(prefix, message, error);
      } else {
        console.error(prefix, message);
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugLogger;
}