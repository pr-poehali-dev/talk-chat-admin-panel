import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    """API для управления профилем пользователя и получения данных"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    user_id = get_user_from_token(event)
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    action = event.get('queryStringParameters', {}).get('action', '')
    
    if method == 'GET':
        if action == 'me':
            return get_current_user(user_id)
        elif action == 'search':
            query = event.get('queryStringParameters', {}).get('q', '')
            return search_users(query, user_id)
        elif action == 'list':
            return list_all_users(user_id)
    
    if method == 'PUT' and action == 'profile':
        return update_profile(event, user_id)
    
    if method == 'POST' and action == 'ban':
        return ban_user(event, user_id)
    
    if method == 'POST' and action == 'unban':
        return unban_user(event, user_id)
    
    if method == 'POST' and action == 'set-role':
        return set_user_role(event, user_id)
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'}),
        'isBase64Encoded': False
    }

def get_current_user(user_id: int) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        """SELECT id, username, email, display_name, avatar_url, role, is_banned, ban_reason, created_at
        FROM users WHERE id = %s""",
        (user_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    user = {
        'id': row[0],
        'username': row[1],
        'email': row[2],
        'display_name': row[3],
        'avatar_url': row[4],
        'role': row[5],
        'is_banned': row[6],
        'ban_reason': row[7],
        'created_at': row[8].isoformat() if row[8] else None
    }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(user),
        'isBase64Encoded': False
    }

def update_profile(event: dict, user_id: int) -> dict:
    body = json.loads(event.get('body', '{}'))
    display_name = body.get('display_name', '').strip()
    avatar_url = body.get('avatar_url', '').strip()
    
    if not display_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Имя обязательно'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "UPDATE users SET display_name = %s, avatar_url = %s, updated_at = %s WHERE id = %s",
        (display_name, avatar_url if avatar_url else None, datetime.now(), user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Профиль обновлён'}),
        'isBase64Encoded': False
    }

def search_users(query: str, current_user_id: int) -> dict:
    if not query or len(query) < 2:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'users': []}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    search_pattern = f'%{query}%'
    cur.execute(
        """SELECT id, username, display_name, avatar_url, role, is_banned
        FROM users 
        WHERE (username ILIKE %s OR display_name ILIKE %s) AND id != %s
        LIMIT 20""",
        (search_pattern, search_pattern, current_user_id)
    )
    
    users = []
    for row in cur.fetchall():
        users.append({
            'id': row[0],
            'username': row[1],
            'display_name': row[2],
            'avatar_url': row[3],
            'role': row[4],
            'is_banned': row[5]
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'users': users}),
        'isBase64Encoded': False
    }

def list_all_users(current_user_id: int) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
    row = cur.fetchone()
    
    if not row or row[0] not in ['владелец', 'администратор']:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Доступ запрещён'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        """SELECT id, username, display_name, avatar_url, role, is_banned, ban_reason, email, created_at
        FROM users ORDER BY created_at DESC"""
    )
    
    users = []
    for row in cur.fetchall():
        users.append({
            'id': row[0],
            'username': row[1],
            'display_name': row[2],
            'avatar_url': row[3],
            'role': row[4],
            'is_banned': row[5],
            'ban_reason': row[6],
            'email': row[7],
            'created_at': row[8].isoformat() if row[8] else None
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'users': users}),
        'isBase64Encoded': False
    }

def ban_user(event: dict, current_user_id: int) -> dict:
    body = json.loads(event.get('body', '{}'))
    target_user_id = body.get('user_id')
    reason = body.get('reason', 'Нарушение правил').strip()
    
    if not target_user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id обязателен'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
    row = cur.fetchone()
    
    if not row or row[0] not in ['владелец', 'администратор']:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Доступ запрещён'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "UPDATE users SET is_banned = TRUE, ban_reason = %s, updated_at = %s WHERE id = %s",
        (reason, datetime.now(), target_user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Пользователь заблокирован'}),
        'isBase64Encoded': False
    }

def unban_user(event: dict, current_user_id: int) -> dict:
    body = json.loads(event.get('body', '{}'))
    target_user_id = body.get('user_id')
    
    if not target_user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id обязателен'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
    row = cur.fetchone()
    
    if not row or row[0] not in ['владелец', 'администратор']:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Доступ запрещён'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "UPDATE users SET is_banned = FALSE, ban_reason = NULL, updated_at = %s WHERE id = %s",
        (datetime.now(), target_user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Пользователь разблокирован'}),
        'isBase64Encoded': False
    }

def set_user_role(event: dict, current_user_id: int) -> dict:
    body = json.loads(event.get('body', '{}'))
    target_user_id = body.get('user_id')
    role = body.get('role', '').strip()
    
    if not target_user_id or not role:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id и role обязательны'}),
            'isBase64Encoded': False
        }
    
    if role not in ['владелец', 'администратор', 'VIP', 'пользователь']:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Недопустимая роль'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
    row = cur.fetchone()
    
    if not row or row[0] != 'владелец':
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Только владелец может менять роли'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "UPDATE users SET role = %s, updated_at = %s WHERE id = %s",
        (role, datetime.now(), target_user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Роль обновлена'}),
        'isBase64Encoded': False
    }

def get_user_from_token(event: dict) -> int:
    auth_header = event.get('headers', {}).get('X-Authorization', '')
    
    if not auth_header:
        return None
    
    token = auth_header.replace('Bearer ', '')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "SELECT user_id, expires_at FROM sessions WHERE token = %s",
        (token,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return None
    
    if datetime.now() > row[1]:
        return None
    
    return row[0]

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    
    conn = psycopg2.connect(dsn, options=f'-c search_path={schema}')
    return conn