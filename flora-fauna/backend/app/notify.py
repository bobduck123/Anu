import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from .models import db, Event, Action, User, Ticket, Todo


def send_email(to_email, subject, message):
    msg = MIMEText(message)
    msg['Subject'] = subject
    msg['From'] = 'your_email@example.com'
    msg['To'] = to_email

    with smtplib.SMTP('smtp.example.com') as server:
        server.login('your_email@example.com', 'your_password')
        server.sendmail(msg['From'], [msg['To']], msg.as_string())


def send_notifications():
    now = datetime.now()

    # Notify ticket holders about upcoming events
    events = Event.query.all()
    for event in events:
        event_datetime = datetime.combine(event.date, event.time)
        if now <= event_datetime - timedelta(weeks=1) < now + timedelta(minutes=1):
            notify_ticket_holders(event, 'Event Reminder: 1 week left', event.reminder_week)
        if now <= event_datetime - timedelta(days=1) < now + timedelta(minutes=1):
            notify_ticket_holders(event, 'Event Reminder: 1 day left', event.reminder_day)
        if now <= event_datetime - timedelta(hours=3) < now + timedelta(minutes=1):
            notify_ticket_holders(event, 'Event Reminder: 3 hours left', event.reminder_hours)

    # Notify users about upcoming actions on their todo list
    actions = Action.query.all()
    for action in actions:
        action_datetime = datetime.combine(action.end_date, action.time)
        if now <= action_datetime - timedelta(weeks=1) < now + timedelta(minutes=1):
            notify_action_users(action, 'Action Reminder: 1 week left')
        if now <= action_datetime - timedelta(days=1) < now + timedelta(minutes=1):
            notify_action_users(action, 'Action Reminder: 1 day left')
        if now <= action_datetime - timedelta(hours=3) < now + timedelta(minutes=1):
            notify_action_users(action, 'Action Reminder: 3 hours left')


def notify_ticket_holders(event, subject, custom_message):
    tickets = Ticket.query.filter_by(event_id=event.id).all()
    for ticket in tickets:
        user = User.query.get(ticket.user_id)
        message = f'Dear {user.username},\n\nThis is a reminder for the event "{event.title}" happening on {event.date} at {event.time}.\n\n'
        if custom_message:
            message += f'{custom_message}\n\n'
        message += 'Best Regards,\nYour Event Team'
        send_email(user.email, subject, message)


def notify_action_users(action, subject):
    todos = Todo.query.filter_by(action_id=action.id, is_completed=False).all()
    for todo in todos:
        user = User.query.get(todo.user_id)
        message = f'Dear {user.username},\n\nThis is a reminder for the action "{action.title}" on your to-do list, scheduled to be completed by {action.end_date} at {action.time}.\n\nBest Regards,\nYour Action Team'
        send_email(user.email, subject, message)


if __name__ == "__main__":
    send_notifications()

# remember to automate the notifications by running the script in background using a cron job or a task scheduler.
