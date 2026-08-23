export class AnalysisStrategy {
  constructor(mode) {
    if (new.target === AnalysisStrategy) {
      throw new TypeError('AnalysisStrategy is abstract and cannot be instantiated directly.');
    }

    this.mode = Object.freeze({ ...mode });
    this.gameType = mode.value;
  }

  getAttempts() {
    throw new Error('Analysis strategies must implement getAttempts(session, module).');
  }

  analyze(module, sessions, studentRows = []) {
    const moduleSessions = sessions.filter(
      (session) => Number(session.moduleId) === Number(module.id)
        && (session.gameType || 'classic_mcq') === this.gameType,
    );
    const memberRows = studentRows.filter((row) => row.accessType === 'member');
    const studentsById = new Map();
    const topicStatsByKey = new Map();
    const attempts = [];

    (module.chapters || []).forEach((chapter) => {
      topicStatsByKey.set(this.getTopicKey(chapter.id), this.makeTopicStats({
        id: chapter.id,
        code: chapter.chapterCode,
        title: chapter.title,
      }));
    });

    memberRows.forEach((student) => {
      if (student.studentId) {
        studentsById.set(student.studentId, this.makeEmptyStudentStats(student));
      }
    });

    moduleSessions.forEach((session) => {
      (session.participants || []).forEach((participant) => {
        if (!participant.studentId && !participant.id) {
          return;
        }

        const studentId = participant.studentId || participant.id;

        if (!studentsById.has(studentId)) {
          studentsById.set(studentId, this.makeEmptyStudentStats({
            studentId,
            name: participant.name,
          }));
        }

        const studentStats = studentsById.get(studentId);
        studentStats.sessionsJoined += 1;
        studentStats.score += participant.score || 0;

        const sessionTopics = session.topics?.length
          ? session.topics
          : [{ id: session.topicId, title: this.getSessionTopicTitle(session) }];

        sessionTopics.forEach((topic) => {
          const topicKey = this.getTopicKey(topic.id);
          studentStats.topicCounts.set(topicKey, (studentStats.topicCounts.get(topicKey) || 0) + 1);

          if (!topicStatsByKey.has(topicKey)) {
            topicStatsByKey.set(topicKey, this.makeTopicStats({
              id: topic.id,
              code: topic.code || session.topicCode || '',
              title: topic.title || this.getSessionTopicTitle(session),
            }));
          }

          const topicStats = topicStatsByKey.get(topicKey);
          topicStats.sessions.add(session.id);
          topicStats.students.add(studentId);
        });
      });

      attempts.push(...this.getAttempts(session, module));
    });

    attempts.forEach((attempt) => {
      if (!attempt.studentId) {
        return;
      }

      if (!studentsById.has(attempt.studentId)) {
        studentsById.set(attempt.studentId, this.makeEmptyStudentStats(attempt));
      }

      const studentStats = studentsById.get(attempt.studentId);
      const topicKey = this.getTopicKey(attempt.topic.id);

      studentStats.answers += 1;
      studentStats.correct += attempt.correct ? 1 : 0;
      studentStats.wrongScans += attempt.wrongScans || 0;
      studentStats.attempts.push(attempt);

      if (Number.isFinite(attempt.seconds)) {
        studentStats.times.push(attempt.seconds);
      }

      if (!topicStatsByKey.has(topicKey)) {
        topicStatsByKey.set(topicKey, this.makeTopicStats({
          id: attempt.topic.id,
          code: attempt.topic.code || '',
          title: attempt.topic.title || 'Unassigned',
        }));
      }

      const topicStats = topicStatsByKey.get(topicKey);
      topicStats.answers += 1;
      topicStats.correct += attempt.correct ? 1 : 0;
      topicStats.scores += attempt.score || 0;
      topicStats.wrongScans += attempt.wrongScans || 0;
      topicStats.students.add(attempt.studentId);

      if (Number.isFinite(attempt.seconds)) {
        topicStats.times.push(attempt.seconds);
      }
    });

    const studentStats = [...studentsById.values()]
      .map((student) => {
        const topTopic = [...student.topicCounts.entries()]
          .sort((left, right) => right[1] - left[1])[0];
        const topTopicStats = topTopic ? topicStatsByKey.get(topTopic[0]) : null;

        return {
          ...student,
          accuracy: student.answers ? Math.round((student.correct / student.answers) * 100) : 0,
          averageTime: this.getAverage(student.times),
          topTopic: topTopicStats?.title || '-',
        };
      })
      .sort((left, right) => right.score - left.score || right.accuracy - left.accuracy);

    const topicStats = [...topicStatsByKey.values()]
      .map((topic) => ({
        ...topic,
        sessionCount: topic.sessions.size,
        studentCount: topic.students.size,
        accuracy: topic.answers ? Math.round((topic.correct / topic.answers) * 100) : 0,
        averageTime: this.getAverage(topic.times),
      }))
      .sort((left, right) => right.sessionCount - left.sessionCount || right.answers - left.answers);

    const totalAnswers = attempts.length;
    const totalCorrect = attempts.filter((attempt) => attempt.correct).length;
    const averageTime = this.getAverage(attempts.map((attempt) => attempt.seconds));
    const activeTopicStats = topicStats.filter((topic) => topic.answers > 0);
    const weakestTopic = [...activeTopicStats].sort((left, right) => left.accuracy - right.accuracy)[0];
    const strongestTopic = [...activeTopicStats].sort((left, right) => right.accuracy - left.accuracy)[0];

    return {
      moduleSessions,
      gameType: this.gameType,
      mode: this.mode,
      studentStats,
      topicStats,
      totalAnswers,
      totalCorrect,
      totalWrongScans: attempts.reduce((total, attempt) => total + (attempt.wrongScans || 0), 0),
      averageTime,
      averageScore: this.getAverage(studentStats.map((student) => student.score)),
      accuracy: totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0,
      strongestTopic,
      weakestTopic,
    };
  }

  getQuestionTopic(module, questionId, session) {
    const question = (module?.questions || []).find((item) => Number(item.id) === Number(questionId));
    const firstSessionTopic = (session?.topics || [])[0];

    return {
      id: question?.chapterId || session?.topicId || firstSessionTopic?.id || null,
      code: question?.chapterCode || session?.topicCode || firstSessionTopic?.code || '',
      title: question?.chapterTitle || this.getSessionTopicTitle(session),
    };
  }

  getTopicKey(topicId) {
    return topicId ? String(topicId) : 'unassigned';
  }

  getSessionTopicTitle(session) {
    return session?.topicTitle && session.topicTitle !== '-' ? session.topicTitle : 'Unassigned';
  }

  getAverage(numbers) {
    const validNumbers = numbers.filter((number) => Number.isFinite(number));

    if (!validNumbers.length) {
      return null;
    }

    return validNumbers.reduce((total, number) => total + number, 0) / validNumbers.length;
  }

  makeEmptyStudentStats(student) {
    return {
      studentId: student.studentId,
      studentCode: student.studentCode || '',
      name: student.name || student.studentName || 'Student',
      email: student.email || '',
      sessionsJoined: 0,
      topicCounts: new Map(),
      answers: 0,
      correct: 0,
      score: 0,
      wrongScans: 0,
      times: [],
      attempts: [],
    };
  }

  makeTopicStats(topic) {
    return {
      ...topic,
      sessions: new Set(),
      students: new Set(),
      answers: 0,
      correct: 0,
      scores: 0,
      wrongScans: 0,
      times: [],
    };
  }
}

export default AnalysisStrategy;
