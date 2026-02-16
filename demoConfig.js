// demoConfig.js
// ✅ Demo Mode minh bạch (kết quả preset để test UI).
// Tắt demo: set window.DEMO_MODE = false

window.DEMO_MODE = true;
window.DEMO_BANNER_TEXT = "DEMO MODE • Kết quả được cấu hình để test";

// Có thể match theo key hoặc label (không phân biệt hoa thường, có/không dấu)
window.DEMO_FORCE = {
  wheel: {
    // User AQ (mình map cả 'aq' và người có key/label tương ứng nếu có)
    "aq": "ring",
    "ethereal": "ring",        // key của "Anh Quỳnh" trong people.json
    "anh quynh": "ring",

    // còn lại: không trúng giải lớn => sang lắc quẻ
    "default": "none"
  },
  fortune: {
    // Hồng Nhung
    "yellowperson": 200000,
    "hong nhung": 200000,
    "hồng nhung": 200000,

    // còn lại
    "default": 50000
  }
};
