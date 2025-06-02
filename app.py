from flask import Flask, request, jsonify, make_response, redirect, url_for
from flask_cors import CORS
import sqlite3
import re
import csv
import io

# NEW IMPORTS FOR AUTHENTICATION
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
# NEW: Secret key for session management (IMPORTANT: Change this to a strong, random key in production)
app.config['SECRET_KEY'] = 'your_super_secret_and_complex_key_here_12345'
CORS(app, supports_credentials=True) # NEW: supports_credentials=True is crucial for sending cookies (sessions)

# --- Flask-Login Setup ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'unauthorized' # Redirects to this route if login is required

# User model for Flask-Login
class User(UserMixin):
    def __init__(self, id, username, role):
        self.id = id
        self.username = username
        self.role = role # 'admin' or 'user'

    def get_id(self):
        return str(self.id)

# User loader callback for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, role FROM users WHERE id = ?", (user_id,))
    user_data = cursor.fetchone()
    if user_data:
        return User(user_data['id'], user_data['username'], user_data['role'])
    return None

# --- Database Setup ---
DATABASE = 'talents.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()

        # Create talents table (existing)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS talents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                primarySkill TEXT NOT NULL,
                specificSkills TEXT,
                yearsExperience INTEGER NOT NULL
            )
        ''')
        db.commit()
        print("Talents table initialized (or already exists).")

        # NEW: Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user' -- 'admin' or 'user'
            )
        ''')
        db.commit()
        print("Users table initialized (or already exists).")


        # Add initial talent data if table is empty (existing)
        cursor.execute("SELECT COUNT(*) FROM talents")
        if cursor.fetchone()[0] == 0:
            print("Adding initial talent data...")
            initial_talents = [
                ('Oluwatobiloba Akinola', 'tobi.akinola@example.com', 'Web Development', 'HTML, CSS, JavaScript, React', 3),
                ('Blessing Adeyemi', 'blessing.a@example.com', 'Data Science', 'Python, R, Machine Learning, SQL', 5),
                ('Chinedu Okoro', 'chinedu.o@example.com', 'Mobile Development', 'Java, Android SDK, Kotlin', 4),
                ('Fatima Bello', 'fatima.b@example.com', 'UI/UX Design', 'Figma, Sketch, Adobe XD, User Research', 2),
                ('Kunle Ojo', 'kunle.ojo@example.com', 'Cybersecurity', 'Network Security, Ethical Hacking, SIEM', 6),
                ('Amara Nnadi', 'amara.n@example.com', 'Cloud Engineering', 'AWS, Azure, Docker, Kubernetes', 4),
                ('Tunde Balogun', 'tunde.b@example.com', 'DevOps', 'CI/CD, Jenkins, Ansible, Git', 5),
                ('Grace Effiong', 'grace.e@example.com', 'Machine Learning', 'TensorFlow, PyTorch, NLP', 3),
                ('Segun Alabi', 'segun.a@example.com', 'Database Administration', 'SQL Server, MySQL, PostgreSQL', 7),
                ('Ngozi Eze', 'ngozi.e@example.com', 'Frontend Development', 'Vue.js, Svelte, Webpack', 2),
                ('David Efe', 'david.e@example.com', 'Backend Development', 'Node.js, Express, MongoDB', 4),
                ('Sarah Okoro', 'sarah.o@example.com', 'Product Management', 'Agile, Scrum, Market Research', 5)
            ]
            cursor.executemany('''
                INSERT INTO talents (name, email, primarySkill, specificSkills, yearsExperience)
                VALUES (?, ?, ?, ?, ?)
            ''', initial_talents)
            db.commit()
            print("Initial talent data added.")
        
        # NEW: Add a default admin user if no users exist
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            print("Adding default admin user...")
            admin_password = generate_password_hash("adminpass") # Use a strong password in production!
            cursor.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                           ("admin", admin_password, "admin"))
            db.commit()
            print("Default admin user 'admin' created with password 'adminpass'.")

            print("Adding default regular user...")
            user_password = generate_password_hash("userpass") # Use a strong password in production!
            cursor.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                           ("user", user_password, "user"))
            db.commit()
            print("Default user 'user' created with password 'userpass'.")


# --- API Endpoints (Routes) ---

# NEW: Unauthorized endpoint handler
@app.route('/api/unauthorized', methods=['GET'])
def unauthorized():
    return jsonify({"error": "Unauthorized: Login required."}), 401

# NEW: Login Endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username = ?", (username,))
    user_data = cursor.fetchone()

    if user_data and check_password_hash(user_data['password_hash'], password):
        user = User(user_data['id'], user_data['username'], user_data['role'])
        login_user(user)
        return jsonify({"message": "Login successful", "username": user.username, "role": user.role}), 200
    return jsonify({"error": "Invalid username or password"}), 401

# NEW: Logout Endpoint
@app.route('/api/logout', methods=['POST'])
@login_required # User must be logged in to log out
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200

