/* ---------------------------------------------------------
ADMIN SCREENS — dashboard, teacher management, all exams/results
--------------------------------------------------------- */

function AdminDashboardScreen({ teacher, exams, questions, students, answers, classes, roster, refresh }) {
  const totalTeachers = exams.length > 0 ? [...new Set(exams.map(e => e.teacher_id))].length : 0;
  const totalExams = exams.length;
  const totalStudents = students.length;
  const totalQuestions = questions.length;
  
  const recentExams = [...exams]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  
  const allScores = [];
  exams.forEach(exam => {
    const examAnswers = answers.filter(a => a.exam_id === exam.id);
    const byStudent = {};
    examAnswers.forEach(a => {
      byStudent[a.student_id] = byStudent[a.student_id] || [];
      byStudent[a.student_id].push(a);
    });
    Object.values(byStudent).forEach(list => {
      const total = list.reduce((s, a) => s + (a.mark || 1), 0);
      const got = list.reduce((s, a) => s + awardedMarkOf(a), 0);
      if (total > 0) allScores.push((got / total) * 100);
    });
  });
  
  const avgScore = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : "—";
  
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="داشبورد مدیر" teacherName={teacher.fullname} />
      
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard icon={Users} label="تعداد معلمان" value={totalTeachers} color="#2563EB" />
        <StatCard icon={FileText} label="تعداد آزمون‌ها" value={totalExams} color="#0EA5E9" />
        <StatCard icon={Users} label="تعداد دانش‌آموزان" value={totalStudents} color="#8B5CF6" />
        <StatCard icon={ListChecks} label="تعداد سوالات" value={totalQuestions} color="#16A34A" />
        <StatCard icon={Percent} label="میانگین نمرات کل" value={avgScore === "—" ? "—" : `${avgScore}%`} color="#F59E0B" />
      </div>
      
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1E293B", marginBottom: 16 }}>آزمون‌های اخیر</div>
        {recentExams.length === 0 ? (
          <EmptyState text="هنوز آزمونی در سامانه ثبت نشده است." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>عنوان آزمون</th>
                <th style={{ padding: "8px 6px" }}>معلم</th>
                <th style={{ padding: "8px 6px" }}>تعداد سوال</th>
                <th style={{ padding: "8px 6px" }}>تاریخ ساخت</th>
              </tr>
            </thead>
            <tbody>
              {recentExams.map(ex => (
                <tr key={ex.id} style={{ borderTop: "1px solid #F1F5F9", fontSize: 14 }}>
                  <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }}>{ex.title}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{ex.teacher_id}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{questions.filter(q => q.exam_id === ex.id).length}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{new Date(ex.created_at).toLocaleDateString("fa-IR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TeachersScreen({ teacher, refresh }) {
  const [teachers, setTeachers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  useEffect(() => {
    (async () => {
      const keys = await listPrefix("teacher:");
      const all = await Promise.all(keys.map(k => getJSON(k)));
      setTeachers(all.filter(Boolean));
    })();
  }, [refresh]);
  
  const createTeacher = async () => {
    setError("");
    if (!fullname || !username || !password || !email) {
      setError("همه فیلدها را پر کنید.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("ایمیل معتبر نیست.");
      return;
    }
    if (password.length < 4) {
      setError("رمز عبور باید حداقل ۴ کاراکتر باشد.");
      return;
    }
    
    setSaving(true);
    const existing = await getJSON(`teacher:${username}`);
    if (existing) {
      setSaving(false);
      setError("این نام کاربری قبلاً ثبت شده است.");
      return;
    }
    
    const newTeacher = {
      username,
      password,
      fullname,
      email,
      role: "teacher",
      created_at: new Date().toISOString(),
    };
    await setJSON(`teacher:${username}`, newTeacher);
    setSaving(false);
    setShowCreate(false);
    setFullname("");
    setUsername("");
    setPassword("");
    setEmail("");
    await refresh();
  };
  
  const removeTeacher = async (username) => {
    if (username === teacher.username) {
      alert("نمی‌توانید حساب خودتان را حذف کنید.");
      return;
    }
    if (!window.confirm(`حساب معلم "${username}" و تمام داده‌های او حذف شوند؟ این کار قابل بازگشت نیست.`)) return;
    
    await deleteKey(`teacher:${username}`);
    
    const [exams, questions, answers, classes, roster, students, messages] = await Promise.all([
      loadAll("exam:"), loadAll("question:"), loadAll("answer:"),
      loadAll("class:"), loadAll("roster:"), loadAll("student:"), loadAll("message:")
    ]);
    
    const toDelete = [];
    exams.filter(e => e.teacher_id === username).forEach(e => toDelete.push(`exam:${e.id}`));
    questions.filter(q => q.teacher_id === username || (q.exam_id && exams.find(e => e.id === q.exam_id && e.teacher_id === username))).forEach(q => toDelete.push(`question:${q.id}`));
    answers.filter(a => {
      const exam = exams.find(e => e.id === a.exam_id);
      return exam && exam.teacher_id === username;
    }).forEach(a => toDelete.push(`answer:${a.id}`));
    classes.filter(c => c.teacher_id === username).forEach(c => toDelete.push(`class:${c.id}`));
    roster.filter(r => r.teacher_id === username).forEach(r => toDelete.push(`roster:${r.id}`));
    students.filter(s => s.teacher_id === username).forEach(s => toDelete.push(`student:${s.id}`));
    messages.filter(m => m.teacher_id === username).forEach(m => toDelete.push(`message:${m.id}`));
    
    await Promise.all(toDelete.map(k => deleteKey(k)));
    await refresh();
  };
  
  const otherTeachers = teachers.filter(t => t.username !== teacher.username);
  
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="مدیریت معلمان" teacherName={teacher.fullname} />
      
      <div style={{ marginBottom: 18 }}>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          افزودن معلم جدید
        </Button>
      </div>
      
      {otherTeachers.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6" }}>
          <EmptyState text="هنوز معلمی اضافه نکرده‌ای." actionLabel="افزودن معلم" onAction={() => setShowCreate(true)} />
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>نام و نام‌خانوادگی</th>
                <th style={{ padding: "8px 6px" }}>نام کاربری</th>
                <th style={{ padding: "8px 6px" }}>ایمیل</th>
                <th style={{ padding: "8px 6px" }}>تاریخ ثبت</th>
                <th style={{ padding: "8px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {otherTeachers.map(t => (
                <tr key={t.username} style={{ borderTop: "1px solid #F1F5F9", fontSize: 14 }}>
                  <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }}>{t.fullname}</td>
                  <td style={{ padding: "12px 6px", color: "#475569", fontFamily: "monospace" }}>{t.username}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{t.email || "—"}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{new Date(t.created_at).toLocaleDateString("fa-IR")}</td>
                  <td style={{ padding: "12px 6px" }}>
                    <Button variant="danger" style={{ fontSize: 13, padding: "8px 10px" }} onClick={() => removeTeacher(t.username)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="افزودن معلم جدید">
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.8 }}>
            اطلاعات معلم جدید را وارد کن. او می‌تواند با این اطلاعات وارد سامانه شود و آزمون‌ها، کلاس‌ها و دانش‌آموزان خود را مدیریت کند.
          </div>
          <Field label="نام و نام‌خانوادگی">
            <TextInput value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="مثلاً: علی محمدی" />
          </Field>
          <Field label="نام کاربری">
            <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="یک نام کاربری یکتا (مثلاً: ali_m)" />
          </Field>
          <Field label="رمز عبور">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="حداقل ۴ کاراکتر" />
          </Field>
          <Field label="ایمیل">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="برای بازیابی رمز عبور" />
          </Field>
          {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={createTeacher} disabled={saving}>
              {saving ? "در حال ثبت..." : "افزودن معلم"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AllExamsScreen({ teacher, exams, questions, answers }) {
  const [search, setSearch] = useState("");
  
  const sorted = [...exams].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const filtered = search.trim()
    ? sorted.filter(e => (e.title + " " + e.teacher_id).toLowerCase().includes(search.trim().toLowerCase()))
    : sorted;
  
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="همه آزمون‌ها" teacherName={teacher.fullname} />
      
      {exams.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی عنوان آزمون یا نام معلم..." style={{ maxWidth: 300 }} />
        </div>
      )}
      
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6" }}>
          <EmptyState text={exams.length === 0 ? "هنوز آزمونی در سامانه ثبت نشده است." : "نتیجه‌ای با این جستجو پیدا نشد."} />
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>عنوان آزمون</th>
                <th style={{ padding: "8px 6px" }}>معلم</th>
                <th style={{ padding: "8px 6px" }}>تعداد سوال</th>
                <th style={{ padding: "8px 6px" }}>تعداد شرکت‌کننده</th>
                <th style={{ padding: "8px 6px" }}>تاریخ ساخت</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ex => {
                const qCount = questions.filter(q => q.exam_id === ex.id).length;
                const examAnswers = answers.filter(a => a.exam_id === ex.id);
                const studentIds = [...new Set(examAnswers.map(a => a.student_id))];
                return (
                  <tr key={ex.id} style={{ borderTop: "1px solid #F1F5F9", fontSize: 14 }}>
                    <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }}>{ex.title}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }}>{ex.teacher_id}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }}>{qCount}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }}>{studentIds.length}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }}>{new Date(ex.created_at).toLocaleDateString("fa-IR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AllResultsScreen({ teacher, exams, questions, students, answers }) {
  const [search, setSearch] = useState("");
  const [examId, setExamId] = useState(exams[0]?.id || null);
  
  const exam = exams.find(e => e.id === examId);
  
  if (!exam) {
    return (
      <div style={{ flex: 1, padding: "30px 34px" }}>
        <TopBar title="همه نتایج" teacherName={teacher.fullname} />
        <EmptyState text="هنوز آزمونی در سامانه ثبت نشده است." />
      </div>
    );
  }
  
  const examAnswers = answers.filter(a => a.exam_id === examId);
  const byStudent = {};
  examAnswers.forEach(a => {
    byStudent[a.student_id] = byStudent[a.student_id] || [];
    byStudent[a.student_id].push(a);
  });
  
  const rows = Object.entries(byStudent).map(([studentId, list]) => {
    const student = students.find(s => s.id === studentId) || { fullname: "—", class_code: "" };
    const totalMarks = list.reduce((s, a) => s + (a.mark || 1), 0);
    const gotMarks = list.reduce((s, a) => s + awardedMarkOf(a), 0);
    const pct = totalMarks ? Math.round((gotMarks / totalMarks) * 1000) / 10 : 0;
    const correctCount = list.filter(a => a.is_correct).length;
    const timeTaken = list[0]?.time_taken || 0;
    const date = list[0]?.answered_at ? new Date(list[0].answered_at).toLocaleDateString("fa-IR") : "—";
    return {
      studentId, name: student.fullname, cls: student.class_code, pct, correctCount,
      total: list.length, timeTaken, date,
    };
  }).sort((a, b) => b.pct - a.pct);
  
  const displayRows = rows.filter(r => !search.trim() || (r.name + " " + (r.cls || "")).toLowerCase().includes(search.trim().toLowerCase()));
  
  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="همه نتایج" teacherName={teacher.fullname} />
      
      <div style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#64748B" }}>انتخاب آزمون:</span>
        <select value={examId} onChange={(e) => setExamId(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 12px" }}>
          {exams.map(e => <option key={e.id} value={e.id}>{e.title} ({e.teacher_id})</option>)}
        </select>
        {rows.length > 0 && (
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام یا کلاس..." style={{ width: 200, padding: "8px 12px" }} />
        )}
      </div>
      
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
        {rows.length === 0 ? (
          <EmptyState text="هنوز دانش‌آموزی در این آزمون شرکت نکرده است." />
        ) : displayRows.length === 0 ? (
          <EmptyState text="نتیجه‌ای با این جستجو پیدا نشد." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>رتبه</th>
                <th style={{ padding: "8px 6px" }}>نام دانش‌آموز</th>
                <th style={{ padding: "8px 6px" }}>کلاس</th>
                <th style={{ padding: "8px 6px" }}>نمره</th>
                <th style={{ padding: "8px 6px" }}>پاسخ صحیح</th>
                <th style={{ padding: "8px 6px" }}>زمان</th>
                <th style={{ padding: "8px 6px" }}>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, i) => (
                <tr key={r.studentId} style={{ borderTop: "1px solid #F1F5F9", fontSize: 14 }}>
                  <td style={{ padding: "12px 6px" }}>{i + 1}</td>
                  <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }}>{r.name}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{r.cls || "—"}</td>
                  <td style={{ padding: "12px 6px", fontWeight: 800, color: r.pct >= 50 ? "#16A34A" : "#DC2626" }}>{r.pct}%</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{r.correctCount} / {r.total}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{fmtTime(r.timeTaken)}</td>
                  <td style={{ padding: "12px 6px", color: "#475569" }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}