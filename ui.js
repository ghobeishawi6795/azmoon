/* ---------------------------------------------------------
Shared utilities (KV helpers) + shared UI primitives
--------------------------------------------------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ============================================
// ✅ نسخه localStorage (بدون نیاز به سرور)
// ============================================
async function getJSON(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

async function deleteKey(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

async function listPrefix(prefix) {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    return keys;
  } catch {
    return [];
  }
}

async function loadAll(prefix) {
  const keys = await listPrefix(prefix);
  const items = await Promise.all(keys.map((k) => getJSON(k)));
  return items.filter(Boolean);
}

// بقیه کدها به همین شکل بمونن...
function awardedMarkOf(a) {
  if (a.awarded_mark != null) return a.awarded_mark;
  return a.is_correct ? a.mark : 0;
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// ادامه کدهای ui.js (همون Field, TextInput, Button, ...)
// ============================================
// ... بقیه کدها رو از فایل اصلی خودت کپی کن ...