# NEW: Get Current User Status
@app.route('/api/status', methods=['GET'])
def get_status():
    if current_user.is_authenticated:
        return jsonify({
            "is_authenticated": True,
            "username": current_user.username,
            "role": current_user.role
        }), 200
    return jsonify({"is_authenticated": False}), 200


# GET all talents, and also handle filtering, searching, pagination, and sorting
@app.route('/api/talents', methods=['GET'])
# @login_required # Optional: If you want to require login to even view talents
def get_all_talents():
    db = get_db()
    cursor = db.cursor()

    primary_skill = request.args.get('primarySkill')
    min_exp = request.args.get('minExperience', type=int)
    max_exp = request.args.get('maxExperience', type=int)
    search_query = request.args.get('search')

    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    sort_by = request.args.get('sort_by', 'id')
    sort_direction = request.args.get('sort_direction', 'asc')

    allowed_sort_columns = ['id', 'name', 'email', 'primarySkill', 'yearsExperience']
    if sort_by not in allowed_sort_columns:
        sort_by = 'id'

    if sort_direction.lower() not in ['asc', 'desc']:
        sort_direction = 'asc'

    base_query = "SELECT * FROM talents WHERE 1=1"
    count_query = "SELECT COUNT(*) FROM talents WHERE 1=1"
    params = []

    if primary_skill and primary_skill != 'All Skills':
        base_query += " AND primarySkill = ?"
        count_query += " AND primarySkill = ?"
        params.append(primary_skill)

    if min_exp is not None:
        base_query += " AND yearsExperience >= ?"
        count_query += " AND yearsExperience >= ?"
        params.append(min_exp)

    if max_exp is not None:
        base_query += " AND yearsExperience <= ?"
        count_query += " AND yearsExperience <= ?"
        params.append(max_exp)

    if search_query:
        search_term = f"%{search_query.lower()}%"
        base_query += " AND (LOWER(name) LIKE ? OR LOWER(primarySkill) LIKE ? OR LOWER(specificSkills) LIKE ?)"
        count_query += " AND (LOWER(name) LIKE ? OR LOWER(primarySkill) LIKE ? OR LOWER(specificSkills) LIKE ?)"
        params.extend([search_term, search_term, search_term])


    cursor.execute(count_query, params)
    total_talents = cursor.fetchone()[0]


    base_query += f" ORDER BY {sort_by} {sort_direction.upper()}"

    if limit > 0:
        offset = (page - 1) * limit
        base_query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])


    cursor.execute(base_query, params)
    talents_data = cursor.fetchall()

    talents_list = [dict(talent) for talent in talents_data]

    return jsonify({
        "talents": talents_list,
        "total_talents": total_talents,
        "page": page,
        "limit": limit,
        "total_pages": (total_talents + limit - 1) // limit if limit > 0 else 1
    })

# Endpoint to export talents to CSV
@app.route('/api/talents/export', methods=['GET'])
@login_required # Require login to export
def export_talents_csv():
    # NEW: Authorization check - only admins can export
    if current_user.role != 'admin':
        return jsonify({"error": "Forbidden: Only administrators can export data."}), 403

    db = get_db()
    cursor = db.cursor()

    primary_skill = request.args.get('primarySkill')
    min_exp = request.args.get('minExperience', type=int)
    max_exp = request.args.get('maxExperience', type=int)
    search_query = request.args.get('search')

    query = "SELECT id, name, email, primarySkill, specificSkills, yearsExperience FROM talents WHERE 1=1"
    params = []

    if primary_skill and primary_skill != 'All Skills':
        query += " AND primarySkill = ?"
        params.append(primary_skill)

    if min_exp is not None:
        query += " AND yearsExperience >= ?"
        params.append(min_exp)

    if max_exp is not None:
        query += " AND yearsExperience <= ?"
        params.append(max_exp)

    if search_query:
        search_term = f"%{search_query.lower()}%"
        query += " AND (LOWER(name) LIKE ? OR LOWER(primarySkill) LIKE ? OR LOWER(specificSkills) LIKE ?)"
        params.extend([search_term, search_term, search_term])

    query += " ORDER BY name ASC"

    cursor.execute(query, params)
    talents = cursor.fetchall()

    si = io.StringIO()
    cw = csv.writer(si)

    headers = ['ID', 'Name', 'Email', 'Primary Skill', 'Specific Skills', 'Years Experience']
    cw.writerow(headers)

    for talent in talents:
        row_data = [talent[col] for col in talent.keys()]
        cw.writerow(row_data)

    output = si.getvalue()

    response = make_response(output)
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = 'attachment; filename=talents_export.csv'
    return response

