import os
import uuid
from flask import Flask, request, jsonify, session
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
app.secret_key = "super_complex_secret_encryption_key_string"
bcrypt = Bcrypt(app)
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

# --- TASK 14: IMAGE FILE UPLOAD ARCHITECTURE CONFIGURATIONS ---
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB limit restriction enforcement

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Restrict file payloads at the Flask configuration layer
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXTENSIONS

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345", 
        database="ecommerce"
    )

# --- NEW ROUTE: FILE UPLOAD ACTION HANDLER ---
@app.route('/api/upload', methods=['POST'])
def upload_image():
    if session.get('role') != 'admin':
        return jsonify({"error": "Forbidden. Admin access privileges required."}), 403

    if 'image' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Only png, jpg, jpeg, and webp are allowed."}), 400

    # Generate a unique filename using UUIDv4 to eliminate overwrites
    ext = file.filename.rsplit('.', 1)[-1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
    
    file.save(filepath)

    # Return web path reference matching static asset structure requirements
    image_url = f"/static/uploads/{unique_name}"
    return jsonify({"image_url": image_url}), 201


# --- AUTH ROUTING MODULE ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({"message": "All registration fields are required."}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT id FROM users WHERE email = %s", (data['email'],))
    if cursor.fetchone():
        return jsonify({"message": "Email is already registered."}), 400
        
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    role = data.get('role', 'customer') if data.get('role') in ['customer', 'admin'] else 'customer'
    
    cursor.execute("INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
                   (data['name'], data['email'], hashed_password, role))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Account created successfully!"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM users WHERE email = %s", (data.get('email'),))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user and bcrypt.check_password_hash(user['password'], data.get('password')):
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['role'] = user['role']
        return jsonify({"id": user['id'], "name": user['name'], "email": user['email'], "role": user['role']}), 200
    
    return jsonify({"message": "Invalid password or email match configuration."}), 401

