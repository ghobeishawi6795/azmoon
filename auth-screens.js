/* ---------------------------------------------------------
AUTH SCREENS + STUDENT PORTAL
--------------------------------------------------------- */

function StudentPortalScreen({ roster, students, answers, exams, questions, classes, messages }) {
  const [codeInput, setCodeInput] = useState("");
  const [activeRoster, setActiveRoster] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = () => {
    const code = codeInput.trim();
    if (!code) return;
    const found = roster.find((r) => r.code === code);
    if (found) {
      setActiveRoster(found);
      setNotFound(false);
    } else {
      setActiveRoster(null);
      setNotFound(true);
    }
  };

  if (!activeRoster) {
    return (
      <div style={{ padding: "20px 10px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>پرتال دانش‌آموزی</div>
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>کدی که معلمت به تو داده را وارد کن.</div>
        <Field label="کد دانش‌آموزی">
          <TextInput
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="کد خود را وارد کن"
            style={{ fontSize: 18, letterSpacing: 3, textAlign: "center", fontWeight: 700 }}
            maxLength={6}
          />
        </Field>
        {notFound && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14 }}>کد پیدا نشد. از معلم خود بپرس.</div>}
        <Button type="button" onClick={lookup} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }}>ورود</Button>
      </div>
    );
  }

  const className = classes.find((c) => c.id === activeRoster.class_id)?.name || "—";
  const myStudentIds = students
    .filter((s) => s.teacher_id === activeRoster.teacher_id && s.fullname.trim() === activeRoster.fullname.trim())
    .map((s) => s.id);
  const myAnswers = answers.filter((a) => myStudentIds.includes(a.student_id));
  const byExam = {};
  myAnswers.forEach((a) => {
    byExam[a.exam_id] = byExam[a.exam_id] || [];
    byExam[a.exam_id].push(a);
  });

  const results = Object.entries(byExam).map(([examId, list]) => {
    const exam = exams.find((e) => e.id === examId);
    const totalMarks = list.reduce((s, a) => s + (a.mark || 1), 0);
    const gotMarks = list.reduce((s, a) => s + awardedMarkOf(a), 0);
    const pendingCount = list.filter((a) => a.is_correct === null && a.awarded_mark == null).length;
    const pct = totalMarks ? Math.round((gotMarks / totalMarks) * 1000) / 10 : 0;
    const date = list[0]?.answered_at ? new Date(list[0].answered_at).toLocaleDateString("fa-IR") : "—";
    return { examId, title: exam?.title || "—", pct, pendingCount, date };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const myMessages = messages.filter((m) =>
    m.teacher_id === activeRoster.teacher_id &&
    (m.target_type === "all" || (m.target_type === "class" && m.target_id === activeRoster.class_id) || (m.target_type === "student" && m.target_id === activeRoster.id))
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{ padding: "20px 10px", maxHeight: "70vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1E293B" }}>{activeRoster.fullname}</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>کلاس: {className}</div>
        </div>
        <span onClick={() => { setActiveRoster(null); setCodeInput(""); }} style={{ fontSize: 12, color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>خروج</span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 10 }}>نمرات آزمون‌ها</div>
      {results.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20 }}>هنوز در آزمونی شرکت نکرده‌ای.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {results.map((r) => (
            <div key={r.examId} style={{ border: "1px solid #EEF1F6", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{r.title}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{r.date}</div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: r.pct >= 50 ? "#16A34A" : "#DC2626" }}>{r.pct}%</div>
                {r.pendingCount > 0 && <div style={{ fontSize: 10, color: "#D97706" }}>در انتظار تصحیح</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 10 }}>پیام‌های معلم</div>
      {myMessages.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94A3B8" }}>پیامی برای تو ثبت نشده.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {myMessages.map((m) => (
            <div key={m.id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", marginBottom: 4 }}>{m.text}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(m.created_at).toLocaleString("fa-IR")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ForgotPasswordScreen({ goLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError("");
    if (!username) { setError("نام کاربری را وارد کنید."); return; }
    setLoading(true);
    try {
      await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } catch {
      /* ignore */
    }
    setLoading(false);
    setSent(true);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#132A52,#1D3E73)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 22, padding: "40px 36px", boxShadow: "0 20px 60px rgba(19,42,82,.35)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>بازیابی رمز عبور</div>
        {sent ? (
          <>
            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.9, marginBottom: 22 }}>
              اگر این نام کاربری در سامانه ثبت شده باشد، ایمیلی حاوی لینک بازیابی رمز عبور برای شما ارسال شد.
            </div>
            <Button type="button" onClick={goLogin} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }}>بازگشت به ورود</Button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 26 }}>نام کاربری خود را وارد کنید.</div>
            <Field label="نام کاربری">
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={handleKeyDown} placeholder="نام کاربری" />
            </Field>
            {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <Button type="button" onClick={submit} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }} disabled={loading}>
              {loading ? "در حال ارسال..." : "ارسال لینک بازیابی"}
            </Button>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748B" }}>
              <span onClick={goLogin} style={{ color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>بازگشت به ورود</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResetPasswordScreen({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const submit = async () => {
    setError("");
    if (!password || !confirm) { setError("هر دو فیلد را پر کنید."); return; }
    if (password.length < 4) { setError("رمز عبور باید حداقل ۴ کاراکتر باشد."); return; }
    if (password !== confirm) { setError("رمز عبور و تکرار آن یکسان نیستند."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      setStatus(r.ok ? "ok" : "invalid");
    } catch {
      setStatus("invalid");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#132A52,#1D3E73)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 22, padding: "40px 36px", boxShadow: "0 20px 60px rgba(19,42,82,.35)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>تنظیم رمز عبور جدید</div>
        {status === "ok" ? (
          <>
            <div style={{ fontSize: 13, color: "#16A34A", lineHeight: 1.9, marginBottom: 22 }}>رمز عبور با موفقیت تغییر کرد.</div>
            <Button type="button" onClick={onDone} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }}>ورود به سامانه</Button>
          </>
        ) : status === "invalid" ? (
          <>
            <div style={{ fontSize: 13, color: "#DC2626", lineHeight: 1.9, marginBottom: 22 }}>لینک بازیابی نامعتبر است.</div>
            <Button type="button" onClick={onDone} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }}>بازگشت به ورود</Button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 26 }}>رمز عبور جدید خود را وارد کنید.</div>
            <Field label="رمز عبور جدید">
              <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور جدید" />
            </Field>
            <Field label="تکرار رمز عبور جدید">
              <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="تکرار رمز عبور جدید" />
            </Field>
            {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <Button type="button" onClick={submit} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }} disabled={loading}>
              {loading ? "در حال ثبت..." : "ثبت رمز عبور جدید"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, goRegister, allowRegister, goForgot, portalMode, setPortalMode, portalData }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!username || !password) { setError("نام کاربری و رمز عبور را وارد کنید."); return; }
    setLoading(true);
    const teacher = await getJSON(`teacher:${username}`);
    setLoading(false);
    if (!teacher || teacher.password !== password) {
      setError("نام کاربری یا رمز عبور اشتباه است.");
      return;
    }
    onLogin(teacher);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#132A52,#1D3E73)", padding: 20 }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 860, background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 20px 60px rgba(19,42,82,.35)" }}>
        <div style={{ flex: 1, background: "linear-gradient(160deg,#1D3E73,#2563EB)", padding: 40, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#fff", minWidth: 260 }}>
          <div style={{ width: 70, height: 70, borderRadius: 18, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <GraduationCap size={36} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>آزمون‌ساز معلم</div>
          <div style={{ fontSize: 13, color: "#C9D6EE", textAlign: "center", lineHeight: 1.9 }}>
            بساز، برگزار کن، نتیجه بگیر.
            <br />
            سامانه‌ی آزمون آنلاین برای معلمان.
          </div>
        </div>
        <div style={{ flex: 1.15, padding: "44px 40px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <div onClick={() => setPortalMode && setPortalMode("teacher")} style={{
              flex: 1, textAlign: "center", padding: "10px 4px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: portalMode !== "student" ? "#2563EB" : "#F1F5F9", color: portalMode !== "student" ? "#fff" : "#475569",
            }}>ورود معلم</div>
            <div onClick={() => setPortalMode && setPortalMode("student")} style={{
              flex: 1, textAlign: "center", padding: "10px 4px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: portalMode === "student" ? "#2563EB" : "#F1F5F9", color: portalMode === "student" ? "#fff" : "#475569",
            }}>پرتال دانش‌آموزی</div>
          </div>
          {portalMode === "student" ? (
            <StudentPortalScreen {...portalData} />
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>خوش برگشتی!</div>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 26 }}>برای ورود، اطلاعات حساب معلم را وارد کن.</div>
              <div>
                <Field label="نام کاربری">
                  <TextInput value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={handleKeyDown} placeholder="مثلاً: ali_teacher" />
                </Field>
                <Field label="رمز عبور">
                  <div style={{ position: "relative" }}>
                    <TextInput type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} placeholder="رمز عبور را وارد کنید" style={{ paddingLeft: 40 }} />
                    <span onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", left: 12, top: 12, cursor: "pointer", color: "#94A3B8" }}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </span>
                  </div>
                </Field>
                <div style={{ textAlign: "left", marginBottom: 14, marginTop: -6 }}>
                  <span onClick={goForgot} style={{ color: "#2563EB", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>رمز عبور را فراموش کرده‌اید؟</span>
                </div>
                {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14 }}>{error}</div>}
                <Button type="button" onClick={submit} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }} disabled={loading}>
                  {loading ? "در حال ورود..." : "ورود"}
                </Button>
              </div>
              {allowRegister && (
                <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748B" }}>
                  حساب نداری؟{" "}
                  <span onClick={goRegister} style={{ color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>ثبت‌نام</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RegisterScreen({ onRegistered, goLogin }) {
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!fullname || !username || !password || !email) { setError("همه فیلدها را پر کنید."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("ایمیل معتبر نیست."); return; }
    if (password.length < 4) { setError("رمز عبور باید حداقل ۴ کاراکتر باشد."); return; }
    setLoading(true);
    const existing = await getJSON(`teacher:${username}`);
    if (existing) {
      setLoading(false);
      setError("این نام کاربری قبلاً ثبت شده است.");
      return;
    }
    const teacher = { username, password, fullname, email, created_at: new Date().toISOString() };
    await setJSON(`teacher:${username}`, teacher);
    setLoading(false);
    onRegistered(teacher);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#132A52,#1D3E73)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 22, padding: "40px 36px", boxShadow: "0 20px 60px rgba(19,42,82,.35)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>ساخت حساب معلم (فقط یک‌بار)</div>
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 26 }}>این حساب، حساب مالک سامانه است. بعد از ساخت، امکان ثبت‌نام دیگر بسته می‌شود.</div>
        <div>
          <Field label="نام و نام‌خانوادگی">
            <TextInput value={fullname} onChange={(e) => setFullname(e.target.value)} onKeyDown={handleKeyDown} placeholder="مثلاً: زهرا احمدی" />
          </Field>
          <Field label="نام کاربری">
            <TextInput value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={handleKeyDown} placeholder="یک نام کاربری یکتا" />
          </Field>
          <Field label="رمز عبور">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} placeholder="رمز عبور" />
          </Field>
          <Field label="ایمیل">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} placeholder="برای بازیابی رمز عبور" />
          </Field>
          {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <Button type="button" onClick={submit} style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 15 }} disabled={loading}>
            {loading ? "در حال ثبت..." : "ثبت‌نام"}
          </Button>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748B" }}>
          قبلاً ثبت‌نام کردی؟{" "}
          <span onClick={goLogin} style={{ color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>ورود</span>
        </div>
      </div>
    </div>
  );
  }
