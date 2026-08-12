"""
Yaoundé Community Explorer
A Flask + JSON-file backend for discovering community outings in Yaoundé.
"""
import json
import os
import gzip
import io
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

app = Flask(__name__)
app.secret_key = "yaounde-community-dev-secret-change-me"

# Let browsers cache static assets (css/js) instead of re-downloading them on
# every page — meaningful on a slow connection where the pages share the
# same handful of files. In production, put a real CDN/nginx in front of
# this instead; this is just a sane default for the dev server.
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 60 * 60 * 24 * 7  # 1 week


@app.context_processor
def inject_asset_helpers():
    """Expose static_url() to every template: a url_for('static', ...) that
    appends the file's own last-modified time as a ?v= query string. Browsers
    then cache each asset aggressively (see SEND_FILE_MAX_AGE_DEFAULT below),
    but the moment a file's content actually changes on disk, its URL changes
    too — so a new deploy is never blocked behind someone's old cached copy.
    """
    def static_url(filename):
        path = os.path.join(app.static_folder, filename)
        try:
            version = int(os.path.getmtime(path))
        except OSError:
            version = 0
        return f"{url_for('static', filename=filename)}?v={version}"
    return dict(static_url=static_url)


@app.after_request
def compress_response(response):
    """Gzip text-ish responses (HTML/JSON) when the client supports it.

    This matters most on a slow connection: our JSON API responses and
    rendered pages are mostly repeated English text (great gzip ratio), and
    on a 2G/3G link the CPU cost of compressing is far cheaper than the
    extra seconds of transfer time saved.
    """
    if (
        response.direct_passthrough
        or response.status_code < 200
        or response.status_code >= 300
        or "Content-Encoding" in response.headers
        or "gzip" not in request.headers.get("Accept-Encoding", "").lower()
    ):
        return response

    compressible = ("text/html", "application/json", "text/css", "application/javascript", "text/javascript")
    if not any(response.mimetype.startswith(m) for m in compressible):
        return response

    data = response.get_data()
    if len(data) < 500:  # not worth compressing tiny payloads
        return response

    buf = io.BytesIO()
    with gzip.GzipFile(mode="wb", fileobj=buf, compresslevel=6) as gz:
        gz.write(data)

    response.set_data(buf.getvalue())
    response.headers["Content-Encoding"] = "gzip"
    response.headers["Content-Length"] = str(len(response.get_data()))
    response.headers.setdefault("Vary", "Accept-Encoding")
    return response


# ---------------------------------------------------------------------------
# Tiny JSON "database" helpers
# ---------------------------------------------------------------------------
def _path(name):
    return os.path.join(DATA_DIR, f"{name}.json")


