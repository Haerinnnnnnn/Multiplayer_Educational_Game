import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Feedback } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';

function getSessionCodeFromQr(value) {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return '';
  }

  try {
    const url = new URL(cleanValue);
    return url.searchParams.get('join')?.trim().toUpperCase() || '';
  } catch {
    return cleanValue.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
  }
}

function QrScannerModal({ joinForm, onAutoJoinSession, onClose, onJoinFormChange }) {
  const scannerRef = useRef(null);
  const joinFormRef = useRef(joinForm);
  const joiningRef = useRef(false);
  const onAutoJoinSessionRef = useRef(onAutoJoinSession);
  const onCloseRef = useRef(onClose);
  const onJoinFormChangeRef = useRef(onJoinFormChange);
  const [scanError, setScanError] = useState('');
  const [scanInfo, setScanInfo] = useState('Starting camera...');

  useEffect(() => {
    joinFormRef.current = joinForm;
    onAutoJoinSessionRef.current = onAutoJoinSession;
    onCloseRef.current = onClose;
    onJoinFormChangeRef.current = onJoinFormChange;
  }, [joinForm, onAutoJoinSession, onClose, onJoinFormChange]);

  useEffect(() => {
    let active = true;

    async function fillSessionCode(value) {
      const detectedCode = getSessionCodeFromQr(value);

      if (!detectedCode || joiningRef.current) {
        return false;
      }

      joiningRef.current = true;
      setScanInfo(`Session ${detectedCode} detected. Joining room...`);

      onJoinFormChangeRef.current({
        ...joinFormRef.current,
        code: detectedCode,
      });

      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop().catch(() => {});
      }

      onCloseRef.current();
      await onAutoJoinSessionRef.current?.(detectedCode);
      return true;
    }

    async function startScanner() {
      setScanError('');
      setScanInfo(`Secure browser context: ${window.isSecureContext ? 'Yes' : 'No'}`);

      if (!window.isSecureContext) {
        setScanError('Camera requires localhost or trusted HTTPS. Please use http://localhost:5173 on this laptop.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScanError(
          'Camera is not available for this browser address. Use localhost on laptop, trusted HTTPS, or enter the code manually.',
        );
        return;
      }

      try {
        const scanner = new Html5Qrcode('student-qr-scanner');
        scannerRef.current = scanner;
        const cameras = await Html5Qrcode.getCameras();

        if (!active) {
          return;
        }

        if (!cameras.length) {
          setScanError('No camera device found. Please check Windows camera privacy settings.');
          return;
        }

        const preferredCamera =
          cameras.find((camera) => /back|rear|environment/i.test(camera.label || '')) || cameras[0];

        setScanInfo(`Using camera: ${preferredCamera.label || 'Default camera'}`);

        await scanner.start(
          preferredCamera.id,
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
          },
          (decodedText) => {
            if (!active) {
              return;
            }

            fillSessionCode(decodedText);
          },
          () => {},
        );
      } catch (error) {
        setScanError(error.message || 'Camera permission was denied or the camera is already in use.');
      }
    }

    startScanner();

    return () => {
      active = false;

      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function scanQrImage(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setScanError('');
    setScanInfo('Scanning uploaded QR image...');

    try {
      const scanner = scannerRef.current || new Html5Qrcode('student-qr-scanner');
      scannerRef.current = scanner;

      if (scanner.isScanning) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      const success = await fillSessionCode(decodedText);

      if (!success) {
        setScanError('QR image was read, but no session code was found.');
      }
    } catch (error) {
      setScanError(error.message || 'Unable to read this QR image.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="qr-scanner-title"
        aria-modal="true"
        className="qr-scanner-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-message-header">
          <div>
            <p className="eyebrow">Scan Session QR</p>
            <h2 id="qr-scanner-title">Join Session</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="qr-scanner-frame">
          <div id="student-qr-scanner" />
          <span className="qr-scan-corner top-left" />
          <span className="qr-scan-corner top-right" />
          <span className="qr-scan-corner bottom-left" />
          <span className="qr-scan-corner bottom-right" />
        </div>

        <p className="muted">Place the teacher QR code inside the box.</p>
        <p className="muted qr-scanner-info">{scanInfo}</p>
        <label className="qr-upload-label">
          Upload QR Image
          <input accept="image/*" type="file" onChange={scanQrImage} />
        </label>
        {scanError && <Feedback text={scanError} />}
      </section>
    </div>
  );
}

function ModuleAccessPrompt({
  prompt,
  onCancel,
  onConfirmPublic,
  onRequestPrivate,
}) {
  if (!prompt) {
    return null;
  }

  const isPublic = prompt.type === 'public';
  const module = prompt.module;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <section
        aria-labelledby="module-access-title"
        aria-modal="true"
        className="review-message-modal module-access-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-message-header">
          <div>
            <p className="eyebrow">{isPublic ? 'Public Module' : 'Private Module'}</p>
            <h2 id="module-access-title">
              {isPublic ? 'Join Module First' : 'Request Access First'}
            </h2>
          </div>
          <button className="secondary-button" type="button" onClick={onCancel}>
            Leave
          </button>
        </div>

        <div className="module-access-summary">
          <p className="eyebrow">{module?.moduleCode || 'Module'}</p>
          <h3>{module?.title || '-'}</h3>
          <p>{module?.description || 'No description yet.'}</p>
        </div>

        {isPublic ? (
          <>
            <p className="muted">
              You have not joined this module yet. You must join the module before entering this session.
            </p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onConfirmPublic}>
                Join Module And Enter Session
              </button>
              <button className="secondary-button" type="button" onClick={onCancel}>
                Do Not Join
              </button>
            </div>
          </>
        ) : prompt.rejected ? (
          <>
            <div className="module-access-rejected">
              <strong>Request rejected</strong>
              <p>{prompt.rejectedMessage || 'Your request was rejected by the teacher.'}</p>
              <p className="muted">Returning you to your dashboard...</p>
            </div>
          </>
        ) : prompt.waiting ? (
          <>
            <div className="qr-pair-waiting-box">
              <div className="logout-spinner" aria-hidden="true" />
              <strong>Waiting for teacher approval...</strong>
              <p className="muted">
                When the teacher approves your request, the system will bring you into the session automatically.
              </p>
            </div>
            <button className="secondary-button" type="button" onClick={onCancel}>
              Leave Waiting
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              This module is private. Send a request to the teacher first. You can wait here, or leave after sending.
            </p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onRequestPrivate}>
                Request Access And Wait
              </button>
              <button className="secondary-button" type="button" onClick={onCancel}>
                Leave
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function StudentJoinPage({
  feedback,
  joinAccessPrompt,
  joinForm,
  onBack,
  onCancelJoinAccessPrompt,
  onConfirmJoinPublicModule,
  onJoinFormChange,
  onJoinSession,
  onRequestPrivateModuleAccess,
}) {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <AppFrame title="Student Join Session" onHome={onBack}>
      <form className="panel form-grid" onSubmit={onJoinSession}>
        <label>
          Student Name
          <input
            value={joinForm.name}
            onChange={(event) => onJoinFormChange({ ...joinForm, name: event.target.value })}
            placeholder="Enter your name"
          />
        </label>
        <label>
          Session Code
          <input
            value={joinForm.code}
            onChange={(event) =>
              onJoinFormChange({ ...joinForm, code: event.target.value.toUpperCase() })
            }
            placeholder="Example: A1B2C3"
          />
        </label>
        <div className="button-row join-session-actions">
          <button className="primary-button" type="submit">
            Join Session
          </button>
          <button className="secondary-button" type="button" onClick={() => setScannerOpen(true)}>
            Scan QR
          </button>
        </div>
      </form>
      <Feedback text={feedback} />

      {scannerOpen && (
        <QrScannerModal
          joinForm={joinForm}
          onClose={() => setScannerOpen(false)}
          onAutoJoinSession={(code) => onJoinSession(null, { code })}
          onJoinFormChange={onJoinFormChange}
        />
      )}
      <ModuleAccessPrompt
        prompt={joinAccessPrompt}
        onCancel={onCancelJoinAccessPrompt}
        onConfirmPublic={onConfirmJoinPublicModule}
        onRequestPrivate={onRequestPrivateModuleAccess}
      />
    </AppFrame>
  );
}
