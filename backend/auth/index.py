import json
import os
import re
import random
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
import psycopg2
import bcrypt

def handler(event: dict, context) -> dict:
    """API для регистрации и авторизации пользователей с email-верификацией"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    path = event.get('queryStringParameters', {}).get('action', '')
    
    if method == 'POST':
        if path == 'send-code':
            return send_verification_code(event)
        elif path == 'register':
            return register_user(event)
        elif path == 'login':
            return login_user(event)
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'}),
        'isBase64Encoded': False
    }

def send_verification_code(event: dict) -> dict:
    body = json.loads(event.get('body', '{}'))
    email = body.get('email', '').strip().lower()
    
    if not email or not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Некорректный email'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email уже зарегистрирован'}),
            'isBase64Encoded': False
        }
    
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.now() + timedelta(minutes=10)
    
    cur.execute(
        "INSERT INTO verification_codes (email, code, expires_at) VALUES (%s, %s, %s)",
        (email, code, expires_at)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    send_email(email, code)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Код отправлен на email', 'code': code}),
        'isBase64Encoded': False
    }

def register_user(event: dict) -> dict:
    body = json.loads(event.get('body', '{}'))
    email = body.get('email', '').strip().lower()
    code = body.get('code', '').strip()
    username = body.get('username', '').strip().lower()
    display_name = body.get('display_name', '').strip()
    password = body.get('password', '').strip()
    
    if not all([email, code, username, display_name, password]):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Все поля обязательны'}),
            'isBase64Encoded': False
        }
    
    if not re.match(r'^[a-z0-9_]{3,50}$', username):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Username: только буквы, цифры и _ (3-50 символов)'}),
            'isBase64Encoded': False
        }
    
    if len(password) < 6:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Пароль должен быть минимум 6 символов'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "SELECT code, expires_at, used FROM verification_codes WHERE email = %s ORDER BY created_at DESC LIMIT 1",
        (email,)
    )
    row = cur.fetchone()
    
    if not row or row[2]:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Код не найден или уже использован'}),
            'isBase64Encoded': False
        }
    
    if row[0] != code:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неверный код'}),
            'isBase64Encoded': False
        }
    
    if datetime.now() > row[1]:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Код истёк'}),
            'isBase64Encoded': False
        }
    
    cur.execute("SELECT id FROM users WHERE username = %s", (username,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Username уже занят'}),
            'isBase64Encoded': False
        }
    
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    cur.execute(
        "INSERT INTO users (username, email, password_hash, display_name) VALUES (%s, %s, %s, %s) RETURNING id",
        (username, email, password_hash, display_name)
    )
    user_id = cur.fetchone()[0]
    
    cur.execute(
        "UPDATE verification_codes SET used = TRUE WHERE email = %s AND code = %s",
        (email, code)
    )
    
    token = generate_token()
    expires_at = datetime.now() + timedelta(days=30)
    
    cur.execute(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
        (user_id, token, expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'token': token, 'user_id': user_id}),
        'isBase64Encoded': False
    }

def login_user(event: dict) -> dict:
    body = json.loads(event.get('body', '{}'))
    username = body.get('username', '').strip().lower()
    password = body.get('password', '').strip()
    
    if not username or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Username и пароль обязательны'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "SELECT id, password_hash, is_banned FROM users WHERE username = %s",
        (username,)
    )
    row = cur.fetchone()
    
    if not row:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неверный username или пароль'}),
            'isBase64Encoded': False
        }
    
    user_id, password_hash, is_banned = row
    
    if is_banned:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Аккаунт заблокирован'}),
            'isBase64Encoded': False
        }
    
    if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неверный username или пароль'}),
            'isBase64Encoded': False
        }
    
    token = generate_token()
    expires_at = datetime.now() + timedelta(days=30)
    
    cur.execute(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
        (user_id, token, expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'token': token, 'user_id': user_id}),
        'isBase64Encoded': False
    }

def send_email(email: str, code: str):
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_user = os.environ.get('SMTP_USER', '')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        
        if not smtp_user or not smtp_password:
            print(f"DEBUG: Code for {email}: {code}")
            return
        
        msg = MIMEText(f'Ваш код подтверждения для Talk Chat: {code}\n\nКод действителен 10 минут.')
        msg['Subject'] = 'Talk Chat - Код подтверждения'
        msg['From'] = smtp_user
        msg['To'] = email
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
    except Exception as e:
        print(f"Email send error: {e}")
        print(f"DEBUG: Code for {email}: {code}")

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    
    conn = psycopg2.connect(dsn, options=f'-c search_path={schema}')
    return conn

def generate_token() -> str:
    import secrets
    return secrets.token_urlsafe(32)