def read_json(name):
    with open(_path(name), "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(name, data):
    with open(_path(name), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def next_id(records):
    return (max((r["id"] for r in records), default=0)) + 1


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Please log in to continue."}), 401
        return view(*args, **kwargs)
    return wrapped


def current_user():
    if "user_id" not in session:
        return None
    users = read_json("users")
    return next((u for u in users if u["id"] == session["user_id"]), None)


def public_user(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"]}


def enrich_destination(dest, reviews):
    dest_reviews = [r for r in reviews if r["destination_id"] == dest["id"]]
    count = len(dest_reviews)
    avg = round(sum(r["rating"] for r in dest_reviews) / count, 1) if count else None
    out = dict(dest)
    out["rating_avg"] = avg
    out["rating_count"] = count
    return out


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html", user=current_user())


@app.route("/explore")
def explore():
    return render_template("explore.html", user=current_user())


@app.route("/destination/<int:dest_id>")
def destination_page(dest_id):
    destinations = read_json("destinations")
    dest = next((d for d in destinations if d["id"] == dest_id), None)
    if not dest:
        return render_template("404.html"), 404
    return render_template("destination.html", dest=dest, user=current_user())


@app.route("/my-itinerary")
def my_itinerary_page():
    return render_template("my_itinerary.html", user=current_user())


@app.route("/reviews")
def reviews_page():
    return render_template("reviews.html", user=current_user())


@app.route("/about")
def about():
    return render_template("about.html", user=current_user())


@app.route("/login")
def login_page():
    return render_template("login.html", user=current_user())


@app.route("/register")
def register_page():
    return render_template("register.html", user=current_user())


# ---------------------------------------------------------------------------
# Auth API
# ---------------------------------------------------------------------------
@app.route("/api/register", methods=["POST"])
def api_register():
    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name or not email or len(password) < 4:
        return jsonify({"error": "Name, email and a password (4+ chars) are required."}), 400

    users = read_json("users")
    if any(u["email"] == email for u in users):
        return jsonify({"error": "An account with that email already exists."}), 409

    user = {
        "id": next_id(users),
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "created_at": datetime.utcnow().isoformat(),
    }
    users.append(user)
    write_json("users", users)

    session["user_id"] = user["id"]
    return jsonify({"user": public_user(user)}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    users = read_json("users")
    user = next((u for u in users if u["email"] == email), None)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Incorrect email or password."}), 401

    session["user_id"] = user["id"]
    return jsonify({"user": public_user(user)})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/me")
def api_me():
    user = current_user()
    return jsonify({"user": public_user(user) if user else None})


# ---------------------------------------------------------------------------
# Destinations API
# ---------------------------------------------------------------------------
@app.route("/api/destinations")
def api_destinations():
    destinations = read_json("destinations")
    reviews = read_json("reviews")

    q = (request.args.get("q") or "").strip().lower()
    category = request.args.get("category") or ""
    neighborhood = request.args.get("neighborhood") or ""
    tag = request.args.get("tag") or ""

    results = destinations
    if q:
        results = [
            d for d in results
            if q in d["name"].lower()
            or q in d["description"].lower()
            or q in d["neighborhood"].lower()
        ]
    if category:
        results = [d for d in results if d["category"] == category]
    if neighborhood:
        results = [d for d in results if d["neighborhood"] == neighborhood]
    if tag:
        results = [d for d in results if tag in d.get("tags", [])]

    enriched = [enrich_destination(d, reviews) for d in results]
    return jsonify({
        "count": len(enriched),
        "destinations": enriched,
        "categories": sorted({d["category"] for d in destinations}),
        "neighborhoods": sorted({d["neighborhood"] for d in destinations}),
    })


@app.route("/api/destinations/<int:dest_id>")
def api_destination_detail(dest_id):
    destinations = read_json("destinations")
    reviews = read_json("reviews")
    dest = next((d for d in destinations if d["id"] == dest_id), None)
    if not dest:
        return jsonify({"error": "Destination not found."}), 404

    dest_reviews = [r for r in reviews if r["destination_id"] == dest_id]
    dest_reviews.sort(key=lambda r: r["created_at"], reverse=True)
    return jsonify({"destination": enrich_destination(dest, reviews), "reviews": dest_reviews})


# ---------------------------------------------------------------------------
# Reviews API
# ---------------------------------------------------------------------------
@app.route("/api/destinations/<int:dest_id>/reviews", methods=["POST"])
@login_required
def api_add_review(dest_id):
    destinations = read_json("destinations")
    if not any(d["id"] == dest_id for d in destinations):
        return jsonify({"error": "Destination not found."}), 404

    body = request.get_json(force=True) or {}
    rating = body.get("rating")
    comment = (body.get("comment") or "").strip()

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5."}), 400
    if not comment:
        return jsonify({"error": "Please write a short comment."}), 400

    user = current_user()
    reviews = read_json("reviews")
    review = {
        "id": next_id(reviews),
        "destination_id": dest_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "rating": rating,
        "comment": comment,
        "created_at": datetime.utcnow().isoformat(),
    }
    reviews.append(review)
    write_json("reviews", reviews)
    return jsonify({"review": review}), 201


@app.route("/api/reviews/recent")
def api_recent_reviews():
    limit = min(int(request.args.get("limit", 12)), 50)
    reviews = read_json("reviews")
    destinations = {d["id"]: d for d in read_json("destinations")}
    reviews.sort(key=lambda r: r["created_at"], reverse=True)

    out = []
    for r in reviews[:limit]:
        dest = destinations.get(r["destination_id"])
        if not dest:
            continue
        item = dict(r)
        item["destination_name"] = dest["name"]
        item["destination_category"] = dest["category"]
        out.append(item)
    return jsonify({"reviews": out})


# ---------------------------------------------------------------------------
# Itinerary API
# ---------------------------------------------------------------------------
@app.route("/api/itinerary", methods=["GET"])
@login_required
def api_get_itinerary():
    user = current_user()
    itineraries = read_json("itineraries")
    destinations = {d["id"]: d for d in read_json("destinations")}

    mine = [i for i in itineraries if i["user_id"] == user["id"]]
    mine.sort(key=lambda i: i["added_at"])
    items = []
    for entry in mine:
        dest = destinations.get(entry["destination_id"])
        if dest:
            items.append({
                "entry_id": entry["id"],
                "added_at": entry["added_at"],
                "visited": entry.get("visited", False),
                "destination": dest,
            })
    return jsonify({"items": items})


@app.route("/api/itinerary", methods=["POST"])
@login_required
def api_add_to_itinerary():
    user = current_user()
    body = request.get_json(force=True) or {}
    dest_id = body.get("destination_id")

    destinations = read_json("destinations")
    if not any(d["id"] == dest_id for d in destinations):
        return jsonify({"error": "Destination not found."}), 404

    itineraries = read_json("itineraries")
    if any(i["user_id"] == user["id"] and i["destination_id"] == dest_id for i in itineraries):
        return jsonify({"error": "Already in your itinerary."}), 409

    entry = {
        "id": next_id(itineraries),
        "user_id": user["id"],
        "destination_id": dest_id,
        "added_at": datetime.utcnow().isoformat(),
        "visited": False,
    }
    itineraries.append(entry)
    write_json("itineraries", itineraries)
    return jsonify({"entry": entry}), 201


@app.route("/api/itinerary/<int:entry_id>", methods=["PATCH"])
@login_required
def api_update_itinerary_entry(entry_id):
    user = current_user()
    itineraries = read_json("itineraries")
    entry = next((i for i in itineraries if i["id"] == entry_id and i["user_id"] == user["id"]), None)
    if not entry:
        return jsonify({"error": "Itinerary entry not found."}), 404

    body = request.get_json(force=True) or {}
    if "visited" in body:
        entry["visited"] = bool(body["visited"])
    write_json("itineraries", itineraries)
    return jsonify({"entry": entry})


@app.route("/api/itinerary/<int:entry_id>", methods=["DELETE"])
@login_required
def api_remove_from_itinerary(entry_id):
    user = current_user()
    itineraries = read_json("itineraries")
    entry = next((i for i in itineraries if i["id"] == entry_id and i["user_id"] == user["id"]), None)
    if not entry:
        return jsonify({"error": "Itinerary entry not found."}), 404

    itineraries = [i for i in itineraries if i["id"] != entry_id]
    write_json("itineraries", itineraries)
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not found."}), 404
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True, port=5000)
