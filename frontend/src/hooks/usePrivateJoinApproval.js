import { useEffect, useRef } from 'react';
import { checkSessionJoinAccess } from '../services/sessionService.js';

export function usePrivateJoinApproval({
  clearJoinSessionState,
  completeJoinSession,
  currentUser,
  joinAccessPrompt,
  joinCode,
  setFeedback,
  setJoinAccessPrompt,
  setPage,
}) {
  const actionsRef = useRef({ clearJoinSessionState, completeJoinSession });
  actionsRef.current = { clearJoinSessionState, completeJoinSession };

  useEffect(() => {
    if (
      currentUser?.role !== 'student' ||
      joinAccessPrompt?.type !== 'private' ||
      !joinAccessPrompt.waiting ||
      !joinCode.trim()
    ) {
      return undefined;
    }

    let active = true;
    let rejectionTimer;

    async function checkApproval() {
      try {
        const accessCheck = await checkSessionJoinAccess({
          code: joinCode,
          student: currentUser,
        });

        if (!active) {
          return;
        }

        if (accessCheck.access === 'joined') {
          await actionsRef.current.completeJoinSession();
          return;
        }

        if (accessCheck.request?.status === 'rejected') {
          setJoinAccessPrompt((currentPrompt) => ({
            ...currentPrompt,
            request: accessCheck.request,
            rejected: true,
            rejectedMessage:
              accessCheck.request.teacher_response ||
              'Your request was rejected by the teacher.',
            waiting: false,
          }));
          setFeedback('');
          rejectionTimer = window.setTimeout(() => {
            if (!active) {
              return;
            }

            setJoinAccessPrompt(null);
            actionsRef.current.clearJoinSessionState();
            setPage('student-dashboard');
          }, 1600);
        }
      } catch (error) {
        if (active) {
          setFeedback(error.message);
        }
      }
    }

    const approvalTimer = window.setInterval(checkApproval, 1000);
    checkApproval();

    return () => {
      active = false;
      window.clearTimeout(rejectionTimer);
      window.clearInterval(approvalTimer);
    };
  }, [
    currentUser,
    joinAccessPrompt?.type,
    joinAccessPrompt?.waiting,
    joinCode,
    setFeedback,
    setJoinAccessPrompt,
    setPage,
  ]);
}