@app.route('/api/logout', methods=['GET'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out safely."}), 200

@app.route('/api/me', methods=['GET'])
def get_current_user():
    if 'user_id' not in session:
        return jsonify({"message": "Unauthorized navigation payload session state."}), 401
    return jsonify({"id": session['user_id'], "name": session['user_name'], "role": session['role']}), 200


# --- PRODUCTS ROUTING MODULE ---

@app.route('/api/products', methods=['GET'])
def get_all_products():
    category = request.args.get('category', '')
    search = request.args.get('search', '')
    sort = request.args.get('sort', 'newest')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE 1=1
    """
    params = []
    
    if category:
        query += " AND c.name = %s"
        params.append(category)
    if search:
        query += " AND (p.name LIKE %s OR p.description LIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    if sort == 'price_asc':
        query += " ORDER BY p.price ASC"
    elif sort == 'price_desc':
        query += " ORDER BY p.price DESC"
    else:
        query += " ORDER BY p.created_at DESC"
        
    cursor.execute(query, params)
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(products), 200

@app.route('/api/products/<int:id>', methods=['GET'])
def get_product_by_id(id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = %s", (id,))
    product = cursor.fetchone()
    cursor.close()
    conn.close()
    if not product:
        return jsonify({"message": "Product item entry matching target ID does not exist."}), 404
    return jsonify(product), 200

@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM categories")
    cats = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(cats), 200


# --- ADMIN ONLY: PRODUCTS MODIFICATION CORE ---

@app.route('/api/products', methods=['POST'])
def create_product():
    if session.get('role') != 'admin':
        return jsonify({"message": "Forbidden. Admin access level permissions required."}), 403
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO products (name, description, price, stock, category_id, image_url) VALUES (%s, %s, %s, %s, %s, %s)",
        (data['name'], data['description'], data['price'], data['stock'], data['category_id'], data['image_url'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Product created inside catalog database inventory entry."}), 201

@app.route('/api/products/<int:id>', methods=['PUT'])
def update_product(id):
    if session.get('role') != 'admin':
        return jsonify({"message": "Forbidden. Admin access level permissions required."}), 403
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE products SET name=%s, description=%s, price=%s, stock=%s, category_id=%s, image_url=%s WHERE id=%s",
        (data['name'], data['description'], data['price'], data['stock'], data['category_id'], data['image_url'], id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Catalog item metadata updated successfully."}), 200

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    if session.get('role') != 'admin':
        return jsonify({"message": "Forbidden. Admin access level permissions required."}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = %s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Product purged from active catalog ledger."}), 200


# --- CUSTOMER ORDER FLOW ROUTING ---

@app.route('/api/orders', methods=['POST'])
def place_order():
    if 'user_id' not in session:
        return jsonify({"message": "Authentication state required."}), 401
    data = request.json
    items = data.get('items', [])
    address = data.get('address', '')
    
    if not items or not address:
        return jsonify({"message": "Missing required cart parameters or shipping address data."}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        total_amount = 0
        validated_items = []
        for entry in items:
            cursor.execute("SELECT * FROM products WHERE id = %s", (entry['product_id'],))
            prod = cursor.fetchone()
            if not prod:
                return jsonify({"message": f"Product key {entry['product_id']} not found."}), 400
            if prod['stock'] < entry['qty']:
                return jsonify({"message": f"Operation aborted. '{prod['name']}' is out of stock or requested quantities exceed available inventory storage limits."}), 400
            
            total_amount += float(prod['price']) * int(entry['qty'])
            validated_items.append({"prod": prod, "qty": entry['qty']})
            
        cursor.execute("INSERT INTO orders (user_id, total_amount, address, status) VALUES (%s, %s, %s, 'Pending')",
                       (session['user_id'], total_amount, address))
        order_id = cursor.lastrowid
        
        for entry in validated_items:
            new_stock = entry['prod']['stock'] - entry['qty']
            cursor.execute("UPDATE products SET stock = %s WHERE id = %s", (new_stock, entry['prod']['id']))
            cursor.execute("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s)",
                           (order_id, entry['prod']['id'], entry['qty'], entry['prod']['price']))
            
        conn.commit()
        return jsonify({"message": "Order tracking transaction complete.", "order_id": order_id}), 201
        
    except Exception as err:
        conn.rollback()
        return jsonify({"message": f"Database processing exception occurred: {str(err)}"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/orders/my', methods=['GET'])
def get_user_orders():
    if 'user_id' not in session:
        return jsonify({"message": "Authentication context required."}), 401
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY ordered_at DESC", (session['user_id'],))
    orders = cursor.fetchall()
    
    for ord in orders:
        cursor.execute("""
            SELECT oi.*, p.name as product_name, p.image_url 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = %s
        """, (ord['id'],))
        ord['items'] = cursor.fetchall()
        
    cursor.close()
    conn.close()
    return jsonify(orders), 200


# --- ADMIN ONLY: BULK SYSTEM ORDERS MANAGEMENT ---

@app.route('/api/orders', methods=['GET'])
def get_all_system_orders():
    if session.get('role') != 'admin':
        return jsonify({"message": "Forbidden. Admin access level permissions required."}), 403
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT o.*, u.name as customer_name 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        ORDER BY o.ordered_at DESC
    """)
    orders = cursor.fetchall()
    
    for ord in orders:
        cursor.execute("""
            SELECT oi.*, p.name as product_name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = %s
        """, (ord['id'],))
        ord['items'] = cursor.fetchall()
        
    cursor.close()
    conn.close()
    return jsonify(orders), 200

@app.route('/api/orders/<int:id>/status', methods=['PUT'])
def update_order_status(id):
    if session.get('role') != 'admin':
        return jsonify({"message": "Forbidden. Admin access level permissions required."}), 403
    data = request.json
    new_status = data.get('status')
    if new_status not in ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']:
        return jsonify({"message": "Invalid tracking classification type status syntax string option."}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Order processing state flag updated globally."}), 200

if __name__ == '__main__':
    app.run(port=5000, debug=True)