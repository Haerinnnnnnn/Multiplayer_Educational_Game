import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to backend/.env.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
}

function isNotFoundError(error) {
  return error?.code === 'user_not_found' || /not found/i.test(error?.message || '');
}

async function setUserPresence(userId, status) {
  const payload = {
    presence_status: status,
    last_seen_at: new Date().toISOString(),
  };

  const [studentResult, teacherResult] = await Promise.all([
    supabaseAdmin.from('students').update(payload).eq('id', userId),
    supabaseAdmin.from('teachers').update(payload).eq('id', userId),
  ]);

  const error = studentResult.error || teacherResult.error;

  if (error) {
    throw error;
  }
}

async function findPublicUser(userId, fallback = {}) {
  const [studentResult, teacherResult, profileResult] = await Promise.all([
    supabaseAdmin.from('students').select('id, email, name').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('teachers').select('id, email, name').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('profiles').select('id, email, name, role').eq('id', userId).maybeSingle(),
  ]);

  const error = studentResult.error || teacherResult.error || profileResult.error;

  if (error) {
    throw error;
  }

  const record = studentResult.data || teacherResult.data || profileResult.data || fallback;

  return {
    email: record.email?.trim().toLowerCase() || '',
    name: record.name || '',
    role: record.role || fallback.role || '',
  };
}

async function deletePublicRows({ userId, email }) {
  const tables = ['students', 'teachers', 'profiles'];

  await Promise.all(
    tables.map(async (table) => {
      const { error: idError } = await supabaseAdmin.from(table).delete().eq('id', userId);

      if (idError) {
        throw idError;
      }

      if (email) {
        const { error: emailError } = await supabaseAdmin.from(table).delete().eq('email', email);

        if (emailError) {
          throw emailError;
        }
      }
    }),
  );
}

async function deletePublicRowsByEmail(email) {
  if (!email) {
    return;
  }

  const tables = ['students', 'teachers', 'profiles'];

  await Promise.all(
    tables.map(async (table) => {
      const { error } = await supabaseAdmin.from(table).delete().eq('email', email);

      if (error) {
        throw error;
      }
    }),
  );
}

async function deleteAuthUser(userId) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, false);

  if (error && !isNotFoundError(error)) {
    throw error;
  }
}

