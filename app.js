/* ---------------------------------------------------------
ROOT APP — now supports admin + multiple teachers
--------------------------------------------------------- */
console.log('✅ app.js شروع به کار کرد');

function EduExamApp() {
  console.log('✅ EduExamApp اجرا شد');
  
  const [authView, setAuthView] = React.useState("login");
  const [portalMode, setPortalMode] = React.useState("teacher");
  const [teacher, setTeacher] = React.useState(null);
  const [view, setView] = React.useState("dashboard");
  const [activeExamId, setActiveExamId] = React.useState(null);
  const [activeClassId, setActiveClassId] = React.useState(null);
  
  // ✅ درست شده: فقط یک بار تعریف شده
  const [studentExamId, setStudentExamId] = React.useState(
    () => new URLSearchParams(window.location.search).get("exam")
  );
  
  // ✅ درست شده: فقط یک بار تعریف شده
  const [resetToken, setResetToken] = React.useState(
    () => new URLSearchParams(window.location.search).get("reset")
  );
  
  const [adminExists, setAdminExists] = React.useState(false);
  const [exams, setExams] = React.useState([]);
  const [questions, setQuestions] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const [answers, setAnswers] = React.useState([]);
  const [classes, setClasses] = React.useState([]);
  const [roster, setRoster] = React.useState([]);
  const [messages, setMessages] = React.useState([]);
  const [ready, setReady] = React.useState(false);
  
  const refresh = React.useCallback(async () => {
    console.log('🔄 refresh اجرا شد');
    const [ex, qs, st, an, cl, ro, msg, teacherKeys] = await Promise.all([
      loadAll("exam:"), loadAll("question:"), loadAll("student:"), loadAll("answer:"),
      loadAll("class:"), loadAll("roster:"), loadAll("message:"), listPrefix("teacher:"),
    ]);
    setExams(ex); setQuestions(qs); setStudents(st); setAnswers(an); setClasses(cl); setRoster(ro); setMessages(msg);
    setAdminExists(teacherKeys.length > 0);
  }, []);
  
  React.useEffect(() => {
    console.log('✅ useEffect اجرا شد');
    (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);
  
  // Optimistic local-state helpers for classes/roster
  const addLocalClass = React.useCallback((record) => {
    setClasses((prev) => [...prev, record]);
  }, []);
  
  const removeLocalClass = React.useCallback((id) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setRoster((prev) => prev.filter((r) => r.class_id !== id));
  }, []);
  
  const updateLocalClass = React.useCallback((record) => {
    setClasses((prev) => prev.map((c) => (c.id === record.id ? record : c)));
  }, []);
  
  const addLocalRoster = React.useCallback((record) => {
    setRoster((prev) => [...prev, record]);
  }, []);
  
  const addLocalRosterMany = React.useCallback((records) => {
    setRoster((prev) => [...prev, ...records]);
  }, []);
  
  const updateLocalRoster = React.useCallback((record) => {
    setRoster((prev) => prev.map((r) => (r.id === record.id ? record : r)));
  }, []);
  
  const removeLocalRoster = React.useCallback((id) => {
    setRoster((prev) => prev.filter((r) => r.id !== id));
  }, []);
  
  if (!ready) {
    console.log('⏳ در حال بارگذاری...');
    return React.createElement('div', { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "inherit", color: "#64748B" } },
      'در حال بارگذاری...'
    );
  }
  
  // Student is taking an exam — separate full-screen flow, no auth needed.
  if (studentExamId) {
    const exam = exams.find((e) => e.id === studentExamId);
    if (!exam) {
      return React.createElement('div', { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" } },
        'آزمون یافت نشد.'
      );
    }
    return React.createElement(TakeExamScreen, {
      exam: exam,
      questions: questions,
      roster: roster.filter((r) => r.teacher_id === exam.teacher_id),
      classes: classes.filter((c) => c.teacher_id === exam.teacher_id),
      onFinish: refresh,
      onExit: () => {
        setStudentExamId(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("exam");
        window.history.replaceState({}, "", url);
      }
    });
  }
  
  // Password-reset link (?reset=TOKEN)
  if (resetToken) {
    return React.createElement(ResetPasswordScreen, {
      token: resetToken,
      onDone: () => {
        setResetToken(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("reset");
        window.history.replaceState({}, "", url);
      }
    });
  }
  
  if (!teacher) {
    const showRegister = authView === "register" && !adminExists;
    const showForgot = authView === "forgot";
    
    if (showForgot) {
      return React.createElement(ForgotPasswordScreen, { goLogin: () => setAuthView("login") });
    }
    
    return showRegister ? React.createElement(RegisterScreen, {
      onRegistered: (t) => { setTeacher(t); setAdminExists(true); },
      goLogin: () => setAuthView("login")
    }) : React.createElement(LoginScreen, {
      onLogin: setTeacher,
      goRegister: () => setAuthView("register"),
      goForgot: () => setAuthView("forgot"),
      allowRegister: !adminExists,
      portalMode: portalMode,
      setPortalMode: setPortalMode,
      portalData: { roster, students, answers, exams, questions, classes, messages }
    });
  }
  
  const activeExam = exams.find((e) => e.id === activeExamId);
  const activeClass = classes.find((c) => c.id === activeClassId);
  
  // Admin dashboard — can see all teachers and their data
  if (teacher.role === "admin") {
    return React.createElement('div', { style: { display: "flex", flexDirection: "row-reverse", minHeight: "100vh" } },
      React.createElement(AdminSidebar, {
        active: view,
        onNavigate: (v) => { setView(v); setActiveExamId(null); setActiveClassId(null); },
        onLogout: () => { setTeacher(null); setView("dashboard"); },
        teacherName: teacher.fullname
      }),
      React.createElement('div', { style: { flex: 1, background: "#F8FAFC", minHeight: "100vh" } },
        view === "dashboard" && React.createElement(AdminDashboardScreen, {
          teacher: teacher,
          exams: exams,
          questions: questions,
          students: students,
          answers: answers,
          classes: classes,
          roster: roster,
          refresh: refresh
        }),
        view === "teachers" && React.createElement(TeachersScreen, { teacher: teacher, refresh: refresh }),
        view === "all-exams" && React.createElement(AllExamsScreen, { teacher: teacher, exams: exams, questions: questions, answers: answers }),
        view === "all-results" && React.createElement(AllResultsScreen, { teacher: teacher, exams: exams, questions: questions, students: students, answers: answers }),
        view === "settings" && React.createElement(SettingsScreen, { teacher: teacher, onUpdate: setTeacher, refresh: refresh })
      )
    );
  }
  
  // Teacher dashboard — can only see their own data
  return React.createElement('div', { style: { display: "flex", flexDirection: "row-reverse", minHeight: "100vh" } },
    React.createElement(Sidebar, {
      active: view,
      onNavigate: (v) => { setView(v); setActiveExamId(null); setActiveClassId(null); },
      onLogout: () => { setTeacher(null); setView("dashboard"); },
      teacherName: teacher.fullname
    }),
    React.createElement('div', { style: { flex: 1, background: "#F8FAFC", minHeight: "100vh" } },
      view === "dashboard" && React.createElement(DashboardScreen, {
        teacher: teacher, exams: exams, questions: questions, students: students, answers: answers,
        onNavigate: setView,
        onOpenExam: (id) => { setActiveExamId(id); setView("manageQuestions"); }
      }),
      view === "exams" && React.createElement(ExamsScreen, {
        teacher: teacher, exams: exams, questions: questions, answers: answers, classes: classes,
        onNavigate: (v, examId) => { setView(v); if (examId) setActiveExamId(examId); },
        onOpenExam: (id) => { setActiveExamId(id); setView("manageQuestions"); },
        refresh: refresh
      }),
      view === "manageQuestions" && activeExam && React.createElement(QuestionsScreen, {
        exam: activeExam, questions: questions, exams: exams, teacher: teacher,
        onBack: () => setView("exams"),
        refresh: refresh
      }),
      view === "questionbank" && React.createElement(QuestionBankScreen, {
        teacher: teacher, questions: questions, exams: exams,
        refresh: refresh
      }),
      view === "results" && React.createElement(ResultsScreen, {
        teacher: teacher, exams: exams, questions: questions, students: students, answers: answers,
        initialExamId: activeExamId,
        onBack: () => setView("exams"),
        refresh: refresh
      }),
      view === "classes" && React.createElement(ClassesScreen, {
        teacher: teacher, classes: classes, roster: roster,
        onOpenClass: (id) => { setActiveClassId(id); setView("manageRoster"); },
        refresh: refresh,
        addLocalClass: addLocalClass,
        removeLocalClass: removeLocalClass,
        updateLocalClass: updateLocalClass
      }),
      view === "manageRoster" && activeClass && React.createElement(RosterScreen, {
        classroom: activeClass, roster: roster, teacher: teacher,
        onBack: () => setView("classes"),
        refresh: refresh,
        addLocalRoster: addLocalRoster,
        addLocalRosterMany: addLocalRosterMany,
        updateLocalRoster: updateLocalRoster,
        removeLocalRoster: removeLocalRoster
      }),
      view === "students" && React.createElement(StudentsScreen, { teacher: teacher, students: students, exams: exams, answers: answers, questions: questions, refresh: refresh }),
      view === "messages" && React.createElement(MessagesScreen, { teacher: teacher, classes: classes, roster: roster, messages: messages, refresh: refresh }),
      view === "settings" && React.createElement(SettingsScreen, { teacher: teacher, onUpdate: setTeacher, refresh: refresh })
    )
  );
}

console.log('✅ app.js کامل شد');

// رندر کردن برنامه
const root = ReactDOM.createRoot(document.getElementById("root"));
console.log('✅ root ایجاد شد');
root.render(React.createElement(EduExamApp));
console.log('✅ رندر شد');
