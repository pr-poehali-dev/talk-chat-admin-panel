import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    """API для управления чатами, сообщениями и контактами"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        if action == 'list':
            return list_chats(user_id)
        elif action == 'messages':
            chat_id = event.get('queryStringParameters', {}).get('chat_id')
            return get_messages(user_id, chat_id)
        elif action == 'contacts':
            return list_contacts(user_id)
    
    if method == 'POST':
        if action == 'create':
            return create_chat(event, user_id)
        elif action == 'send':
            return send_message(event, user_id)
        elif action == 'add-contact':
            return add_contact(event, user_id)
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'}),
        'isBase64Encoded': False
    }

def list_chats(user_id: int) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        """SELECT DISTINCT c.id, c.created_at, c.updated_at,
        (SELECT u.id FROM users u 
         INNER JOIN chat_participants cp2 ON cp2.user_id = u.id 
         WHERE cp2.chat_id = c.id AND u.id != %s LIMIT 1) as other_user_id,
        (SELECT u.username FROM users u 
         INNER JOIN chat_participants cp2 ON cp2.user_id = u.id 
         WHERE cp2.chat_id = c.id AND u.id != %s LIMIT 1) as other_username,
        (SELECT u.display_name FROM users u 
         INNER JOIN chat_participants cp2 ON cp2.user_id = u.id 
         WHERE cp2.chat_id = c.id AND u.id != %s LIMIT 1) as other_display_name,
        (SELECT u.avatar_url FROM users u 
         INNER JOIN chat_participants cp2 ON cp2.user_id = u.id 
         WHERE cp2.chat_id = c.id AND u.id != %s LIMIT 1) as other_avatar,
        (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time
        FROM chats c
        INNER JOIN chat_participants cp ON cp.chat_id = c.id
        WHERE cp.user_id = %s
        ORDER BY c.updated_at DESC""",
        (user_id, user_id, user_id, user_id, user_id)
    )
    
    chats = []
    for row in cur.fetchall():
        chat_data = {
            'id': row[0],
            'created_at': row[1].isoformat() if row[1] else None,
            'updated_at': row[2].isoformat() if row[2] else None,
            'other_user': {
                'id': row[3],
                'username': row[4],
                'display_name': row[5],
                'avatar_url': row[6]
            } if row[3] else None,
            'last_message': row[7],
            'last_message_time': row[8].isoformat() if row[8] else None
        }
        chats.append(chat_data)
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'chats': chats}),
        'isBase64Encoded': False
    }

def create_chat(event: dict, user_id: int) -> dict:
    body = json.loads(event.get('body', '{}'))
    other_user_id = body.get('user_id')
    
    if not other_user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id обязателен'}),
            'isBase64Encoded': False
        }
    
    if other_user_id == user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Нельзя создать чат с самим собой'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM users WHERE id = %s", (other_user_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Пользователь не найден'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        """SELECT c.id FROM chats c
        INNER JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = %s
        INNER JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = %s
        LIMIT 1""",
        (user_id, other_user_id)
    )
    existing = cur.fetchone()
    
    if existing:
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'chat_id': existing[0], 'existed': True}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "INSERT INTO chats (created_by) VALUES (%s) RETURNING id",
        (user_id,)
    )
    chat_id = cur.fetchone()[0]
    
    cur.execute(
        "INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
        (chat_id, user_id, chat_id, other_user_id)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'chat_id': chat_id, 'existed': False}),
        'isBase64Encoded': False
    }

def send_message(event: dict, user_id: int) -> dict:
    body = json.loads(event.get('body', '{}'))
    chat_id = body.get('chat_id')
    content = body.get('content', '').strip()
    
    if not chat_id or not content:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'chat_id и content обязательны'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT is_banned FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if row and row[0]:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Вы заблокированы'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "SELECT id FROM chat_participants WHERE chat_id = %s AND user_id = %s",
        (chat_id, user_id)
    )
    if not cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Доступ к чату запрещён'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "INSERT INTO messages (chat_id, sender_id, content) VALUES (%s, %s, %s) RETURNING id, created_at",
        (chat_id, user_id, content)
    )
    message_id, created_at = cur.fetchone()
    
    cur.execute(
        "UPDATE chats SET updated_at = %s WHERE id = %s",
        (datetime.now(), chat_id)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'message_id': message_id,
            'created_at': created_at.isoformat()
        }),
        'isBase64Encoded': False
    }

def get_messages(user_id: int, chat_id: str) -> dict:
    if not chat_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'chat_id обязателен'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "SELECT id FROM chat_participants WHERE chat_id = %s AND user_id = %s",
        (chat_id, user_id)
    )
    if not cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Доступ к чату запрещён'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        """SELECT m.id, m.content, m.sender_id, m.created_at,
        u.username, u.display_name, u.avatar_url
        FROM messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id = %s
        ORDER BY m.created_at ASC""",
        (chat_id,)
    )
    
    messages = []
    for row in cur.fetchall():
        messages.append({
            'id': row[0],
            'content': row[1],
            'sender_id': row[2],
            'created_at': row[3].isoformat() if row[3] else None,
            'sender': {
                'username': row[4],
                'display_name': row[5],
                'avatar_url': row[6]
            }
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'messages': messages}),
        'isBase64Encoded': False
    }

def list_contacts(user_id: int) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        """SELECT u.id, u.username, u.display_name, u.avatar_url, c.added_at
        FROM contacts c
        INNER JOIN users u ON u.id = c.contact_user_id
        WHERE c.user_id = %s
        ORDER BY c.added_at DESC""",
        (user_id,)
    )
    
    contacts = []
    for row in cur.fetchall():
        contacts.append({
            'id': row[0],
            'username': row[1],
            'display_name': row[2],
            'avatar_url': row[3],
            'added_at': row[4].isoformat() if row[4] else None
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'contacts': contacts}),
        'isBase64Encoded': False
    }

def add_contact(event: dict, user_id: int) -> dict:
    body = json.loads(event.get('body', '{}'))
    contact_user_id = body.get('user_id')
    
    if not contact_user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id обязателен'}),
            'isBase64Encoded': False
        }
    
    if contact_user_id == user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Нельзя добавить себя в контакты'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM users WHERE id = %s", (contact_user_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Пользователь не найден'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "SELECT id FROM contacts WHERE user_id = %s AND contact_user_id = %s",
        (user_id, contact_user_id)
    )
    if cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Контакт уже добавлен'}),
            'isBase64Encoded': False
        }
    
    cur.execute(
        "INSERT INTO contacts (user_id, contact_user_id) VALUES (%s, %s)",
        (user_id, contact_user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Контакт добавлен'}),
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