async function deleteAuthUsersByEmail(email, protectedUserId) {
  if (!email) {
    return [];
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  const matchedUsers = (data.users || []).filter(
    (user) => user.email?.toLowerCase() === email && user.id !== protectedUserId,
  );

  await Promise.all(matchedUsers.map((user) => deleteAuthUser(user.id)));
  return matchedUsers.map((user) => user.id);
}

function toPublicUser(row, role) {
  if (role === 'student') {
    return {
      id: row.id,
      userCode: row.student_code,
      role: 'student',
      name: row.name,
      email: row.email,
      birthday: row.birthday,
      schoolName: row.school_name,
      grade: row.grade,
      course: row.course,
      level: row.level || 1,
      totalExp: row.total_exp || 0,
      presenceStatus: row.presence_status || 'offline',
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
      emailVerifiedAt: row.email_verified_at,
      emailStatus: row.email_verified_at ? 'verified' : 'awaiting_email',
    };
  }

  return {
    id: row.id,
    userCode: row.teacher_code,
    role: 'teacher',
    name: row.name,
    email: row.email,
    birthday: row.birthday,
    schoolName: row.school_name,
    grade: '-',
    course: '-',
    presenceStatus: row.presence_status || 'offline',
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    approvalStatus: row.approval_status || 'awaiting_email',
    approvalMessage: row.approval_message || '',
    reviewedAt: row.reviewed_at,
    emailVerifiedAt: row.email_verified_at,
  };
}

function validateAdminCreateUser(body) {
  const role = body?.role;
  const email = body?.email?.trim().toLowerCase() || '';
  const password = body?.password || '';
  const name = body?.name?.trim() || '';
  const birthday = body?.birthday || '';
  const schoolName = body?.schoolName?.trim() || '';
  const grade = body?.grade?.trim() || '';
  const course = body?.course?.trim() || '';

  if (!['student', 'teacher'].includes(role)) {
    throw new Error('Role must be student or teacher.');
  }

  if (!name || !email || !password || !birthday || !schoolName) {
    throw new Error('Please complete all required account fields.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const birthDate = new Date(`${birthday}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
    throw new Error('Please enter a valid birthday.');
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) age -= 1;

  const minimumAge = role === 'student' ? 16 : 18;
  if (age < minimumAge) {
    const roleLabel = role === 'student' ? 'Student' : 'Teacher';
    throw new Error(`${roleLabel} must be at least ${minimumAge} years old to register.`);
  }

  if (role === 'student' && (!grade || !course)) {
    throw new Error('Student grade and course are required.');
  }

  return {
    role,
    email,
    password,
    name,
    birthday,
    schoolName,
    grade,
    course,
  };
}

async function requireAdmin(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token.' });
    return;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData.user) {
    res.status(401).json({ error: 'Invalid authorization token.' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (profileError || !profile) {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  req.adminUser = authData.user;
  next();
}

app.post('/api/auth/register', async (req, res) => {
  let profile;
  let authUser = null;

  try {
    profile = validateAdminCreateUser(req.body);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: profile.email,
      password: profile.password,
      email_confirm: false,
      user_metadata: {
        name: profile.name,
        role: profile.role,
      },
    });

    if (authError || !authData.user) {
      throw authError || new Error('Failed to create auth user.');
    }

    authUser = authData.user;

    const table = profile.role === 'student' ? 'students' : 'teachers';
    const payload = {
      id: authUser.id,
      name: profile.name,
      email: profile.email,
      birthday: profile.birthday,
      school_name: profile.schoolName,
    };

    if (profile.role === 'student') {
      payload.grade = profile.grade;
      payload.course = profile.course;
    } else {
      payload.approval_status = 'awaiting_email';
    }

    const { data: publicUser, error: insertError } = await supabaseAdmin
      .from(table)
      .insert(payload)
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      created: true,
      user: toPublicUser(publicUser, profile.role),
    });
  } catch (error) {
    if (authUser?.id) {
      await deleteAuthUser(authUser.id).catch(() => {});
    }

    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/sync-student-email', async (req, res) => {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing auth token.' });
    return;
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      res.status(401).json({ error: 'Invalid auth token.' });
      return;
    }

    const { data: currentStudent, error: currentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (currentError) {
      throw currentError;
    }

    if (!currentStudent) {
      res.status(404).json({ error: 'Student profile not found.' });
      return;
    }

    if (!authData.user.email_confirmed_at) {
      res.json({
        verified: false,
        student: toPublicUser(currentStudent, 'student'),
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('students')
      .update({
        email_verified_at: authData.user.email_confirmed_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      verified: true,
      student: toPublicUser(data, 'student'),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/queue-teacher-approval', async (req, res) => {
  const token = getBearerToken(req);
  const approvalMessage =
    (typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 1000) : '') || null;

  if (!token) {
    res.status(401).json({ error: 'Missing auth token.' });
    return;
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      res.status(401).json({ error: 'Invalid auth token.' });
      return;
    }

    if (!authData.user.email_confirmed_at) {
      res.status(400).json({ error: 'Please confirm your email before requesting admin approval.' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('teachers')
      .update({
        approval_status: 'pending',
        email_verified_at: authData.user.email_confirmed_at,
        approval_message: approvalMessage,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq('id', authData.user.id)
      .in('approval_status', ['awaiting_email', 'rejected'])
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const { data: currentTeacher, error: currentError } = await supabaseAdmin
        .from('teachers')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (currentError) {
        throw currentError;
      }

      if (!currentTeacher) {
        res.status(404).json({ error: 'Teacher profile not found.' });
        return;
      }

      res.json({
        queued: false,
        teacher: toPublicUser(currentTeacher, 'teacher'),
      });
      return;
    }

    res.json({
      queued: true,
      teacher: toPublicUser(data, 'teacher'),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/presence/offline', async (req, res) => {
  const token = req.body?.accessToken || getBearerToken(req);
  const userId = req.body?.userId;

  if (!token || !userId) {
    res.status(400).json({ error: 'Missing presence token or user id.' });
    return;
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user || authData.user.id !== userId) {
      res.status(401).json({ error: 'Invalid presence token.' });
      return;
    }

    await setUserPresence(userId, 'offline');
    res.json({ updated: true, userId, status: 'offline' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  let profile;
  let authUser = null;

  try {
    profile = validateAdminCreateUser(req.body);

    if (profile.email === req.adminUser.email?.toLowerCase()) {
      res.status(400).json({ error: 'Admin cannot create another account with the current admin email.' });
      return;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: profile.email,
      password: profile.password,
      email_confirm: true,
      user_metadata: {
        name: profile.name,
        role: profile.role,
      },
    });

    if (authError || !authData.user) {
      throw authError || new Error('Failed to create auth user.');
    }

    authUser = authData.user;

    const table = profile.role === 'student' ? 'students' : 'teachers';
    const payload = {
      id: authUser.id,
      name: profile.name,
      email: profile.email,
      birthday: profile.birthday,
      school_name: profile.schoolName,
    };

    if (profile.role === 'student') {
      payload.grade = profile.grade;
      payload.course = profile.course;
    } else {
      payload.approval_status = 'approved';
      payload.approval_message = null;
      payload.email_verified_at = new Date().toISOString();
      payload.reviewed_by = req.adminUser.id;
      payload.reviewed_at = new Date().toISOString();
    }

    const { data: publicUser, error: insertError } = await supabaseAdmin
      .from(table)
      .insert(payload)
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      created: true,
      user: toPublicUser(publicUser, profile.role),
    });
  } catch (error) {
    if (authUser?.id) {
      await deleteAuthUser(authUser.id).catch(() => {});
    }

    res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/teacher-requests', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      requests: (data || []).map((teacher) => toPublicUser(teacher, 'teacher')),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/teacher-requests/:id', requireAdmin, async (req, res) => {
  const teacherId = req.params.id;
  const decision = req.body?.decision;
  const approvalMessage = req.body?.message?.trim() || null;

  if (!['approved', 'rejected'].includes(decision)) {
    res.status(400).json({ error: 'Decision must be approved or rejected.' });
    return;
  }

  try {
    const reviewedAt = new Date().toISOString();
    const payload = {
      approval_status: decision,
      approval_message: decision === 'rejected' ? approvalMessage : null,
      reviewed_by: req.adminUser.id,
      reviewed_at: reviewedAt,
      presence_status: decision === 'rejected' ? 'offline' : undefined,
      last_seen_at: decision === 'rejected' ? reviewedAt : undefined,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('teachers')
      .update(payload)
      .eq('id', teacherId)
      .eq('approval_status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      res.status(409).json({ error: 'This teacher request is no longer pending.' });
      return;
    }

    res.json({
      reviewed: true,
      teacher: toPublicUser(data, 'teacher'),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/modules/:id/lock', requireAdmin, async (req, res) => {
  const moduleId = Number(req.params.id);
  const isLocked = Boolean(req.body?.isLocked);

  if (!Number.isInteger(moduleId)) {
    res.status(400).json({ error: 'Invalid module id.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('modules')
      .update({
        is_locked: isLocked,
        locked_at: isLocked ? new Date().toISOString() : null,
        locked_by: isLocked ? req.adminUser.id : null,
      })
      .eq('id', moduleId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      updated: true,
      module: {
        id: data.id,
        moduleCode: data.module_code,
        isLocked: data.is_locked,
        lockedAt: data.locked_at,
        lockedBy: data.locked_by,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/module-review-requests/:id', requireAdmin, async (req, res) => {
  const requestId = Number(req.params.id);
  const decision = req.body?.decision;
  const adminFeedback = req.body?.adminFeedback?.trim() || null;

  if (!Number.isInteger(requestId)) {
    res.status(400).json({ error: 'Invalid review request id.' });
    return;
  }

  if (!['approved', 'rejected'].includes(decision)) {
    res.status(400).json({ error: 'Decision must be approved or rejected.' });
    return;
  }

  try {
    const { data: reviewRequest, error: reviewError } = await supabaseAdmin
      .from('module_review_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (reviewError) {
      throw reviewError;
    }

    const reviewedAt = new Date().toISOString();
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('module_review_requests')
      .update({
        status: decision,
        admin_feedback: adminFeedback,
        reviewed_by: req.adminUser.id,
        reviewed_at: reviewedAt,
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    let updatedModule = null;

    if (decision === 'approved') {
      const { data: moduleData, error: moduleError } = await supabaseAdmin
        .from('modules')
        .update({
          is_locked: false,
          locked_at: null,
          locked_by: null,
        })
        .eq('id', reviewRequest.module_id)
        .select('*')
        .single();

      if (moduleError) {
        throw moduleError;
      }

      updatedModule = {
        id: moduleData.id,
        moduleCode: moduleData.module_code,
        isLocked: moduleData.is_locked,
        lockedAt: moduleData.locked_at,
        lockedBy: moduleData.locked_by,
      };
    }

    res.json({
      reviewed: true,
      reviewRequest: {
        id: updatedRequest.id,
        moduleId: updatedRequest.module_id,
        teacherId: updatedRequest.teacher_id,
        message: updatedRequest.message,
        status: updatedRequest.status,
        adminFeedback: updatedRequest.admin_feedback || '',
        reviewedBy: updatedRequest.reviewed_by,
        submittedAt: updatedRequest.submitted_at,
        reviewedAt: updatedRequest.reviewed_at,
        updatedAt: updatedRequest.updated_at,
      },
      module: updatedModule,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const fallback = {
    email: req.body?.email,
    role: req.body?.role,
  };

  if (userId === req.adminUser.id) {
    res.status(400).json({ error: 'Admin cannot delete the current admin account.' });
    return;
  }

  try {
    const publicUser = await findPublicUser(userId, fallback);
    const deletedAuthIds = await deleteAuthUsersByEmail(publicUser.email, req.adminUser.id);
    await deleteAuthUser(userId);
    await deletePublicRows({ userId, email: publicUser.email });

    res.json({
      deleted: true,
      userId,
      email: publicUser.email,
      deletedAuthIds: [...new Set([userId, ...deletedAuthIds])],
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/users/by-email/cleanup', requireAdmin, async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();

  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  if (email === req.adminUser.email?.toLowerCase()) {
    res.status(400).json({ error: 'Admin cannot delete the current admin account.' });
    return;
  }

  try {
    const deletedAuthIds = await deleteAuthUsersByEmail(email, req.adminUser.id);
    await deletePublicRowsByEmail(email);

    res.json({
      deleted: true,
      email,
      deletedAuthIds,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
