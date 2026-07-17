/* ---------------------------------------------------------
ROOT APP
--------------------------------------------------------- */
function EduExamApp() {
  const [authView, setAuthView] = useState("login");
  const [portalMode, setPortalMode] = useState("teacher");
  const [teacher, setTeacher] = useState(null);
  const [view, setView] = useState("dashboard");
  const [activeExamId, setActiveExamId] = useState(null);
  const [activeClassId, setActiveClassId] = useState(null);
  const [studentExamId, setStudentExamId] = useState(
    () => new URLSearchParams(window.location.search).get("exam")
  );
  const [resetToken, setResetToken] = useState(
    () => new URLSearchParams(window.location.search).get("reset")
  );
  const [teacherExists, setTeacherExists] = useState(false);
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [roster, setRoster] = useState([]);
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [ex, qs, st, an, cl, ro, msg, teacherKeys] = await Promise.all([
      loadAll("exam:"), loadAll("question:"), loadAll("student:"), loadAll("answer:"),
      loadAll("class:"), loadAll("roster:"), loadAll("message:"), listPrefix("teacher:"),
    ]);
    setExams(ex); setQuestions(qs); setStudents(st); setAnswers(an); setClasses(cl); setRoster(ro); setMessages(msg);
    setTeacherExists(teacherKeys.length > 0);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const addLocalClass = useCallback((record) => {
    setClasses((prev) => [...prev, record]);
  }, []);

  const removeLocalClass = useCallback((id) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setRoster((prev) => prev.filter((r) => r.class_id !== id));
  }, []);

  const updateLocalClass = useCallback((record) => {
    setClasses((prev) => prev.map((c) => (c.id === record.id ? record : c)));
  }, []);

  const addLocalRoster = useCallback((record) => {
    setRoster((prev) => [...prev, record]);
  }, []);

  const addLocalRosterMany = useCallback((records) => {
    setRoster((prev) => [...prev, ...records]);
  }, []);

  const updateLocalRoster = useCallback((record) => {
    setRoster((prev) => prev.map((r) => (r.id === record.id ? record : r)));
  }, []);

  const removeLocalRoster = useCallback((id) => {
    setRoster((prev) => prev.filter((r) => r.id !== id));
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "inherit", color: "#64748B" }}>
        در حال بارگذاری...
      </div>
    );
  }

  if (studentExamId) {
    const exam = exams.find((e) => e.id === studentExamId);
    if (!exam) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          آزمون یافت نشد.
        </div>
      );
    }
    return (
      <TakeExamScreen
        exam={exam}
        questions={questions}
        roster={roster.filter((r) => r.teacher_id === exam.teacher_id)}
        classes={classes.filter((c) => c.teacher_id === exam.teacher_id)}
        onFinish={refresh}
        onExit={() => {
          setStudentExamId(null);
          const url = new URL(window.location.href);
          url.searchParams.delete("exam");
          window.history.replaceState({}, "", url);
        }}
      />
    );
  }

  if (resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onDone={() => {
          setResetToken(null);
          const url = new URL(window.location.href);
          url.searchParams.delete("reset");
          window.history.replaceState({}, "", url);
        }}
      />
    );
  }

  if (!teacher) {
    const showRegister = authView === "register" && !teacherExists;
    const showForgot = authView === "forgot";

    if (showForgot) {
      return <ForgotPasswordScreen goLogin={() => setAuthView("login")} />;
    }

    return showRegister ? (
      <RegisterScreen
        onRegistered={(t) => { setTeacher(t); setTeacherExists(true); }}
        goLogin={() => setAuthView("login")}
      />
    ) : (
      <LoginScreen
        onLogin={setTeacher}
        goRegister={() => setAuthView("register")}
        goForgot={() => setAuthView("forgot")}
        allowRegister={!teacherExists}
        portalMode={portalMode}
        setPortalMode={setPortalMode}
        portalData={{ roster, students, answers, exams, questions, classes, messages }}
      />
    );
  }

  const activeExam = exams.find((e) => e.id === activeExamId);
  const activeClass = classes.find((c) => c.id === activeClassId);

  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", minHeight: "100vh" }}>
      <Sidebar
        active={view}
        onNavigate={(v) => { setView(v); setActiveExamId(null); setActiveClassId(null); }}
        onLogout={() => { setTeacher(null); setView("dashboard"); }}
        teacherName={teacher.fullname}
      />
      <div style={{ flex: 1, background: "#F8FAFC", minHeight: "100vh" }}>
        {view === "dashboard" && (
          <DashboardScreen
            teacher={teacher} exams={exams} questions={questions} students={students} answers={answers}
            onNavigate={setView}
            onOpenExam={(id) => { setActiveExamId(id); setView("manageQuestions"); }}
          />
        )}
        {view === "exams" && (
          <ExamsScreen
            teacher={teacher} exams={exams} questions={questions} answers={answers} classes={classes}
            onNavigate={(v, examId) => { setView(v); if (examId) setActiveExamId(examId); }}
            onOpenExam={(id) => { setActiveExamId(id); setView("manageQuestions"); }}
            refresh={refresh}
          />
        )}
        {view === "manageQuestions" && activeExam && (
          <QuestionsScreen
            exam={activeExam} questions={questions} exams={exams} teacher={teacher}
            onBack={() => setView("exams")}
            refresh={refresh}
          />
        )}
        {view === "questionbank" && (
          <QuestionBankScreen
            teacher={teacher} questions={questions} exams={exams}
            refresh={refresh}
          />
        )}
        {view === "results" && (
          <ResultsScreen
            teacher={teacher} exams={exams} questions={questions} students={students} answers={answers}
            initialExamId={activeExamId}
            onBack={() => setView("exams")}
            refresh={refresh}
          />
        )}
        {view === "classes" && (
          <ClassesScreen
            teacher={teacher} classes={classes} roster={roster}
            onOpenClass={(id) => { setActiveClassId(id); setView("manageRoster"); }}
            refresh={refresh}
            addLocalClass={addLocalClass}
            removeLocalClass={removeLocalClass}
            updateLocalClass={updateLocalClass}
          />
        )}
        {view === "manageRoster" && activeClass && (
          <RosterScreen
            classroom={activeClass} roster={roster} teacher={teacher}
            onBack={() => setView("classes")}
            refresh={refresh}
            addLocalRoster={addLocalRoster}
            addLocalRosterMany={addLocalRosterMany}
            updateLocalRoster={updateLocalRoster}
            removeLocalRoster={removeLocalRoster}
          />
        )}
        {view === "students" && (
          <StudentsScreen teacher={teacher} students={students} exams={exams} answers={answers} questions={questions} refresh={refresh} />
        )}
        {view === "messages" && (
          <MessagesScreen teacher={teacher} classes={classes} roster={roster} messages={messages} refresh={refresh} />
        )}
        {view === "settings" && (
          <SettingsScreen teacher={teacher} onUpdate={setTeacher} refresh={refresh} />
        )}

        {(view === "exams" || view === "dashboard") && exams.some(e => e.teacher_id === teacher.username) && (
          <div style={{ position: "fixed", bottom: 22, left: 22 }}>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) setStudentExamId(e.target.value); }}
              style={{ ...inputStyle, padding: "10px 14px", boxShadow: "0 6px 20px rgba(0,0,0,.12)" }}
            >
              <option value="" disabled>پیش‌نمایش آزمون به‌عنوان دانش‌آموز</option>
              {exams.filter(e => e.teacher_id === teacher.username).map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<EduExamApp />);
