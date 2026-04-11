"""
Centralized email service for JobPortal.
All emails are sent non-blocking (errors are logged, never crash the request).
"""
import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

FROM = getattr(settings, 'DEFAULT_FROM_EMAIL', 'JobPortal <noreply@jobportal.et>')


def _send(to: str, subject: str, html: str) -> bool:
    """Send a single email. Returns True on success, False on failure."""
    if not to or not to.strip():
        return False
    try:
        send_mail(
            subject=subject,
            message='',          # plain text fallback (empty)
            from_email=FROM,
            recipient_list=[to],
            html_message=html,
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error(f'[Email] Failed to send "{subject}" to {to}: {e}')
        return False


# ── Registration & Verification ───────────────────────────────────────────────

def send_email_verification_otp(email: str, username: str, otp: str) -> bool:
    return _send(email, 'Verify Your Email — JobPortal', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px">
      <h2 style="color:#7c3aed;margin-bottom:8px">Email Verification</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Use the OTP below to verify your email address. It expires in <strong>15 minutes</strong>.</p>
      <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;margin:20px 0;border:2px solid #ede9fe">
        <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#7c3aed">{otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">If you didn't create a JobPortal account, you can safely ignore this email.</p>
    </div>
    """)


def send_welcome_email(email: str, username: str, role: str) -> bool:
    role_label = 'Employer' if role == 'employer' else 'Job Seeker'
    return _send(email, 'Welcome to JobPortal! 🎉', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px">
      <h2 style="color:#7c3aed">Welcome to JobPortal, {username}!</h2>
      <p style="color:#374151">Your account has been created as a <strong>{role_label}</strong>.</p>
      {'<p style="color:#374151">Your documents are under review. You will be notified once your account is approved.</p>' if role == 'employer' else '<p style="color:#374151">You can now browse jobs, build your CV, and apply to positions.</p>'}
      <p style="color:#6b7280;font-size:13px;margin-top:20px">JobPortal — Connecting Ethiopian talent with opportunity.</p>
    </div>
    """)


# ── Employer Account ──────────────────────────────────────────────────────────

def send_employer_approved(email: str, username: str) -> bool:
    return _send(email, '✅ Your Employer Account is Approved — JobPortal', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f0fdf4;border-radius:16px">
      <h2 style="color:#16a34a">Account Approved!</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your employer account has been <strong>approved</strong> by our admin team. You can now post jobs on JobPortal.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:20px">Log in to your account to get started.</p>
    </div>
    """)


def send_employer_rejected(email: str, username: str, note: str = '') -> bool:
    return _send(email, '❌ Employer Account Review — JobPortal', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff8f8;border-radius:16px">
      <h2 style="color:#ef4444">Account Not Approved</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Unfortunately, your employer account application was <strong>not approved</strong> at this time.</p>
      {f'<div style="background:#fee2e2;border-radius:8px;padding:12px;margin:12px 0"><strong>Reason:</strong> {note}</div>' if note else ''}
      <p style="color:#374151">Please contact support if you believe this is an error.</p>
    </div>
    """)


# ── Job Lifecycle ─────────────────────────────────────────────────────────────

def send_job_submitted(email: str, username: str, job_title: str) -> bool:
    return _send(email, f'Job Submitted for Review — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px">
      <h2 style="color:#7c3aed">Job Submitted!</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your job posting <strong>"{job_title}"</strong> has been submitted for admin review.</p>
      <p style="color:#374151">You will be notified once it is reviewed and the posting fee is set.</p>
    </div>
    """)


def send_job_approved(email: str, username: str, job_title: str, fee: str) -> bool:
    return _send(email, f'✅ Job Approved — Pay Fee to Publish', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f0fdf4;border-radius:16px">
      <h2 style="color:#16a34a">Job Approved!</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your job <strong>"{job_title}"</strong> has been approved.</p>
      <div style="background:#dcfce7;border-radius:10px;padding:16px;margin:16px 0;text-align:center">
        <p style="margin:0;color:#15803d;font-weight:700;font-size:18px">Posting Fee: ETB {fee}</p>
      </div>
      <p style="color:#374151">Please log in and pay the posting fee to publish your job and make it visible to job seekers.</p>
    </div>
    """)


def send_job_rejected(email: str, username: str, job_title: str, note: str = '') -> bool:
    return _send(email, f'Job Review Result — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff8f8;border-radius:16px">
      <h2 style="color:#ef4444">Job Not Approved</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your job posting <strong>"{job_title}"</strong> was not approved.</p>
      {f'<div style="background:#fee2e2;border-radius:8px;padding:12px;margin:12px 0"><strong>Reason:</strong> {note}</div>' if note else ''}
    </div>
    """)


def send_job_published(email: str, username: str, job_title: str) -> bool:
    return _send(email, f'🎉 Your Job is Now Live — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f0fdf4;border-radius:16px">
      <h2 style="color:#16a34a">Job Published!</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your job <strong>"{job_title}"</strong> is now <strong>live</strong> and visible to job seekers on JobPortal.</p>
      <p style="color:#374151">You will receive notifications when applicants apply.</p>
    </div>
    """)


# ── Deadline Extension ────────────────────────────────────────────────────────

def send_extend_fee_set(email: str, username: str, job_title: str, fee: str, new_deadline: str) -> bool:
    return _send(email, f'Deadline Extension Fee Set — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f0f9ff;border-radius:16px">
      <h2 style="color:#0369a1">Extension Fee Set</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Admin has set the extension fee for <strong>"{job_title}"</strong>.</p>
      <div style="background:#e0f2fe;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#0369a1"><strong>New Deadline:</strong> {new_deadline}</p>
        <p style="margin:4px 0;color:#0369a1"><strong>Extension Fee:</strong> ETB {fee}</p>
      </div>
      <p style="color:#374151">Please log in and pay the extension fee to extend your job deadline.</p>
    </div>
    """)


def send_extend_approved(email: str, username: str, job_title: str, new_deadline: str) -> bool:
    return _send(email, f'✅ Deadline Extended — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f0fdf4;border-radius:16px">
      <h2 style="color:#16a34a">Deadline Extended!</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">The deadline for <strong>"{job_title}"</strong> has been extended to <strong>{new_deadline}</strong>.</p>
      <p style="color:#374151">Your job is now active again and visible to job seekers.</p>
    </div>
    """)


def send_extend_rejected(email: str, username: str, job_title: str) -> bool:
    return _send(email, f'Extension Request Rejected — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff8f8;border-radius:16px">
      <h2 style="color:#ef4444">Extension Rejected</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your deadline extension request for <strong>"{job_title}"</strong> was rejected by admin.</p>
    </div>
    """)


# ── Applications ──────────────────────────────────────────────────────────────

def send_application_received(email: str, username: str, job_title: str, employer_name: str) -> bool:
    return _send(email, f'Application Received — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px">
      <h2 style="color:#7c3aed">Application Submitted!</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your application for <strong>"{job_title}"</strong> posted by <strong>{employer_name}</strong> has been received.</p>
      <p style="color:#374151">You will be notified when the employer reviews your application.</p>
    </div>
    """)


def send_application_accepted(email: str, username: str, job_title: str, employer_note: str = '') -> bool:
    return _send(email, f'🎉 Application Accepted — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f0fdf4;border-radius:16px">
      <h2 style="color:#16a34a">Congratulations! Application Accepted</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Your application for <strong>"{job_title}"</strong> has been <strong>accepted</strong>!</p>
      {f'<div style="background:#dcfce7;border-radius:8px;padding:12px;margin:12px 0"><strong>Message from employer:</strong> {employer_note}</div>' if employer_note else ''}
      <p style="color:#374151">The employer will contact you with next steps. Good luck!</p>
    </div>
    """)


def send_application_rejected(email: str, username: str, job_title: str, employer_note: str = '') -> bool:
    return _send(email, f'Application Update — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff8f8;border-radius:16px">
      <h2 style="color:#ef4444">Application Not Selected</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">Thank you for applying to <strong>"{job_title}"</strong>. Unfortunately, you were not selected for this position.</p>
      {f'<div style="background:#fee2e2;border-radius:8px;padding:12px;margin:12px 0"><strong>Employer note:</strong> {employer_note}</div>' if employer_note else ''}
      <p style="color:#374151">Keep applying — the right opportunity is out there!</p>
    </div>
    """)


def send_application_reviewed(email: str, username: str, job_title: str) -> bool:
    return _send(email, f'Application Reviewed — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px">
      <h2 style="color:#7c3aed">Application Reviewed</h2>
      <p style="color:#374151">Hello <strong>{username}</strong>,</p>
      <p style="color:#374151">The employer has reviewed your application for <strong>"{job_title}"</strong>. A decision will be communicated soon.</p>
    </div>
    """)


def send_employer_new_applicant(email: str, employer_name: str, job_title: str, applicant_name: str) -> bool:
    return _send(email, f'New Applicant — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px">
      <h2 style="color:#7c3aed">New Application Received</h2>
      <p style="color:#374151">Hello <strong>{employer_name}</strong>,</p>
      <p style="color:#374151"><strong>{applicant_name}</strong> has applied to your job posting <strong>"{job_title}"</strong>.</p>
      <p style="color:#374151">Log in to review their CV and application.</p>
    </div>
    """)


def send_employer_message_to_applicant(email: str, applicant_name: str, employer_name: str, job_title: str, message: str) -> bool:
    return _send(email, f'Message from {employer_name} — {job_title}', f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px">
      <h2 style="color:#7c3aed">Message from Employer</h2>
      <p style="color:#374151">Hello <strong>{applicant_name}</strong>,</p>
      <p style="color:#374151">You have a message from <strong>{employer_name}</strong> regarding your application for <strong>"{job_title}"</strong>:</p>
      <div style="background:#ede9fe;border-radius:10px;padding:16px;margin:16px 0;border-left:4px solid #7c3aed">
        <p style="color:#374151;margin:0;line-height:1.6">{message}</p>
      </div>
      <p style="color:#374151">Log in to JobPortal to reply.</p>
    </div>
    """)
