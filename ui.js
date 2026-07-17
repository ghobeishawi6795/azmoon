/* ---------------------------------------------------------
Shared utilities (KV helpers) + shared UI primitives
--------------------------------------------------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
async function getJSON(key) {
  try {
    const r = await fetch(`/api/kv?key=${encodeURIComponent(key)}`);
    if (r.status === 404) return null;
    if (!r.ok) return null;
    const data = await r.json();
    return data.v;
  } catch {
    return null;
  }
}
async function setJSON(key, value) {
  try {
    const r = await fetch("/api/kv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ k: key, v: value }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
async function deleteKey(key) {
  try {
    await fetch(`/api/kv?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch {
    /* ignore */
  }
}
async function listPrefix(prefix) {
  try {
    const r = await fetch(`/api/list?prefix=${encodeURIComponent(prefix)}`);
    if (!r.ok) return [];
    const data = await r.json();
    return data.keys || [];
  } catch {
    return [];
  }
}
async function loadAll(prefix) {
  const keys = await listPrefix(prefix);
  const items = await Promise.all(keys.map((k) => getJSON(k)));
  return items.filter(Boolean);
}

// Works for both multiple-choice answers (mark if correct) and essay answers
// that have been manually graded (awarded_mark set by the teacher).
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

/* ---------------------------------------------------------
Small UI atoms
--------------------------------------------------------- */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3A4A63", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1.5px solid #E2E8F0",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  background: "#fff",
  color: "#1E293B",
  transition: "border-color .15s",
};

function TextInput(props) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
      style={{ ...inputStyle, borderColor: focus ? "#2563EB" : "#E2E8F0", ...(props.style || {}) }}
    />
  );
}

