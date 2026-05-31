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


def send_event_approval_request_email(
    *,
    invited_email,
    manager_name,
    organization_name,
    event_name,
    event_datetime,
    location,
    review_url,
    approve_url,
    reject_url,
):
    subject = f'{manager_name} submitted an event for your approval - {event_name}'
    message = (
        f'Organization: {organization_name}\n'
        f'Event: {event_name}\n'
        f'Date and time: {event_datetime}\n'
        f'Location: {location}\n\n'
        f'Review the event: {review_url}\n'
        f'Approve: {approve_url}\n'
        f'Reject: {reject_url}\n'
    )
    send_mail(subject, message, None, [invited_email], fail_silently=False)


def send_event_approval_result_email(
    *,
    invited_email,
    organization_name,
    event_name,
    event_datetime,
    location,
    approved,
    rejection_note='',
):
    if approved:
        subject = f'Your event {event_name} has been approved and is now active'
        message = (
            f'Organization: {organization_name}\n'
            f'Event: {event_name}\n'
            f'Date and time: {event_datetime}\n'
            f'Location: {location}\n\n'
            f'Your event {event_name} has been approved and is now active.\n'
        )
    else:
        subject = f'Your event {event_name} was not approved'
        message = (
            f'Organization: {organization_name}\n'
            f'Event: {event_name}\n'
            f'Date and time: {event_datetime}\n'
            f'Location: {location}\n\n'
            f'Your event {event_name} was not approved.\n'
        )
        if rejection_note:
            message += f'\nRejection note:\n{rejection_note}\n'

    send_mail(subject, message, None, [invited_email], fail_silently=False)


def send_event_participant_invitation_email(
    *,
    invited_email,
    organization_name,
    event_name,
    event_datetime,
    location,
    event_role,
    accept_url,
    decline_url,
    registration_url,
    needs_registration=True,
):
    subject = f"You've been invited as a {event_role.upper()} to {event_name}"
    role_label = event_role.replace('_', ' ').upper()
    message = (
        f'Organization: {organization_name}\n'
        f'Event: {event_name}\n'
        f'Date and time: {event_datetime}\n'
        f'Location: {location}\n'
        f'Assigned role: {role_label}\n\n'
    )
    if needs_registration:
        message += "You'll need to create a free account to accept this invitation.\n\n"
    message += (
        f'Accept invitation: {accept_url}\n'
        f'Decline invitation: {decline_url}\n'
        f'Registration link: {registration_url}\n'
    )
    send_mail(subject, message, None, [invited_email], fail_silently=False)


def send_event_co_organizer_invitation_email(
    *,
    invited_email,
    organization_name,
    event_name,
    event_datetime,
    location,
    accept_url,
    decline_url,
    registration_url,
    needs_registration=True,
):
    subject = f'{organization_name} has invited your organization to co-organize {event_name}'
    message = (
        f'Host organization: {organization_name}\n'
        f'Event: {event_name}\n'
        f'Date and time: {event_datetime}\n'
        f'Location: {location}\n\n'
        'Co-organizing gives your organization the ability to invite attendees, speakers, volunteers, and guests for this event.\n\n'
    )
    if needs_registration:
        message += "You'll need to create a free account to accept this invitation.\n\n"
    message += (
        f'Accept invitation: {accept_url}\n'
        f'Decline invitation: {decline_url}\n'
        f'Registration link: {registration_url}\n'
    )
    send_mail(subject, message, None, [invited_email], fail_silently=False)


def send_event_reminder_email(
    *,
    invited_email,
    organization_name,
    event_name,
    event_datetime,
    location,
):
    subject = f'Reminder: {event_name} is tomorrow'
    message = (
        f'Organization: {organization_name}\n'
        f'Event: {event_name}\n'
        f'Date and time: {event_datetime}\n'
        f'Location: {location}\n\n'
        f'This is a reminder that {event_name} is tomorrow.\n'
    )
    send_mail(subject, message, None, [invited_email], fail_silently=False)
