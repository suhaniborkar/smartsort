import os, time, hashlib, math
import json
from flask import Flask, request, jsonify, render_template, redirect, url_for, make_response
from flask_cors import CORS
import gemini_helper

app = Flask(__name__)
# Add a secret key for minimal security (though we're using cookies manually here)
app.secret_key = "smartsort_super_secret"

CORS(app)

# ── SIMPLE FILE-BASED DATABASE ─────────────────────────────
# No SQL needed — just JSON files. Perfect for hackathon.
DB_FILE   = "users.json"
SCAN_FILE = "scans.json"

def load(file):
    if not os.path.exists(file):
        return {}
    with open(file, "r") as f:
        return json.load(f)

def save(file, data):
    with open(file, "w") as f:
        json.dump(data, f, indent=2)

def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

# ── HELPER: get global stats ───────────────────────────────
def get_global_stats():
    users = load(DB_FILE)
    scans = load(SCAN_FILE)
    total_scans = sum(len(v) for v in scans.values())
    # count scans that are dry/wet (properly recycled)
    recycled = 0
    for user_scans in scans.values():
        for s in user_scans:
            if s.get("category") in ["dry", "wet"]:
                recycled += 1
    return {
        "items_sorted": total_scans,
        "recycled_properly": recycled,
        "eco_users": len(users)
    }

def calculate_level(exp):
    return math.floor(exp / 50) + 1  # Level up every 50 XP (roughly every 2-3 scans)

def check_badge_unlocks(user, scan_history):
    new_badges = []
    badges = user.get("badges", [])
    
    # Badge: Novice Sorter (1st scan)
    if len(scan_history) >= 1 and "Novice Sorter" not in badges:
        new_badges.append("Novice Sorter")
        
    # Badge: Recycling Pro (5 scans)
    if len(scan_history) >= 5 and "Recycling Pro" not in badges:
        new_badges.append("Recycling Pro")
        
    # Badge: Eco Hero (10 scans)
    if len(scan_history) >= 10 and "Eco Hero" not in badges:
        new_badges.append("Eco Hero")
        
    return new_badges

# ══════════════════════════════════════════════════════════
# HTML ROUTES (Rendering Jinja templates)
# ══════════════════════════════════════════════════════════

@app.route("/")
def index():
    user_email = request.cookies.get('user_email')
    if user_email:
        return redirect(url_for('dashboard'))
    stats = get_global_stats()
    return render_template("index.html", stats=stats)

@app.route("/dashboard")
def dashboard():
    user_email = request.cookies.get('user_email')
    if not user_email:
        return redirect(url_for('index'))
    
    users = load(DB_FILE)
    if user_email not in users:
        return redirect(url_for('index'))
    user = users[user_email]

    # Ensure defaults for gamification
    user.setdefault("exp", 0)
    user.setdefault("level", calculate_level(user["exp"]))
    user.setdefault("badges", [])
    user.setdefault("points", 0)

    # Calculate Level Progress
    points_to_next = 50
    current_progress = user["exp"] % points_to_next
    progress_percent = (current_progress / points_to_next) * 100

    scans = load(SCAN_FILE)
    history = scans.get(user_email, [])
    
    # Leaderboard logic
    ranked = sorted(
        [{"name": v["name"], "points": v.get("points", 0), "level": v.get("level", 1), "state": v.get("state", "")}
         for v in users.values()],
        key=lambda x: x["points"],
        reverse=True
    )
    
    return render_template("dashboard.html", 
                           user=user, 
                           history=history[:15], 
                           points=user["points"],
                           level=user["level"],
                           exp=user["exp"],
                           progress_percent=progress_percent,
                           badges=user["badges"],
                           total_scans=len(history),
                           leaderboard=ranked[:5])

@app.route("/scan")
def scan():
    user_email = request.cookies.get('user_email')
    if not user_email:
        return redirect(url_for('index'))
    return render_template("scan.html")

@app.route("/rules")
def rules():
    return render_template("rules.html")


# ══════════════════════════════════════════════════════════
# API ROUTES (AJAX calls from the frontend)
# ══════════════════════════════════════════════════════════

@app.route("/api/signup", methods=["POST"])
def signup():
    data  = request.json
    name  = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    state    = data.get("state", "")
    district = data.get("district", "")
    password = data.get("password", "")

    if not all([name, email, password]):
        return jsonify({"success": False, "message": "All fields required"}), 400

    users = load(DB_FILE)

    if email in users:
        return jsonify({"success": False, "message": "Email already registered"}), 409

    users[email] = {
        "name":     name,
        "email":    email,
        "state":    state,
        "district": district,
        "password": hash_password(password),
        "points":   0,
        "exp":      0,
        "level":    1,
        "badges":   [],
        "joined":   int(time.time())
    }
    save(DB_FILE, users)

    # init scan history for this user
    scans = load(SCAN_FILE)
    scans[email] = []
    save(SCAN_FILE, scans)

    user_public = {k: v for k, v in users[email].items() if k != "password"}
    return jsonify({"success": True, "user": user_public})


