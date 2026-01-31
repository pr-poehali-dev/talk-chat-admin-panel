import json
import os
import base64
import uuid
import boto3
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    """API для загрузки аватарок пользователей в S3"""
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
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
    
    body = json.loads(event.get('body', '{}'))
    image_data = body.get('image')
    
    if not image_data:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'image обязателен (base64)'}),
            'isBase64Encoded': False
        }
    
    if ',' in image_data:
        image_data = image_data.split(',')[1]
    
    try:
        image_bytes = base64.b64decode(image_data)
    except Exception:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неверный формат base64'}),
            'isBase64Encoded': False
        }
    
    if len(image_bytes) > 5 * 1024 * 1024:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Размер файла превышает 5 МБ'}),
            'isBase64Encoded': False
        }
    
    content_type = 'image/jpeg'
    if image_bytes[:4] == b'\x89PNG':
        content_type = 'image/png'
    elif image_bytes[:3] == b'GIF':
        content_type = 'image/gif'
    
    file_extension = content_type.split('/')[1]
    filename = f'avatars/{user_id}/{uuid.uuid4()}.{file_extension}'
    
    try:
        s3 = boto3.client('s3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        
        s3.put_object(
            Bucket='files',
            Key=filename,
            Body=image_bytes,
            ContentType=content_type
        )
        
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET avatar_url = %s, updated_at = %s WHERE id = %s",
            (cdn_url, datetime.now(), user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'url': cdn_url}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Upload failed: {str(e)}'}),
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