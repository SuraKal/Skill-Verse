from django.core.mail import send_mail


def send_organization_invitation_email(*, invited_email, organization_name, role, accept_url, reject_url):
    subject = f'You have been invited to join {organization_name}'
    message = (
        f'You have been invited to join {organization_name} as a {role}.\n\n'
        f'Accept invitation: {accept_url}\n'
        f'Reject invitation: {reject_url}\n'
    )
    send_mail(subject, message, None, [invited_email], fail_silently=False)


def send_course_instructor_invitation_email(
    *,
    invited_email,
    organization_name,
    course_title,
    invited_by_name,
    custom_message,
    accept_url,
    reject_url,
):
    subject = f'You have been invited to teach {course_title}'
    message = (
        f'You have been invited to join {course_title} as an instructor for {organization_name}.\n'
        f'Invitation sent by: {invited_by_name}\n\n'
    )
    if custom_message:
        message += f'Custom message:\n{custom_message}\n\n'
    message += f'Accept invitation: {accept_url}\nReject invitation: {reject_url}\n'
    send_mail(subject, message, None, [invited_email], fail_silently=False)


def send_course_enrollment_invitation_email(
    *,
    invited_email,
    organization_name,
    course_title,
    invited_by_name,
    custom_message,
    accept_url,
    reject_url,
):
    subject = f'You have been invited to enroll in {course_title}'
    message = (
        f'You have been invited to join {course_title} as a student for {organization_name}.\n'
        f'Invitation sent by: {invited_by_name}\n\n'
    )
    if custom_message:
        message += f'Custom message:\n{custom_message}\n\n'
    message += f'Accept invitation: {accept_url}\nReject invitation: {reject_url}\n'
    send_mail(subject, message, None, [invited_email], fail_silently=False)