# POST a new talent
@app.route('/api/talents', methods=['POST'])
@login_required # Require login to add talent
def add_talent():
    # NEW: Authorization check - only admins can add
    if current_user.role != 'admin':
        return jsonify({"error": "Forbidden: Only administrators can add new talents."}), 403

    new_talent_data = request.json

    errors = {}

    name = new_talent_data.get('name')
    email = new_talent_data.get('email')
    primarySkill = new_talent_data.get('primarySkill')
    specificSkills = new_talent_data.get('specificSkills', '')
    yearsExperience = new_talent_data.get('yearsExperience')

    if not name or not str(name).strip():
        errors['name'] = 'Name is required.'
    
    if not email or not str(email).strip():
        errors['email'] = 'Email is required.'
    elif not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", str(email)):
        errors['email'] = 'Invalid email format.'
    
    if not primarySkill or not str(primarySkill).strip():
        errors['primarySkill'] = 'Primary Skill is required.'
    
    if yearsExperience is None:
        errors['yearsExperience'] = 'Years Experience is required.'
    elif not isinstance(yearsExperience, int):
        errors['yearsExperience'] = 'Years Experience must be an integer.'
    elif yearsExperience < 0:
        errors['yearsExperience'] = 'Years Experience cannot be negative.'

    if errors:
        return jsonify({"errors": errors}), 400

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('''
            INSERT INTO talents (name, email, primarySkill, specificSkills, yearsExperience)
            VALUES (?, ?, ?, ?, ?)
        ''', (name.strip(), email.strip(), primarySkill.strip(), specificSkills.strip(), yearsExperience))
        db.commit()
        new_talent_id = cursor.lastrowid
        newly_added_talent = {
            "id": new_talent_id,
            "name": name.strip(),
            "email": email.strip(),
            "primarySkill": primarySkill.strip(),
            "specificSkills": specificSkills.strip(),
            "yearsExperience": yearsExperience
        }
        return jsonify(newly_added_talent), 201
    except sqlite3.IntegrityError:
        return jsonify({"errors": {"email": "Talent with this email already exists"}}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# PUT (Update) an existing talent by ID
@app.route('/api/talents/<int:talent_id>', methods=['PUT'])
@login_required # Require login to update talent
def update_talent(talent_id):
    # NEW: Authorization check - only admins can update
    if current_user.role != 'admin':
        return jsonify({"error": "Forbidden: Only administrators can update talents."}), 403

    updated_data = request.json

    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT * FROM talents WHERE id = ?", (talent_id,))
    existing_talent = cursor.fetchone()
    if not existing_talent:
        return jsonify({"error": "Talent not found"}), 404

    errors = {}

    name = updated_data.get('name', existing_talent['name'])
    email = updated_data.get('email', existing_talent['email'])
    primarySkill = updated_data.get('primarySkill', existing_talent['primarySkill'])
    specificSkills = updated_data.get('specificSkills', existing_talent['specificSkills'])
    yearsExperience = updated_data.get('yearsExperience', existing_talent['yearsExperience'])

    if name is not None and not str(name).strip():
        errors['name'] = 'Name cannot be empty.'
    
    if email is not None:
        if not str(email).strip():
            errors['email'] = 'Email cannot be empty.'
        elif not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", str(email)):
            errors['email'] = 'Invalid email format.'
    
    if primarySkill is not None and not str(primarySkill).strip():
        errors['primarySkill'] = 'Primary Skill cannot be empty.'
    
    if yearsExperience is not None:
        if not isinstance(yearsExperience, int):
            errors['yearsExperience'] = 'Years Experience must be an integer.'
        elif yearsExperience < 0:
            errors['yearsExperience'] = 'Years Experience cannot be negative.'

    if errors:
        return jsonify({"errors": errors}), 400

    try:
        cursor.execute('''
            UPDATE talents
            SET name = ?, email = ?, primarySkill = ?, specificSkills = ?, yearsExperience = ?
            WHERE id = ?
        ''', (str(name).strip(), str(email).strip(), str(primarySkill).strip(), str(specificSkills).strip(), yearsExperience, talent_id))
        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "No changes made or talent not found"}), 404
        else:
            cursor.execute("SELECT * FROM talents WHERE id = ?", (talent_id,))
            updated_talent_row = cursor.fetchone()
            return jsonify(dict(updated_talent_row)), 200
    except sqlite3.IntegrityError:
        return jsonify({"errors": {"email": "Email already exists for another talent"}}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET a single talent by ID (used for details and edit)
@app.route('/api/talents/<int:talent_id>', methods=['GET'])
# @login_required # Optional: If you want to require login to even view single talent details
def get_talent_by_id(talent_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM talents WHERE id = ?", (talent_id,))
    talent = cursor.fetchone()
    if talent:
        return jsonify(dict(talent)), 200
    return jsonify({"error": "Talent not found"}), 404

# DELETE a talent by ID
@app.route('/api/talents/<int:talent_id>', methods=['DELETE'])
@login_required # Require login to delete talent
def delete_talent(talent_id):
    # NEW: Authorization check - only admins can delete
    if current_user.role != 'admin':
        return jsonify({"error": "Forbidden: Only administrators can delete talents."}), 403

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM talents WHERE id = ?", (talent_id,))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Talent not found"}), 404
        return jsonify({"message": "Talent deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Run the App ---
if __name__ == '__main__':
    # Ensure the database is initialized
    init_db()
    app.run(debug=True)