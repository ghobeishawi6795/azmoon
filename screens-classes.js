/* ---------------------------------------------------------
CLASSES / ROSTER / STUDENTS / MESSAGES / STUDENT PORTAL / SETTINGS
--------------------------------------------------------- */
function ClassesScreen({ teacher, classes, roster, onOpenClass, refresh, addLocalClass, removeLocalClass, updateLocalClass }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const myClasses = classes.filter((c) => c.teacher_id === teacher.username)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };
  const saveEdit = async (c) => {
    if (!editName.trim() || editName.trim() === c.name) { cancelEdit(); return; }
    setRenaming(true);
    const record = { ...c, name: editName.trim() };
    await setJSON(`class:${c.id}`, record);
    updateLocalClass && updateLocalClass(record);
    setRenaming(false);
    cancelEdit();
    refresh();
  };
  const createClass = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const id = uid();
    const record = { id, name: name.trim(), teacher_id: teacher.username, created_at: new Date().toISOString() };
    await setJSON(`class:${id}`, record);
    addLocalClass && addLocalClass(record);
    setSaving(false);
    setName("");
    setShowCreate(false);
    refresh();
    onOpenClass(id);
  };
  const removeClass = async (classId) => {
    if (!window.confirm("این کلاس و همه‌ی دانش‌آموزان آن حذف شوند؟ این کار قابل بازگشت نیست.")) return;
    removeLocalClass && removeLocalClass(classId);
    await deleteKey(`class:${classId}`);
    const members = roster.filter((r) => r.class_id === classId);
    await Promise.all(members.map((r) => deleteKey(`roster:${r.id}`)));
    refresh();
  };
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="کلاس‌ها" teacherName={teacher.fullname} />
      <div style={{ marginBottom: 18 }}>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} />افزودن کلاس</Button>
      </div>
      {myClasses.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6" }}>
          <EmptyState text="هنوز کلاسی نساخته‌ای." actionLabel="افزودن کلاس" onAction={() => setShowCreate(true)} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
          {myClasses.map((c) => {
            const count = roster.filter((r) => r.class_id === c.id).length;
            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 20 }}>
                {editingId === c.id ? (
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <TextInput
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c); if (e.key === "Escape") cancelEdit(); }}
                      style={{ fontSize: 14, padding: "8px 10px" }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1E293B" }}>{c.name}</div>
                    <button
                      onClick={() => startEdit(c)}
                      title="ویرایش نام کلاس"
                      style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#94A3B8", display: "flex" }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>{count} دانش‌آموز</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {editingId === c.id ? (
                    <>
                      <Button style={{ fontSize: 13, padding: "8px 12px" }} onClick={() => saveEdit(c)} disabled={renaming}>{renaming ? "در حال ذخیره..." : "ذخیره"}</Button>
                      <Button variant="ghost" style={{ fontSize: 13, padding: "8px 12px" }} onClick={cancelEdit}>انصراف</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" style={{ fontSize: 13, padding: "8px 12px" }} onClick={() => onOpenClass(c.id)}>مدیریت دانش‌آموزان</Button>
                      <Button variant="danger" style={{ fontSize: 13, padding: "8px 10px" }} onClick={() => removeClass(c.id)}><Trash2 size={14} /></Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="افزودن کلاس">
          <Field label="نام کلاس">
            <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: هفتم الف" onKeyDown={(e) => e.key === "Enter" && createClass()} />
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={createClass} disabled={saving}>{saving ? "در حال ساخت..." : "ادامه و افزودن دانش‌آموز"}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RosterScreen({ classroom, roster, teacher, onBack, refresh, addLocalRoster, addLocalRosterMany, updateLocalRoster, removeLocalRoster }) {
  const members = roster.filter((r) => r.class_id === classroom.id);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const addStudent = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const allCodes = roster.filter((r) => r.teacher_id === teacher.username).map((r) => r.code);
    const id = uid();
    const code = generateCode(allCodes);
    const record = {
      id, class_id: classroom.id, teacher_id: teacher.username,
      fullname: name.trim(), code, created_at: new Date().toISOString(),
    };
    addLocalRoster && addLocalRoster(record);
    await setJSON(`roster:${id}`, record);
    setSaving(false);
    setName("");
    refresh();
  };
  const addBulkStudents = async () => {
    const names = bulkText
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) { setBulkMsg("نامی برای افزودن پیدا نشد."); return; }
    setBulkSaving(true);
    const existingNames = new Set(members.map((m) => m.fullname.trim()));
    const usedCodes = roster.filter((r) => r.teacher_id === teacher.username).map((r) => r.code);
    let added = 0, skipped = 0;
    const newRecords = [];
    for (const n of names) {
      if (existingNames.has(n)) { skipped++; continue; }
      existingNames.add(n);
      const id = uid();
      const code = generateCode(usedCodes);
      usedCodes.push(code);
      const record = {
        id, class_id: classroom.id, teacher_id: teacher.username,
        fullname: n, code, created_at: new Date().toISOString(),
      };
      newRecords.push(record);
      await setJSON(`roster:${id}`, record);
      added++;
    }
    if (newRecords.length > 0) addLocalRosterMany && addLocalRosterMany(newRecords);
    setBulkSaving(false);
    setBulkMsg(`${added} دانش‌آموز اضافه شد${skipped > 0 ? ` — ${skipped} مورد تکراری نادیده گرفته شد.` : "."}`);
    if (added > 0) {
      setBulkText("");
      refresh();
    }
  };
  const regenerateCode = async (member) => {
    const allCodes = roster.filter((r) => r.teacher_id === teacher.username && r.id !== member.id).map((r) => r.code);
    const code = generateCode(allCodes);
    const updated = { ...member, code };
    updateLocalRoster && updateLocalRoster(updated);
    await setJSON(`roster:${member.id}`, updated);
    refresh();
  };
  const removeStudent = async (id) => {
    if (!window.confirm("این دانش‌آموز از کلاس حذف شود؟")) return;
    setDeletingId(id);
    removeLocalRoster && removeLocalRoster(id);
    await deleteKey(`roster:${id}`);
    setDeletingId(null);
    refresh();
  };
  const printCodes = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const cards = members.map((m) => `<div style="border:1.5px dashed #999;border-radius:10px;padding:14px;text-align:center;width:150px;display:inline-block;margin:6px"><div style="font-size:12px;color:#666">${classroom.name}</div><div style="font-size:14px;font-weight:bold;margin:6px 0">${m.fullname}</div><div style="font-size:22px;font-weight:bold;letter-spacing:2px">${m.code}</div></div>`).join("");
    win.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>کدهای ${classroom.name}</title><style>body{font-family:Tahoma,sans-serif;padding:20px}</style></head><body>${cards}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748B", marginBottom: 6, cursor: "pointer" }} onClick={onBack}>
        <ArrowRight size={15} /> بازگشت به کلاس‌ها
      </div>
      <TopBar title={`دانش‌آموزان — ${classroom.name}`} teacherName={teacher.fullname} />
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1E293B" }}>افزودن دانش‌آموز</div>
          <span onClick={() => setShowBulk((s) => !s)} style={{ fontSize: 12, color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>
            {showBulk ? "افزودن تکی" : "افزودن گروهی (چند نفر با هم)"}
          </span>
        </div>
        {showBulk ? (
          <div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, lineHeight: 1.8 }}>
              اسم هر دانش‌آموز رو توی یک خط جدا بنویس (یا با ویرگول جدا کن). به هرکدوم خودکار یک کد ورود یکتا داده می‌شه.
            </div>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={8}
              placeholder={"علی رضایی\nمریم احمدی\nسارا کریمی\n..."}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }} />
            {bulkMsg && <div style={{ fontSize: 12, color: "#2563EB", marginBottom: 10 }}>{bulkMsg}</div>}
            <Button onClick={addBulkStudents} disabled={bulkSaving}>
              <Plus size={16} />{bulkSaving ? "در حال افزودن..." : "افزودن همه"}
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="نام دانش‌آموز" onKeyDown={(e) => e.key === "Enter" && addStudent()} style={{ maxWidth: 260 }} />
            <Button onClick={addStudent} disabled={saving}><Plus size={16} />{saving ? "در حال افزودن..." : "افزودن"}</Button>
          </div>
        )}
      </div>
      {members.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Button variant="ghost" onClick={printCodes}><FileText size={15} />چاپ کارت کدها برای پخش بین دانش‌آموزان</Button>
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
        {members.length === 0 ? (
          <EmptyState text="هنوز دانش‌آموزی به این کلاس اضافه نشده." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>نام</th>
                <th style={{ padding: "8px 6px" }}>کد ورود</th>
                <th style={{ padding: "8px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #F1F5F9", fontSize: 14 }}>
                  <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }}>{m.fullname}</td>
                  <td style={{ padding: "12px 6px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#2563EB", letterSpacing: 2 }}>{m.code}</span>
                  </td>
                  <td style={{ padding: "12px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 22, justifyContent: "flex-end" }}>
                      <span onClick={() => regenerateCode(m)} style={{ fontSize: 12, color: "#64748B", cursor: "pointer", padding: "6px 4px" }}>کد جدید</span>
                      <span
                        onClick={() => removeStudent(m.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 32, height: 32, borderRadius: 8,
                          background: "#FEF2F2", cursor: "pointer",
                          opacity: deletingId === m.id ? 0.5 : 1,
                        }}
                        title="حذف دانش‌آموز"
                      >
                        <Trash2 size={16} color="#F87171" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StudentsScreen({ teacher, students, exams, answers, questions, refresh }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const myStudents = students.filter((s) => s.teacher_id === teacher.username);
  const removeStudentRecord = async (ids) => {
    if (!window.confirm("سوابق شرکت این دانش‌آموز در همه‌ی آزمون‌ها حذف شود؟ این کار قابل بازگشت نیست.")) return;
    setDeletingKey(ids.join(","));
    const relatedAnswers = answers.filter((a) => ids.includes(a.student_id));
    await Promise.all(relatedAnswers.map((a) => deleteKey(`answer:${a.id}`)));
    await Promise.all(ids.map((id) => deleteKey(`student:${id}`)));
    setDeletingKey(null);
    if (refresh) await refresh();
  };
  const byName = {};
  myStudents.forEach((s) => {
    const key = s.fullname.trim().toLowerCase();
    byName[key] = byName[key] || { fullname: s.fullname, class_code: s.class_code, ids: [] };
    byName[key].ids.push(s.id);
  });
  const rows = Object.values(byName).map((g) => {
    const myAnswers = answers.filter((a) => g.ids.includes(a.student_id));
    const examIds = [...new Set(myAnswers.map((a) => a.exam_id))];
    const trend = examIds.map((examId) => {
      const list = myAnswers.filter((a) => a.exam_id === examId);
      const totalMarks = list.reduce((s, a) => s + (a.mark || 1), 0);
      const gotMarks = list.reduce((s, a) => s + awardedMarkOf(a), 0);
      const pct = totalMarks ? Math.round((gotMarks / totalMarks) * 1000) / 10 : 0;
      const exam = exams.find((e) => e.id === examId);
      const date = list[0]?.answered_at || null;
      return { examId, title: exam?.title || "—", pct, date };
    }).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    return { ...g, examCount: examIds.length, trend };
  });
  const displayRows = search.trim()
    ? rows.filter((s) => (s.fullname + " " + (s.class_code || "")).toLowerCase().includes(search.trim().toLowerCase()))
    : rows;
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="دانش‌آموزان" teacherName={teacher.fullname} />
      {rows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام یا کلاس..." style={{ maxWidth: 260 }} />
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
        {rows.length === 0 ? (
          <EmptyState text="هنوز دانش‌آموزی در آزمون‌های تو شرکت نکرده است." />
        ) : displayRows.length === 0 ? (
          <EmptyState text="نتیجه‌ای با این جستجو پیدا نشد." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>نام</th>
                <th style={{ padding: "8px 6px" }}>کد کلاس</th>
                <th style={{ padding: "8px 6px" }}>تعداد آزمون شرکت‌کرده</th>
                <th style={{ padding: "8px 6px" }}></th>
                <th style={{ padding: "8px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((s) => (
                <React.Fragment key={s.fullname}>
                  <tr style={{ borderTop: "1px solid #F1F5F9", fontSize: 14, cursor: s.trend.length > 1 ? "pointer" : "default" }}>
                    <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>{s.fullname}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>{s.class_code || "—"}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>{s.examCount}</td>
                    <td style={{ padding: "12px 6px", color: "#2563EB", fontSize: 12 }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>
                      {s.trend.length > 1 && (expanded === s.fullname ? "بستن روند ▲" : "روند نمرات ▼")}
                    </td>
                    <td style={{ padding: "12px 6px" }}>
                      <Trash2
                        size={16}
                        style={{ cursor: "pointer", color: "#F87171", opacity: deletingKey === s.ids.join(",") ? 0.4 : 1 }}
                        onClick={() => removeStudentRecord(s.ids)}
                      />
                    </td>
                  </tr>
                  {expanded === s.fullname && (
                    <tr>
                      <td colSpan={5} style={{ padding: "6px 6px 18px" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 110, background: "#F8FAFC", borderRadius: 10, padding: "14px 18px", overflowX: "auto" }}>
                          {s.trend.map((t) => (
                            <div key={t.examId} title={t.title} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 46 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#1E293B" }}>{t.pct}%</div>
                              <div style={{ width: 22, borderRadius: "4px 4px 0 0", background: t.pct >= 50 ? "#16A34A" : "#DC2626", height: `${Math.max(4, t.pct * 0.6)}px` }} />
                              <div style={{ fontSize: 10, color: "#94A3B8", maxWidth: 60, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MessagesScreen({ teacher, classes, roster, messages, refresh }) {
  const [targetType, setTargetType] = useState("all");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const myClasses = classes.filter((c) => c.teacher_id === teacher.username);
  const myRoster = roster.filter((r) => r.teacher_id === teacher.username);
  const myMessages = messages.filter((m) => m.teacher_id === teacher.username)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const send = async () => {
    if (!text.trim()) return;
    if (targetType === "class" && !targetClassId) return;
    if (targetType === "student" && !targetStudentId) return;
    setSending(true);
    const id = uid();
    await setJSON(`message:${id}`, {
      id, teacher_id: teacher.username,
      target_type: targetType,
      target_id: targetType === "class" ? targetClassId : targetType === "student" ? targetStudentId : null,
      text: text.trim(),
      created_at: new Date().toISOString(),
    });
    setSending(false);
    setText("");
    await refresh();
  };
  const removeMessage = async (id) => {
    setDeletingId(id);
    await deleteKey(`message:${id}`);
    setDeletingId(null);
    await refresh();
  };
  const describeTarget = (m) => {
    if (m.target_type === "all") return "همه‌ی دانش‌آموزان";
    if (m.target_type === "class") return `کلاس: ${classes.find((c) => c.id === m.target_id)?.name || "حذف‌شده"}`;
    return `دانش‌آموز: ${roster.find((r) => r.id === m.target_id)?.fullname || "حذف‌شده"}`;
  };
  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="پیام‌ها" teacherName={teacher.fullname} />
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        پیام‌هایی که اینجا می‌فرستی، در پرتال دانش‌آموزی (وقتی دانش‌آموز با کد خودش وارد می‌شود) نمایش داده می‌شوند.
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22, marginBottom: 20 }}>
        <Field label="گیرنده">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "همه‌ی دانش‌آموزان" },
              { key: "class", label: "یک کلاس خاص" },
              { key: "student", label: "یک دانش‌آموز خاص" },
            ].map((opt) => (
              <div key={opt.key} onClick={() => setTargetType(opt.key)} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: targetType === opt.key ? "#2563EB" : "#F1F5F9", color: targetType === opt.key ? "#fff" : "#475569",
              }}>{opt.label}</div>
            ))}
          </div>
        </Field>
        {targetType === "class" && (
          <Field label="انتخاب کلاس">
            <select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)} style={inputStyle}>
              <option value="">— انتخاب کن —</option>
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {targetType === "student" && (
          <Field label="انتخاب دانش‌آموز">
            <select value={targetStudentId} onChange={(e) => setTargetStudentId(e.target.value)} style={inputStyle}>
              <option value="">— انتخاب کن —</option>
              {myRoster.map((r) => (
                <option key={r.id} value={r.id}>{r.fullname} ({classes.find((c) => c.id === r.class_id)?.name || "—"})</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="متن پیام">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} placeholder="مثلاً: فردا امتحان فصل ۵ برگزار می‌شود." />
        </Field>
        <Button onClick={send} disabled={sending}><Plus size={16} />{sending ? "در حال ارسال..." : "ارسال پیام"}</Button>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 12 }}>پیام‌های ارسال‌شده</div>
      {myMessages.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6" }}>
          <EmptyState text="هنوز پیامی نفرستاده‌ای." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {myMessages.map((m) => (
            <div key={m.id} style={{ background: "#fff", border: "1px solid #EEF1F6", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, color: "#334155", marginBottom: 6, whiteSpace: "pre-wrap" }}>{m.text}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge tone="blue">{describeTarget(m)}</Badge>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(m.created_at).toLocaleString("fa-IR")}</span>
                </div>
              </div>
              <Trash2 size={16} style={{ cursor: "pointer", color: "#F87171", flexShrink: 0, opacity: deletingId === m.id ? 0.4 : 1 }} onClick={() => removeMessage(m.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <div style={{ flex: 1.15, padding: "44px 40px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>پرتال دانش‌آموزی</div>
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 26 }}>کدی که معلمت به تو داده را وارد کن تا نمرات و پیام‌های خودت را ببینی.</div>
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
    <div style={{ flex: 1.15, padding: "44px 40px", maxHeight: "80vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B" }}>{activeRoster.fullname}</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>کلاس: {className}</div>
        </div>
        <span onClick={() => { setActiveRoster(null); setCodeInput(""); }} style={{ fontSize: 12, color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>خروج</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 10 }}>نمرات آزمون‌ها</div>
      {results.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24 }}>هنوز در آزمونی شرکت نکرده‌ای.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
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

function SettingsScreen({ teacher, onUpdate, refresh }) {
  const [fullname, setFullname] = useState(teacher.fullname);
  const [email, setEmail] = useState(teacher.email || "");
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const save = async () => {
    const updated = { ...teacher, fullname, email };
    await setJSON(`teacher:${teacher.username}`, updated);
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const changePassword = async () => {
    setPwError(""); setPwSaved(false);
    if (!curPw || !newPw || !newPw2) { setPwError("همه فیلدها را پر کنید."); return; }
    if (curPw !== teacher.password) { setPwError("رمز عبور فعلی اشتباه است."); return; }
    if (newPw.length < 4) { setPwError("رمز عبور جدید باید حداقل ۴ کاراکتر باشد."); return; }
    if (newPw !== newPw2) { setPwError("رمز عبور جدید و تکرار آن یکسان نیستند."); return; }
    const updated = { ...teacher, password: newPw };
    await setJSON(`teacher:${teacher.username}`, updated);
    onUpdate(updated);
    setCurPw(""); setNewPw(""); setNewPw2("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  };
  const exportBackup = async () => {
    const prefixes = ["teacher:", "exam:", "question:", "student:", "answer:"];
    const data = {};
    for (const p of prefixes) {
      const keys = await listPrefix(p);
      for (const k of keys) {
        data[k] = await getJSON(k);
      }
    }
    downloadTextFile("edu-exam-backup.json", JSON.stringify(data, null, 2), "application/json");
  };
  const importBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("در حال بازیابی...");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const keys = Object.keys(data);
      for (const k of keys) {
        await setJSON(k, data[k]);
      }
      await refresh();
      setImportMsg(`${keys.length} مورد با موفقیت بازیابی شد.`);
    } catch {
      setImportMsg("فایل نامعتبر است.");
    }
    e.target.value = "";
  };
  return (
    <div style={{ flex: 1, padding: "30px 34px" }}>
      <TopBar title="تنظیمات" teacherName={teacher.fullname} />
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 24, maxWidth: 420, marginBottom: 20 }}>
        <Field label="نام کاربری">
          <TextInput value={teacher.username} disabled style={{ background: "#F8FAFC", color: "#94A3B8" }} />
        </Field>
        <Field label="نام و نام‌خانوادگی">
          <TextInput value={fullname} onChange={(e) => setFullname(e.target.value)} />
        </Field>
        <Field label="ایمیل (برای بازیابی رمز عبور)">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" />
        </Field>
        <Button onClick={save}><Check size={16} />ذخیره تغییرات</Button>
        {saved && <div style={{ color: "#16A34A", fontSize: 13, marginTop: 10 }}>ذخیره شد.</div>}
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 24, maxWidth: 420, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 16 }}>تغییر رمز عبور</div>
        <Field label="رمز عبور فعلی">
          <TextInput type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="رمز عبور فعلی" />
        </Field>
        <Field label="رمز عبور جدید">
          <TextInput type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="رمز عبور جدید" />
        </Field>
        <Field label="تکرار رمز عبور جدید">
          <TextInput type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="تکرار رمز عبور جدید" />
        </Field>
        {pwError && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 10 }}>{pwError}</div>}
        <Button onClick={changePassword}><Check size={16} />تغییر رمز عبور</Button>
        {pwSaved && <div style={{ color: "#16A34A", fontSize: 13, marginTop: 10 }}>رمز عبور با موفقیت تغییر کرد.</div>}
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 24, maxWidth: 420 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>پشتیبان‌گیری از داده‌ها</div>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
          چون داده‌ها فقط در همین مرورگر ذخیره می‌شن، بهتره یک نسخه پشتیبان داشته باشی.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={exportBackup}><Download size={15} />دانلود فایل پشتیبان</Button>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#fff", color: "#334155", border: "1.5px solid #E2E8F0",
          }}>
            بازیابی از فایل
            <input type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
          </label>
        </div>
        {importMsg && <div style={{ fontSize: 13, color: "#2563EB", marginTop: 10 }}>{importMsg}</div>}
      </div>
    </div>
  );
}> e.key === "Enter" && addStudent()} style={{ maxWidth: 260 }} />
            <Button onClick={addStudent} disabled={saving}><Plus size={16} />{saving ? "در حال افزودن..." : "افزودن"}</Button>
          </div>
        )}
      </div>

      {members.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Button variant="ghost" onClick={printCodes}><FileText size={15} />چاپ کارت کدها برای پخش بین دانش‌آموزان</Button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
        {members.length === 0 ? (
          <EmptyState text="هنوز دانش‌آموزی به این کلاس اضافه نشده." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>نام</th>
                <th style={{ padding: "8px 6px" }}>کد ورود</th>
                <th style={{ padding: "8px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #F1F5F9", fontSize: 14 }}>
                  <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }}>{m.fullname}</td>
                  <td style={{ padding: "12px 6px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#2563EB", letterSpacing: 2 }}>{m.code}</span>
                  </td>
                  <td style={{ padding: "12px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 22, justifyContent: "flex-end" }}>
                      <span onClick={() => regenerateCode(m)} style={{ fontSize: 12, color: "#64748B", cursor: "pointer", padding: "6px 4px" }}>کد جدید</span>
                      <span
                        onClick={() => removeStudent(m.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 32, height: 32, borderRadius: 8,
                          background: "#FEF2F2", cursor: "pointer",
                          opacity: deletingId === m.id ? 0.5 : 1,
                        }}
                        title="حذف دانش‌آموز"
                      >
                        <Trash2 size={16} color="#F87171" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   STUDENTS + SETTINGS (simple)
--------------------------------------------------------- */

function StudentsScreen({ teacher, students, exams, answers, questions, refresh }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const myStudents = students.filter((s) => s.teacher_id === teacher.username);

  const removeStudentRecord = async (ids) => {
    if (!window.confirm("سوابق شرکت این دانش‌آموز در همه‌ی آزمون‌ها حذف شود؟ این کار قابل بازگشت نیست.")) return;
    setDeletingKey(ids.join(","));
    const relatedAnswers = answers.filter((a) => ids.includes(a.student_id));
    await Promise.all(relatedAnswers.map((a) => deleteKey(`answer:${a.id}`)));
    await Promise.all(ids.map((id) => deleteKey(`student:${id}`)));
    setDeletingKey(null);
    if (refresh) await refresh();
  };

  // Group by name since each exam attempt creates a separate student record.
  const byName = {};
  myStudents.forEach((s) => {
    const key = s.fullname.trim().toLowerCase();
    byName[key] = byName[key] || { fullname: s.fullname, class_code: s.class_code, ids: [] };
    byName[key].ids.push(s.id);
  });

  const rows = Object.values(byName).map((g) => {
    const myAnswers = answers.filter((a) => g.ids.includes(a.student_id));
    const examIds = [...new Set(myAnswers.map((a) => a.exam_id))];
    const trend = examIds.map((examId) => {
      const list = myAnswers.filter((a) => a.exam_id === examId);
      const totalMarks = list.reduce((s, a) => s + (a.mark || 1), 0);
      const gotMarks = list.reduce((s, a) => s + awardedMarkOf(a), 0);
      const pct = totalMarks ? Math.round((gotMarks / totalMarks) * 1000) / 10 : 0;
      const exam = exams.find((e) => e.id === examId);
      const date = list[0]?.answered_at || null;
      return { examId, title: exam?.title || "—", pct, date };
    }).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    return { ...g, examCount: examIds.length, trend };
  });

  const displayRows = search.trim()
    ? rows.filter((s) => (s.fullname + " " + (s.class_code || "")).toLowerCase().includes(search.trim().toLowerCase()))
    : rows;

  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="دانش‌آموزان" teacherName={teacher.fullname} />
      {rows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام یا کلاس..." style={{ maxWidth: 260 }} />
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22 }}>
        {rows.length === 0 ? (
          <EmptyState text="هنوز دانش‌آموزی در آزمون‌های تو شرکت نکرده است." />
        ) : displayRows.length === 0 ? (
          <EmptyState text="نتیجه‌ای با این جستجو پیدا نشد." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: "8px 6px" }}>نام</th>
                <th style={{ padding: "8px 6px" }}>کد کلاس</th>
                <th style={{ padding: "8px 6px" }}>تعداد آزمون شرکت‌کرده</th>
                <th style={{ padding: "8px 6px" }}></th>
                <th style={{ padding: "8px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((s) => (
                <React.Fragment key={s.fullname}>
                  <tr style={{ borderTop: "1px solid #F1F5F9", fontSize: 14, cursor: s.trend.length > 1 ? "pointer" : "default" }}>
                    <td style={{ padding: "12px 6px", fontWeight: 700, color: "#1E293B" }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>{s.fullname}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>{s.class_code || "—"}</td>
                    <td style={{ padding: "12px 6px", color: "#475569" }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>{s.examCount}</td>
                    <td style={{ padding: "12px 6px", color: "#2563EB", fontSize: 12 }} onClick={() => s.trend.length > 1 && setExpanded((e) => e === s.fullname ? null : s.fullname)}>
                      {s.trend.length > 1 && (expanded === s.fullname ? "بستن روند ▲" : "روند نمرات ▼")}
                    </td>
                    <td style={{ padding: "12px 6px" }}>
                      <Trash2
                        size={16}
                        style={{ cursor: "pointer", color: "#F87171", opacity: deletingKey === s.ids.join(",") ? 0.4 : 1 }}
                        onClick={() => removeStudentRecord(s.ids)}
                      />
                    </td>
                  </tr>
                  {expanded === s.fullname && (
                    <tr>
                      <td colSpan={5} style={{ padding: "6px 6px 18px" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 110, background: "#F8FAFC", borderRadius: 10, padding: "14px 18px", overflowX: "auto" }}>
                          {s.trend.map((t) => (
                            <div key={t.examId} title={t.title} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 46 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#1E293B" }}>{t.pct}%</div>
                              <div style={{ width: 22, borderRadius: "4px 4px 0 0", background: t.pct >= 50 ? "#16A34A" : "#DC2626", height: `${Math.max(4, t.pct * 0.6)}px` }} />
                              <div style={{ fontSize: 10, color: "#94A3B8", maxWidth: 60, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   MESSAGES — teacher broadcasts announcements to all students,
   one class, or a single student; shown in the student portal.
--------------------------------------------------------- */

function MessagesScreen({ teacher, classes, roster, messages, refresh }) {
  const [targetType, setTargetType] = useState("all"); // 'all' | 'class' | 'student'
  const [targetClassId, setTargetClassId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const myClasses = classes.filter((c) => c.teacher_id === teacher.username);
  const myRoster = roster.filter((r) => r.teacher_id === teacher.username);
  const myMessages = messages.filter((m) => m.teacher_id === teacher.username)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const send = async () => {
    if (!text.trim()) return;
    if (targetType === "class" && !targetClassId) return;
    if (targetType === "student" && !targetStudentId) return;
    setSending(true);
    const id = uid();
    await setJSON(`message:${id}`, {
      id, teacher_id: teacher.username,
      target_type: targetType,
      target_id: targetType === "class" ? targetClassId : targetType === "student" ? targetStudentId : null,
      text: text.trim(),
      created_at: new Date().toISOString(),
    });
    setSending(false);
    setText("");
    await refresh();
  };

  const removeMessage = async (id) => {
    setDeletingId(id);
    await deleteKey(`message:${id}`);
    setDeletingId(null);
    await refresh();
  };

  const describeTarget = (m) => {
    if (m.target_type === "all") return "همه‌ی دانش‌آموزان";
    if (m.target_type === "class") return `کلاس: ${classes.find((c) => c.id === m.target_id)?.name || "حذف‌شده"}`;
    return `دانش‌آموز: ${roster.find((r) => r.id === m.target_id)?.fullname || "حذف‌شده"}`;
  };

  return (
    <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>
      <TopBar title="پیام‌ها" teacherName={teacher.fullname} />
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        پیام‌هایی که اینجا می‌فرستی، در پرتال دانش‌آموزی (وقتی دانش‌آموز با کد خودش وارد می‌شود) نمایش داده می‌شوند.
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 22, marginBottom: 20 }}>
        <Field label="گیرنده">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "همه‌ی دانش‌آموزان" },
              { key: "class", label: "یک کلاس خاص" },
              { key: "student", label: "یک دانش‌آموز خاص" },
            ].map((opt) => (
              <div key={opt.key} onClick={() => setTargetType(opt.key)} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: targetType === opt.key ? "#2563EB" : "#F1F5F9", color: targetType === opt.key ? "#fff" : "#475569",
              }}>{opt.label}</div>
            ))}
          </div>
        </Field>
        {targetType === "class" && (
          <Field label="انتخاب کلاس">
            <select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)} style={inputStyle}>
              <option value="">— انتخاب کن —</option>
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {targetType === "student" && (
          <Field label="انتخاب دانش‌آموز">
            <select value={targetStudentId} onChange={(e) => setTargetStudentId(e.target.value)} style={inputStyle}>
              <option value="">— انتخاب کن —</option>
              {myRoster.map((r) => (
                <option key={r.id} value={r.id}>{r.fullname} ({classes.find((c) => c.id === r.class_id)?.name || "—"})</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="متن پیام">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} placeholder="مثلاً: فردا امتحان فصل ۵ برگزار می‌شود." />
        </Field>
        <Button onClick={send} disabled={sending}><Plus size={16} />{sending ? "در حال ارسال..." : "ارسال پیام"}</Button>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 12 }}>پیام‌های ارسال‌شده</div>
      {myMessages.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6" }}>
          <EmptyState text="هنوز پیامی نفرستاده‌ای." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {myMessages.map((m) => (
            <div key={m.id} style={{ background: "#fff", border: "1px solid #EEF1F6", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, color: "#334155", marginBottom: 6, whiteSpace: "pre-wrap" }}>{m.text}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge tone="blue">{describeTarget(m)}</Badge>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(m.created_at).toLocaleString("fa-IR")}</span>
                </div>
              </div>
              <Trash2 size={16} style={{ cursor: "pointer", color: "#F87171", flexShrink: 0, opacity: deletingId === m.id ? 0.4 : 1 }} onClick={() => removeMessage(m.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   STUDENT PORTAL — a student enters their roster code to see
   their own exam results and any messages from the teacher.
   No teacher login required; reachable from the login screen.
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
      <div style={{ flex: 1.15, padding: "44px 40px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>پرتال دانش‌آموزی</div>
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 26 }}>کدی که معلمت به تو داده را وارد کن تا نمرات و پیام‌های خودت را ببینی.</div>
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
    <div style={{ flex: 1.15, padding: "44px 40px", maxHeight: "80vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B" }}>{activeRoster.fullname}</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>کلاس: {className}</div>
        </div>
        <span onClick={() => { setActiveRoster(null); setCodeInput(""); }} style={{ fontSize: 12, color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>خروج</span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 10 }}>نمرات آزمون‌ها</div>
      {results.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24 }}>هنوز در آزمونی شرکت نکرده‌ای.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
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

function SettingsScreen({ teacher, onUpdate, refresh }) {
  const [fullname, setFullname] = useState(teacher.fullname);
  const [email, setEmail] = useState(teacher.email || "");
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const save = async () => {
    const updated = { ...teacher, fullname, email };
    await setJSON(`teacher:${teacher.username}`, updated);
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const changePassword = async () => {
    setPwError(""); setPwSaved(false);
    if (!curPw || !newPw || !newPw2) { setPwError("همه فیلدها را پر کنید."); return; }
    if (curPw !== teacher.password) { setPwError("رمز عبور فعلی اشتباه است."); return; }
    if (newPw.length < 4) { setPwError("رمز عبور جدید باید حداقل ۴ کاراکتر باشد."); return; }
    if (newPw !== newPw2) { setPwError("رمز عبور جدید و تکرار آن یکسان نیستند."); return; }
    const updated = { ...teacher, password: newPw };
    await setJSON(`teacher:${teacher.username}`, updated);
    onUpdate(updated);
    setCurPw(""); setNewPw(""); setNewPw2("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  };

  const exportBackup = async () => {
    const prefixes = ["teacher:", "exam:", "question:", "student:", "answer:"];
    const data = {};
    for (const p of prefixes) {
      const keys = await listPrefix(p);
      for (const k of keys) {
        data[k] = await getJSON(k);
      }
    }
    downloadTextFile("edu-exam-backup.json", JSON.stringify(data, null, 2), "application/json");
  };

  const importBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("در حال بازیابی...");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const keys = Object.keys(data);
      for (const k of keys) {
        await setJSON(k, data[k]);
      }
      await refresh();
      setImportMsg(`${keys.length} مورد با موفقیت بازیابی شد.`);
    } catch {
      setImportMsg("فایل نامعتبر است.");
    }
    e.target.value = "";
  };

  return (
    <div style={{ flex: 1, padding: "30px 34px" }}>
      <TopBar title="تنظیمات" teacherName={teacher.fullname} />
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 24, maxWidth: 420, marginBottom: 20 }}>
        <Field label="نام کاربری">
          <TextInput value={teacher.username} disabled style={{ background: "#F8FAFC", color: "#94A3B8" }} />
        </Field>
        <Field label="نام و نام‌خانوادگی">
          <TextInput value={fullname} onChange={(e) => setFullname(e.target.value)} />
        </Field>
        <Field label="ایمیل (برای بازیابی رمز عبور)">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" />
        </Field>
        <Button onClick={save}><Check size={16} />ذخیره تغییرات</Button>
        {saved && <div style={{ color: "#16A34A", fontSize: 13, marginTop: 10 }}>ذخیره شد.</div>}
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 24, maxWidth: 420, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 16 }}>تغییر رمز عبور</div>
        <Field label="رمز عبور فعلی">
          <TextInput type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="رمز عبور فعلی" />
        </Field>
        <Field label="رمز عبور جدید">
          <TextInput type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="رمز عبور جدید" />
        </Field>
        <Field label="تکرار رمز عبور جدید">
          <TextInput type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="تکرار رمز عبور جدید" />
        </Field>
        {pwError && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 10 }}>{pwError}</div>}
        <Button onClick={changePassword}><Check size={16} />تغییر رمز عبور</Button>
        {pwSaved && <div style={{ color: "#16A34A", fontSize: 13, marginTop: 10 }}>رمز عبور با موفقیت تغییر کرد.</div>}
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEF1F6", padding: 24, maxWidth: 420 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>پشتیبان‌گیری از داده‌ها</div>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
          چون داده‌ها فقط در همین مرورگر ذخیره می‌شن، بهتره یک نسخه پشتیبان داشته باشی.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={exportBackup}><Download size={15} />دانلود فایل پشتیبان</Button>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#fff", color: "#334155", border: "1.5px solid #E2E8F0",
          }}>
            بازیابی از فایل
            <input type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
          </label>
        </div>
        {importMsg && <div style={{ fontSize: 13, color: "#2563EB", marginTop: 10 }}>{importMsg}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ROOT APP
--------------------------------------------------------- */
