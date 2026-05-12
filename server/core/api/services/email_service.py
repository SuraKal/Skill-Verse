from django.core.mail import send_mail


def send_organization_invitation_email(*, invited_email, organization_name, role, accept_url, reject_url):
    subject = f'You have been invited to join {organization_name}'
    message = (
        f'You have been invited to join {organization_name} as a {role}.\n\n'
        f'Accept invitation: {accept_url}\n'
        f'Reject invitation: {reject_url}\n'
    )
    send_mail(subject, message, None, [invited_email], fail_silently=False)
