import { LoginPage } from '../pages/LoginPage.jsx';
import { StartPage } from '../pages/StartPage.jsx';
import { StudentRegisterPage } from '../pages/StudentRegisterPage.jsx';
import { TeacherRegisterPage } from '../pages/TeacherRegisterPage.jsx';

export function PublicArea({
  feedback,
  onBackToLogin,
  onLogin,
  onRegisterStudent,
  onRegisterTeacher,
  onStart,
  onStudentRegister,
  onTeacherRegister,
  page,
}) {
  if (page === 'login') {
    return (
      <LoginPage
        feedback={feedback}
        onLogin={onLogin}
        onStudentRegister={onStudentRegister}
        onTeacherRegister={onTeacherRegister}
      />
    );
  }

  if (page === 'student-register') {
    return (
      <StudentRegisterPage
        feedback={feedback}
        onBack={onBackToLogin}
        onRegister={onRegisterStudent}
      />
    );
  }

  if (page === 'teacher-register') {
    return (
      <TeacherRegisterPage
        feedback={feedback}
        onBack={onBackToLogin}
        onRegister={onRegisterTeacher}
      />
    );
  }

  return <StartPage onStart={onStart} />;
}
