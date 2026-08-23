import React from 'react';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import {
  DashboardBackLogoutPrompt,
  ModuleDeleteConfirmDialog,
  QuestionDeleteConfirmDialog,
} from '../components/dialogs/AppDialogs.jsx';
import { AdminDashboardPage } from '../pages/AdminDashboardPage.jsx';
import { CreateSessionPage } from '../pages/CreateSessionPage.jsx';
import { LiveLobbyPage } from '../pages/LiveLobbyPage.jsx';
import { LogoutLoadingPage } from '../pages/LogoutLoadingPage.jsx';
import { ModuleManagementPage } from '../pages/ModuleManagementPage.jsx';
import { QuestionBankPage } from '../pages/QuestionBankPage.jsx';
import { ResultHistoryPage } from '../pages/ResultHistoryPage.jsx';
import { RoleSelectionPage } from '../pages/RoleSelectionPage.jsx';
import { SessionClosedLoadingPage } from '../pages/SessionClosedLoadingPage.jsx';
import { SessionResultsPage } from '../pages/SessionResultsPage.jsx';
import { SessionSummaryLoadingPage } from '../pages/SessionSummaryLoadingPage.jsx';
import { StudentDashboardPage } from '../pages/StudentDashboardPage.jsx';
import { StudentGamePage } from '../pages/StudentGamePage.jsx';
import { StudentJoinPage } from '../pages/StudentJoinPage.jsx';
import { StudentWaitingPage } from '../pages/StudentWaitingPage.jsx';
import { TeacherControlPage } from '../pages/TeacherControlPage.jsx';
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage.jsx';
import { TeacherSessionReviewPage } from '../pages/TeacherSessionReviewPage.jsx';
import { UserManagementPage } from '../pages/UserManagementPage.jsx';
import { isDashboardPage, isPublicPage, isSessionPage } from './publicRoutes.js';
import { PublicArea } from './PublicArea.jsx';