@app.route("/api/signin", methods=["POST"])
def signin():
    data     = request.json
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    users = load(DB_FILE)

    if email not in users:
        return jsonify({"success": False, "message": "User not found"}), 404

    if users[email]["password"] != hash_password(password):
        return jsonify({"success": False, "message": "Wrong password"}), 401

    user_public = {k: v for k, v in users[email].items() if k != "password"}
# ══════════════════════════════════════════════════════════
# SCAN API ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/api/save-scan", methods=["POST"])
def save_scan():
    """Called after Gemini classifies an item — saves result + awards points."""
    data     = request.json
    email    = data.get("email", "").strip().lower()
    item     = data.get("item", "Unknown")
    category = data.get("category", "dry")
    reason   = data.get("reason", "")
    instructions = data.get("instructions", "")

    users = load(DB_FILE)
    scans = load(SCAN_FILE)

    if email not in users:
        return jsonify({"success": False, "message": "User not found"}), 404

    # award points and EXP
    old_level = calculate_level(users[email].get("exp", 0))
    
    earned_points = 10
    earned_exp = 20
    
    users[email]["points"] = users[email].get("points", 0) + earned_points
    users[email]["exp"] = users[email].get("exp", 0) + earned_exp
    
    new_level = calculate_level(users[email]["exp"])
    users[email]["level"] = new_level
    
    # check for badges
    new_badges = check_badge_unlocks(users[email], scans[email])
    if new_badges:
        users[email].setdefault("badges", []).extend(new_badges)
        
    save(DB_FILE, users)

    # save scan record
    scan_record = {
        "item":         item,
        "category":     category,
        "reason":       reason,
        "instructions": instructions,
        "points":       earned_points,
        "exp":          earned_exp,
        "timestamp":    int(time.time()),
        "time_label":   time.strftime("%I:%M %p")
    }
    if email not in scans:
        scans[email] = []
    scans[email].insert(0, scan_record)   # newest first
    scans[email] = scans[email][:50]      # keep last 50
    save(SCAN_FILE, scans)

    return jsonify({
        "success":    True,
        "points":     users[email]["points"],
        "exp":        users[email]["exp"],
        "level":      new_level,
        "level_up":   new_level > old_level,
        "new_badges": new_badges,
        "total_scans": len(scans[email])
    })

@app.route("/api/classify", methods=["POST"])
def classify():
    """Receives an image, calls Gemini to classify it, and returns the result."""
    if 'image' not in request.files:
        return jsonify({"success": False, "message": "No image part"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400
        
    image_bytes = file.read()
    
    # Call Gemini
    result = gemini_helper.classify_waste(image_bytes)
    
    if result.get("success"):
        return jsonify(result)
    else:
        return jsonify({"success": False, "message": result.get("error", "Failed to classify")}), 500


@app.route("/api/history/<email>", methods=["GET"])
def get_history(email):
    """Returns scan history for a user — used by dashboard."""
    email = email.strip().lower()
    scans = load(SCAN_FILE)
    users = load(DB_FILE)

    history = scans.get(email, [])
    points  = users.get(email, {}).get("points", 0)

    # calculate category breakdown
    cats = {"dry": 0, "wet": 0, "ewaste": 0, "hazardous": 0, "medical": 0}
    for s in history:
        c = s.get("category", "dry")
        cats[c] = cats.get(c, 0) + 1

    return jsonify({
        "success": True,
        "history": history[:20],
        "points":  points,
        "total_scans": len(history),
        "breakdown": cats
    })


@app.route("/api/points/<email>", methods=["GET"])
def get_points(email):
    users = load(DB_FILE)
    if email in users:
        return jsonify({"success": True, "points": users[email].get("points", 0)})
    return jsonify({"success": False, "points": 0})

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    """Top 10 users by points."""
    users = load(DB_FILE)
    ranked = sorted(
        [{"name": v["name"], "points": v.get("points", 0), "state": v.get("state", "")}
         for v in users.values()],
        key=lambda x: x["points"],
        reverse=True
    )
    return jsonify({"success": True, "leaderboard": ranked[:10]})


# ══════════════════════════════════════════════════════════
# STATS ROUTE (for landing page counter)
# ══════════════════════════════════════════════════════════

@app.route("/api/stats", methods=["GET"])
def stats():
    return jsonify({"success": True, **get_global_stats()})


# ══════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n🌟 Aesthetic SmartSort Backend Running!")
    print("📡 Open http://127.0.0.1:5000 in your browser.\n")
    app.run(debug=True, port=5000)