function Button({ children, variant = "primary", style, ...rest }) {
  const variants = {
    primary: { background: "#2563EB", color: "#fff", border: "none" },
    ghost: { background: "#fff", color: "#334155", border: "1.5px solid #E2E8F0" },
    danger: { background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA" },
    success: { background: "#16A34A", color: "#fff", border: "none" },
  };
  return (
    <button
      {...rest}
      style={{
        ...variants[variant],
        padding: "10px 18px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "filter .15s, transform .1s",
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function StatCard({ icon: IconCmp, label, value, delta, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 22px", flex: 1,
      border: "1px solid #EEF1F6", minWidth: 180,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1E293B" }}>{value}</div>
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: color + "1A",
          display: "flex", alignItems: "center", justifyContent: "center", color,
        }}>
          <IconCmp size={20} />
        </div>
      </div>
      {delta && <div style={{ fontSize: 12, color: "#16A34A", marginTop: 10, fontWeight: 600 }}>{delta}</div>}
    </div>
  );
}

function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: { bg: "#EFF6FF", fg: "#2563EB" },
    green: { bg: "#F0FDF4", fg: "#16A34A" },
    orange: { bg: "#FFFBEB", fg: "#D97706" },
    red: { bg: "#FEF2F2", fg: "#DC2626" },
    gray: { bg: "#F1F5F9", fg: "#475569" },
  };
  const t = tones[tone];
  return (
    <span style={{
      background: t.bg, color: t.fg, fontSize: 12, fontWeight: 700,
      padding: "4px 10px", borderRadius: 999, display: "inline-block",
    }}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------
Sidebar (shared across teacher screens)
--------------------------------------------------------- */
function Sidebar({ active, onNavigate, onLogout, teacherName }) {
  const items = [
    { key: "dashboard", label: "داشبورد", icon: LayoutDashboard },
    { key: "exams", label: "آزمون‌ها", icon: FileText },
    { key: "questionbank", label: "بانک سوال", icon: Library },
    { key: "classes", label: "کلاس‌ها", icon: Users },
    { key: "students", label: "دانش‌آموزان", icon: Users },
    { key: "messages", label: "پیام‌ها", icon: MessageSquare },
    { key: "results", label: "نتایج", icon: BarChart3 },
    { key: "settings", label: "تنظیمات", icon: Settings },
  ];
  return (
    <div style={{
      width: 230, background: "#132A52", minHeight: "100%", display: "flex",
      flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 20px", borderBottom: "1px solid #22385F" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GraduationCap size={19} color="#fff" />
        </div>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>آزمون‌ساز</span>
      </div>
      <div style={{ padding: "14px 12px", flex: 1 }}>
        {items.map((it) => {
          const isActive = active === it.key;
          const IconCmp = it.icon;
          return (
            <div
              key={it.key}
              onClick={() => onNavigate(it.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                borderRadius: 10, cursor: "pointer", marginBottom: 4,
                background: isActive ? "#2563EB" : "transparent",
                color: isActive ? "#fff" : "#AAB8D1",
                fontSize: 14, fontWeight: 600, transition: "background .15s",
              }}
            >
              <IconCmp size={17} />
              {it.label}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #22385F" }}>
        <div style={{ fontSize: 12, color: "#7C8CAE", padding: "6px 14px 12px" }}>{teacherName}</div>
        <div
          onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, cursor: "pointer", color: "#F87171", fontSize: 14, fontWeight: 600 }}
        >
          <LogOut size={17} />
          خروج
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
Admin Sidebar (for admin dashboard)
--------------------------------------------------------- */
function AdminSidebar({ active, onNavigate, onLogout, teacherName }) {
  const items = [
    { key: "dashboard", label: "داشبورد مدیر", icon: LayoutDashboard },
    { key: "teachers", label: "مدیریت معلمان", icon: Users },
    { key: "all-exams", label: "همه آزمون‌ها", icon: FileText },
    { key: "all-results", label: "همه نتایج", icon: BarChart3 },
    { key: "settings", label: "تنظیمات", icon: Settings },
  ];
  return (
    <div style={{
      width: 230, background: "#0F172A", minHeight: "100%", display: "flex",
      flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 20px", borderBottom: "1px solid #1E293B" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Award size={19} color="#fff" />
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>پنل مدیر</div>
          <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>سطح دسترسی کامل</div>
        </div>
      </div>
      <div style={{ padding: "14px 12px", flex: 1 }}>
        {items.map((it) => {
          const isActive = active === it.key;
          const IconCmp = it.icon;
          return (
            <div
              key={it.key}
              onClick={() => onNavigate(it.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                borderRadius: 10, cursor: "pointer", marginBottom: 4,
                background: isActive ? "#F59E0B" : "transparent",
                color: isActive ? "#fff" : "#AAB8D1",
                fontSize: 14, fontWeight: 600, transition: "background .15s",
              }}
            >
              <IconCmp size={17} />
              {it.label}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #1E293B" }}>
        <div style={{ fontSize: 12, color: "#7C8CAE", padding: "6px 14px 12px" }}>{teacherName} (مدیر)</div>
        <div
          onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, cursor: "pointer", color: "#F87171", fontSize: 14, fontWeight: 600 }}
        >
          <LogOut size={17} />
          خروج
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, teacherName }) {
  const today = new Date().toLocaleDateString("fa-IR");
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1E293B", margin: 0 }}>{title}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 13, color: "#64748B" }}>{today}</span>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
          {teacherName?.[0] || "م"}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
AUTH SCREENS
--------------------------------------------------------- */
function EmptyState({ text, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>{text}</div>
      {actionLabel && <Button onClick={onAction}><Plus size={16} />{actionLabel}</Button>}
    </div>
  );
}

/* ---------------------------------------------------------
EXAMS LIST + CREATE
--------------------------------------------------------- */
function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 26, width: "100%", maxWidth: 420, maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1E293B" }}>{title}</div>
          <X size={18} style={{ cursor: "pointer", color: "#94A3B8" }} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
QUESTION MANAGEMENT (add question w/ live preview)
--------------------------------------------------------- */
function parseBulkQuestions(text) {
  const blocks = text.split(/\n\s*(?:---)?\s*\n/).map((b) => b.trim()).filter(Boolean);
  const parsed = [];
  const errors = [];
  blocks.forEach((block, idx) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const qLine = lines.find((l) => /^Q:/i.test(l));
    const typeLine = lines.find((l) => /^TYPE:/i.test(l));
    const isEssay = typeLine && /essay|تشریحی/i.test(typeLine.replace(/^TYPE:/i, "").trim());
    const markLine = lines.find((l) => /^MARK:/i.test(l));
    if (!qLine) { errors.push(idx + 1); return; }
    if (isEssay) {
      const keywordsLine = lines.find((l) => /^KEYWORDS:/i.test(l));
      const answerLine = lines.find((l) => /^ANSWER:/i.test(l));
      parsed.push({
        type: "essay",
        question_text: qLine.replace(/^Q:/i, "").trim(),
        model_answer: answerLine ? answerLine.replace(/^ANSWER:/i, "").trim() : "",
        keywords: keywordsLine ? keywordsLine.replace(/^KEYWORDS:/i, "").trim() : "",
        mark: markLine ? Number(markLine.replace(/^MARK:/i, "").trim()) || 1 : 1,
      });
      return;
    }
    const optA = lines.find((l) => /^A\)/i.test(l));
    const optB = lines.find((l) => /^B\)/i.test(l));
    const optC = lines.find((l) => /^C\)/i.test(l));
    const optD = lines.find((l) => /^D\)/i.test(l));
    const ansLine = lines.find((l) => /^ANSWER:/i.test(l));
    if (!optA || !optB || !optC || !optD || !ansLine) { errors.push(idx + 1); return; }
    const answers = ansLine.replace(/^ANSWER:/i, "").trim().toUpperCase().split(/[,\s]+/).filter(Boolean);
    parsed.push({
      type: answers.length > 1 ? "mc_multi" : "mc",
      question_text: qLine.replace(/^Q:/i, "").trim(),
      option_a: optA.replace(/^A\)/i, "").trim(),
      option_b: optB.replace(/^B\)/i, "").trim(),
      option_c: optC.replace(/^C\)/i, "").trim(),
      option_d: optD.replace(/^D\)/i, "").trim(),
      correct_answer: answers.length === 1 ? answers[0] : undefined,
      correct_answers: answers.length > 1 ? answers : undefined,
      mark: markLine ? Number(markLine.replace(/^MARK:/i, "").trim()) || 1 : 1,
    });
  });
  return { parsed, errors };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

/* ---------------------------------------------------------
RESULTS
--------------------------------------------------------- */
function generateCode(existingCodes) {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (existingCodes.includes(code));
  return code;
}(/^C\)/i, "").trim(),
      option_d: optD.replace(/^D\)/i, "").trim(),
      correct_answer: answers.length === 1 ? answers[0] : undefined,
      correct_answers: answers.length > 1 ? answers : undefined,
      mark: markLine ? Number(markLine.replace(/^MARK:/i, "").trim()) || 1 : 1,
    });
  });
  return { parsed, errors };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

/* ---------------------------------------------------------
   RESULTS
--------------------------------------------------------- */

function generateCode(existingCodes) {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (existingCodes.includes(code));
  return code;
}