export function AppPageRouter({ app }) {
  const {
    activeModule,
    activeSession,
    addModule,
    addQuestion,
    addUser,
    authChecked,
    backFromSessionResults,
    backLogoutPromptOpen,
    backToTeacherHistory,
    cancelBackLogoutPrompt,
    cancelJoinAccessPrompt,
    closeLobbySession,
    closedSessionNotice,
    completeClassicMcqProgress,
    confirmBackLogoutPrompt,
    confirmDeleteModule,
    confirmDeleteQuestion,
    confirmJoinPublicModule,
    createSession,
    currentUser,
    deleteModule,
    deleteQuestion,
    deleteUser,
    editingQuestionId,
    editModuleDetails,
    editQuestion,
    endSession,
    feedback,
    go,
    importQuestions,
    joinAccessPrompt,
    joinForm,
    joinSession,
    kickLobbyStudent,
    leaveActiveStudentGameSession,
    leaveWaitingRoom,
    loadTeacherModules,
    loadingModules,
    login,
    logout,
    moduleBusyMessage,
    moduleDeleteBusy,
    moduleDeleteConfirm,
    moduleForm,
    modules,
    openSessionResults,
    openStudentActivityResult,
    openStudentJoin,
    openTeacherActiveSession,
    openTeacherSessionReview,
    page,
    pauseSession,
    questionDeleteBusy,
    questionDeleteConfirm,
    questionForm,
    readyForNextQrPairTurn,
    refreshActiveSession,
    registerStudentAccount,
    registerTeacherAccount,
    requestModuleReview,
    requestPrivateModuleAccess,
    resetQuestionForm,
    resumeSession,
    selectedModule,
    selectedModuleId,
    selectModule,
    sessionForm,
    sessions,
    setJoinForm,
    setModuleDeleteConfirm,
    setModuleForm,
    setQuestionDeleteConfirm,
    setQuestionForm,
    setSessionForm,
    setStudentSessionLeavePromptOpen,
    setUserForm,
    startGame,
    stats,
    student,
    studentSession,
    studentSessionLeavePromptOpen,
    submitAnswer,
    submitQrPairAnswerToken,
    teacherDashboardInitialTab,
    timeoutQrPairAssignment,
    toggleModuleVisibility,
    updateCurrentProfile,
    updateCurrentStudentExperience,
    userForm,
    users,
  } = app;

  if (page === 'logout-loading') {
    return <LogoutLoadingPage />;
  }

  if (page === 'session-summary-loading') {
    return <SessionSummaryLoadingPage onDone={() => go('session-results')} />;
  }

  if (page === 'session-closed-loading') {
    return (
      <SessionClosedLoadingPage
        eyebrow={closedSessionNotice.eyebrow}
        message={closedSessionNotice.message}
        title={closedSessionNotice.title}
        onDone={() => go(closedSessionNotice.returnPage)}
      />
    );
  }

  if ((isDashboardPage(page) || isSessionPage(page)) && !authChecked) {
    return (
      <LoadingScreen
        eyebrow="Checking Session"
        message="Please wait while Obits verifies your login."
        status="Securing dashboard"
        title="Confirming your account"
      />
    );
  }

  if (isPublicPage(page)) {
    return (
      <PublicArea
        feedback={feedback}
        page={page}
        onBackToLogin={() => go('login')}
        onLogin={login}
        onRegisterStudent={registerStudentAccount}
        onRegisterTeacher={registerTeacherAccount}
        onStart={() => go('login')}
        onStudentRegister={() => go('student-register')}
        onTeacherRegister={() => go('teacher-register')}
      />
    );
  }

  if (page === 'role-selection') {
    return (
      <RoleSelectionPage
        onTeacher={() => go('teacher-dashboard')}
        onStudent={() => go('student-dashboard')}
        onAdmin={() => go('admin-dashboard')}
        onLogin={() => go('login')}
      />
    );
  }

  if (page === 'student-dashboard') {
    return (
      <>
        <StudentDashboardPage
          student={currentUser?.role === 'student' ? currentUser : student}
          onJoinSession={openStudentJoin}
          onLogout={logout}
          onUpdateProfile={updateCurrentProfile}
          onViewActivityResult={openStudentActivityResult}
        />
        <DashboardBackLogoutPrompt
          isOpen={backLogoutPromptOpen}
          onCancel={cancelBackLogoutPrompt}
          onConfirm={confirmBackLogoutPrompt}
        />
      </>
    );
  }

  if (page === 'teacher-dashboard') {
    return (
      <>
        <TeacherDashboardPage
          currentUser={currentUser}
          feedback={feedback}
          initialTab={teacherDashboardInitialTab}
          loadingModules={loadingModules}
          moduleBusyMessage={moduleBusyMessage}
          moduleForm={moduleForm}
          modules={modules}
          onAddModule={addModule}
          onAddQuestion={addQuestion}
          onCreateSession={createSession}
          onDeleteModule={deleteModule}
          onDeleteQuestion={deleteQuestion}
          onEditModule={editModuleDetails}
          onEditQuestion={editQuestion}
          onCancelQuestionEdit={resetQuestionForm}
          onImportQuestions={importQuestions}
          stats={stats}
          onLogout={logout}
          onModuleFormChange={setModuleForm}
          onOpenResults={openSessionResults}
          onOpenActiveSession={openTeacherActiveSession}
          ongoingSession={sessions.find((session) =>
            ['lobby', 'live', 'paused', 'active'].includes(String(session.status || '').toLowerCase()) &&
            (!session.teacherId || session.teacherId === currentUser?.id),
          )}
          onQuestionFormChange={setQuestionForm}
          onRefreshModules={() => loadTeacherModules(currentUser?.id)}
          onRequestModuleReview={requestModuleReview}
          onSelectedModuleChange={selectModule}
          onSessionFormChange={setSessionForm}
          onToggleModuleVisibility={toggleModuleVisibility}
          onUpdateProfile={updateCurrentProfile}
          onReviewSession={openTeacherSessionReview}
          questionForm={questionForm}
          editingQuestionId={editingQuestionId}
          selectedModule={selectedModule}
          selectedModuleId={selectedModuleId}
          sessionForm={sessionForm}
          sessions={sessions}
        />
        <DashboardBackLogoutPrompt
          isOpen={backLogoutPromptOpen}
          onCancel={cancelBackLogoutPrompt}
          onConfirm={confirmBackLogoutPrompt}
        />
        <ModuleDeleteConfirmDialog
          isBusy={moduleDeleteBusy}
          module={moduleDeleteConfirm}
          onCancel={() => setModuleDeleteConfirm(null)}
          onConfirm={confirmDeleteModule}
        />
        <QuestionDeleteConfirmDialog
          isBusy={questionDeleteBusy}
          target={questionDeleteConfirm}
          onCancel={() => setQuestionDeleteConfirm(null)}
          onConfirm={confirmDeleteQuestion}
        />
      </>
    );
  }

  if (page === 'modules') {
    return (
      <>
        <ModuleManagementPage
          feedback={feedback}
          moduleForm={moduleForm}
          modules={modules}
          onAddModule={addModule}
          onBack={() => go('teacher-dashboard')}
          onDeleteModule={deleteModule}
          onLogout={logout}
          onModuleFormChange={setModuleForm}
        />
        <ModuleDeleteConfirmDialog
          isBusy={moduleDeleteBusy}
          module={moduleDeleteConfirm}
          onCancel={() => setModuleDeleteConfirm(null)}
          onConfirm={confirmDeleteModule}
        />
      </>
    );
  }

  if (page === 'questions') {
    return (
      <>
        <QuestionBankPage
          feedback={feedback}
          modules={modules}
          onAddQuestion={addQuestion}
          onBack={() => go('teacher-dashboard')}
          onDeleteQuestion={deleteQuestion}
          onEditQuestion={editQuestion}
          onCancelQuestionEdit={resetQuestionForm}
          onImportQuestions={importQuestions}
          onLogout={logout}
          onQuestionFormChange={setQuestionForm}
          onSelectedModuleChange={selectModule}
          questionForm={questionForm}
          editingQuestionId={editingQuestionId}
          selectedModule={selectedModule}
          selectedModuleId={selectedModuleId}
        />
        <QuestionDeleteConfirmDialog
          isBusy={questionDeleteBusy}
          target={questionDeleteConfirm}
          onCancel={() => setQuestionDeleteConfirm(null)}
          onConfirm={confirmDeleteQuestion}
        />
      </>
    );
  }

  if (page === 'create-session') {
    return (
      <CreateSessionPage
        feedback={feedback}
        modules={modules}
        onBack={() => go('teacher-dashboard')}
        onCreateSession={createSession}
        onLogout={logout}
        ongoingSession={sessions.find((session) =>
          ['lobby', 'live', 'active'].includes(String(session.status || '').toLowerCase()) &&
          (!session.teacherId || session.teacherId === currentUser?.id),
        )}
        onSessionFormChange={setSessionForm}
        sessionForm={sessionForm}
      />
    );
  }

  if (page === 'live-lobby') {
    return (
      <LiveLobbyPage
        activeModule={activeModule}
        activeSession={activeSession}
        onBack={() => go('teacher-dashboard')}
        onCloseSession={closeLobbySession}
        onKickStudent={kickLobbyStudent}
        onRefreshSession={refreshActiveSession}
        onStartGame={startGame}
      />
    );
  }

  if (page === 'student-join') {
    return (
      <StudentJoinPage
        feedback={feedback}
        joinAccessPrompt={joinAccessPrompt}
        joinForm={joinForm}
        onBack={() => go(currentUser?.role === 'student' ? 'student-dashboard' : 'role-selection')}
        onCancelJoinAccessPrompt={cancelJoinAccessPrompt}
        onConfirmJoinPublicModule={confirmJoinPublicModule}
        onJoinFormChange={setJoinForm}
        onJoinSession={joinSession}
        onRequestPrivateModuleAccess={requestPrivateModuleAccess}
      />
    );
  }

  if (page === 'student-waiting') {
    return (
      <StudentWaitingPage
        currentSession={studentSession}
        leaveConfirmOpen={studentSessionLeavePromptOpen}
        onLeaveConfirmChange={setStudentSessionLeavePromptOpen}
        onLeaveSession={leaveWaitingRoom}
        student={student}
      />
    );
  }

  if (page === 'student-game') {
    return (
      <StudentGamePage
        activeModule={activeModule}
        activeSession={activeSession}
        feedback={feedback}
        leaveConfirmOpen={studentSessionLeavePromptOpen}
        onBack={() => setStudentSessionLeavePromptOpen(true)}
        onResults={() => go('session-results')}
        onClassicCompleted={completeClassicMcqProgress}
        onLeaveConfirmChange={setStudentSessionLeavePromptOpen}
        onLeaveSession={leaveActiveStudentGameSession}
        onQrPairReady={readyForNextQrPairTurn}
        onQrPairScan={submitQrPairAnswerToken}
        onQrPairTimeout={timeoutQrPairAssignment}
        onSubmitAnswer={submitAnswer}
        student={student}
      />
    );
  }

  if (page === 'teacher-control') {
    return (
      <TeacherControlPage
        activeModule={activeModule}
        activeSession={activeSession}
        onBack={() => go('teacher-dashboard')}
        onEndSession={endSession}
        onPauseSession={pauseSession}
        onResumeSession={resumeSession}
      />
    );
  }

  if (page === 'teacher-session-review') {
    return (
      <TeacherSessionReviewPage
        module={activeModule}
        onBack={backToTeacherHistory}
        session={activeSession}
      />
    );
  }

  if (page === 'session-results') {
    return (
      <SessionResultsPage
        activeSession={activeSession}
        currentUser={currentUser}
        onBack={backFromSessionResults}
        onExperienceSettled={updateCurrentStudentExperience}
        onLogout={logout}
      />
    );
  }

  if (page === 'result-history') {
    return (
      <ResultHistoryPage
        modules={modules}
        onBack={() => go('teacher-dashboard')}
        onLogout={logout}
        onOpenResults={openSessionResults}
        sessions={sessions}
      />
    );
  }

  if (page === 'admin-dashboard') {
    return (
      <>
        <AdminDashboardPage
          currentUser={currentUser}
          modules={modules}
          onLogout={logout}
          sessions={sessions}
          stats={stats}
          users={users}
        />
        <DashboardBackLogoutPrompt
          isOpen={backLogoutPromptOpen}
          onCancel={cancelBackLogoutPrompt}
          onConfirm={confirmBackLogoutPrompt}
        />
      </>
    );
  }

  if (page === 'user-management') {
    return (
      <UserManagementPage
        feedback={feedback}
        onAddUser={addUser}
        onBack={() => go('admin-dashboard')}
        onDeleteUser={deleteUser}
        onLogout={logout}
        onUserFormChange={setUserForm}
        userForm={userForm}
        users={users}
      />
    );
  }

  return null;
}
