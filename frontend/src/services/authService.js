import { supabase } from './supabaseClient.js';
import { backendUrl } from './apiConfig.js';

function toStudentUser(student) {
  return {
    id: student.id,
    userCode: student.student_code,
    role: 'student',
    name: student.name,
    email: student.email,
    birthday: student.birthday,
    schoolName: student.school_name,
    grade: student.grade,
    course: student.course,
    presenceStatus: student.presence_status || 'offline',
    lastSeenAt: student.last_seen_at,
    totalExp: student.total_exp || 0,
    level: student.level || 1,
  };
}

function toTeacherUser(teacher) {
  return {
    id: teacher.id,
    userCode: teacher.teacher_code,
    role: 'teacher',
    name: teacher.name,
    email: teacher.email,
    birthday: teacher.birthday,
    schoolName: teacher.school_name,
    presenceStatus: teacher.presence_status || 'offline',
    lastSeenAt: teacher.last_seen_at,
  };
}

function toAdminUser(profile) {
  return {
    id: profile.id,
    userCode: profile.user_code,
    role: 'admin',
    name: profile.name,
    email: profile.email,
    birthday: profile.birthday,
    schoolName: profile.school_name,
  };
}

async function fetchStudent(userId) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toStudentUser(data) : null;
}

async function fetchTeacher(userId) {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toTeacherUser(data) : null;
}

async function fetchAdmin(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toAdminUser(data) : null;
}

async function fetchAccount(userId) {
  const student = await fetchStudent(userId);

  if (student) {
    return student;
  }

  const teacher = await fetchTeacher(userId);

  if (teacher) {
    return teacher;
  }

  const admin = await fetchAdmin(userId);

  if (admin) {
    return admin;
  }

  throw new Error('Account profile not found.');
}

async function createStudent(user, profile) {
  const { data, error } = await supabase
    .from('students')
    .insert({
      id: user.id,
      name: profile.name.trim(),
      email: profile.email.trim().toLowerCase(),
      birthday: profile.birthday,
      school_name: profile.schoolName.trim(),
      grade: profile.grade.trim(),
      course: profile.course.trim(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toStudentUser(data);
}

async function createTeacher(user, profile) {
  const { data, error } = await supabase
    .from('teachers')
    .insert({
      id: user.id,
      name: profile.name.trim(),
      email: profile.email.trim().toLowerCase(),
      birthday: profile.birthday,
      school_name: profile.schoolName.trim(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toTeacherUser(data);
}

async function registerAccount(profile, role) {
  const response = await fetch(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role,
      email: profile.email.trim().toLowerCase(),
      password: profile.password,
      name: profile.name.trim(),
      birthday: profile.birthday,
      schoolName: profile.schoolName.trim(),
      grade: profile.grade?.trim() || '',
      course: profile.course?.trim() || '',
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Registration failed.');
  }

  return result.user;
}

export async function registerStudent(profile) {
  const user = await registerAccount(profile, 'student');
  return { user };
}

export async function registerTeacher(profile) {
  const user = await registerAccount(profile, 'teacher');
  return { user };
}

export async function loginUser(credentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const user = await fetchAccount(data.user.id);

  if (user.role === 'student' || user.role === 'teacher') {
    await updateUserPresence(user, 'online');
    user.presenceStatus = 'online';
    user.lastSeenAt = new Date().toISOString();
  }

  return { user };
}

export async function getCurrentAuthUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    return null;
  }

  const user = await fetchAccount(data.session.user.id);

  if (user.role === 'student' || user.role === 'teacher') {
    await updateUserPresence(user, 'online');
    user.presenceStatus = 'online';
    user.lastSeenAt = new Date().toISOString();
  }

  return user;
}

export async function logoutUser() {
  await supabase.auth.signOut();
}

export async function getCurrentAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session?.access_token || '';
}

export async function updateUserPresence(user, status) {
  if (!user?.id || !['student', 'teacher'].includes(user.role)) {
    return;
  }

  const table = user.role === 'student' ? 'students' : 'teachers';
  const { error } = await supabase
    .from(table)
    .update({
      presence_status: status,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProfileDetails(user, profile) {
  if (!user?.id) {
    throw new Error('User profile not found.');
  }

  const cleanProfile = {
    name: profile.name.trim(),
    school_name: profile.schoolName.trim(),
  };

  if (!cleanProfile.name || !cleanProfile.school_name) {
    throw new Error('Please enter name and school.');
  }

  if (user.role === 'student') {
    const { data, error } = await supabase
      .from('students')
      .update(cleanProfile)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toStudentUser(data);
  }

  if (user.role === 'teacher') {
    const { data, error } = await supabase
      .from('teachers')
      .update(cleanProfile)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toTeacherUser(data);
  }

  if (user.role === 'admin') {
    const { data, error } = await supabase
      .from('profiles')
      .update(cleanProfile)
      .eq('id', user.id)
      .eq('role', 'admin')
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toAdminUser(data);
  }

  throw new Error('This role cannot update profile details.');
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}
