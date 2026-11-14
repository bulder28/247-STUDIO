import datetime
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs" / "screenshots"
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_URL = "http://localhost:4173"
SB_ORIGIN = "https://sulgghrzzawecmzmmzyu.supabase.co"
STORAGE_KEY = "sb-sulgghrzzawecmzmmzyu-auth-token"

TODAY = datetime.date.today()
CUR_MONTH = TODAY.strftime("%Y-%m")
NEXT_MONTH = (TODAY.replace(day=1) + datetime.timedelta(days=32)).strftime("%Y-%m")
NEXT2_MONTH = (TODAY.replace(day=1) + datetime.timedelta(days=63)).strftime("%Y-%m")
PREV_MONTH = (TODAY.replace(day=1) - datetime.timedelta(days=1)).strftime("%Y-%m")

UID_ADMIN = "11111111-1111-1111-1111-111111111111"
UID_COACH = "22222222-2222-2222-2222-222222222222"
UID_CLIENT1 = "33333333-3333-3333-3333-333333333331"
UID_CLIENT2 = "33333333-3333-3333-3333-333333333332"
UID_CLIENT3 = "33333333-3333-3333-3333-333333333333"
UID_CLIENT4 = "33333333-3333-3333-3333-333333333334"

DISCIPLINES = [
    {"id": "d-bjj", "name": "BJJ & Grappling", "slug": "bjj-grappling", "is_active": True, "sort_order": 1},
    {"id": "d-mma", "name": "MMA", "slug": "mma", "is_active": True, "sort_order": 2},
    {"id": "d-lucha", "name": "Lucha", "slug": "lucha", "is_active": True, "sort_order": 3},
    {"id": "d-fem", "name": "BJJ Femenino", "slug": "bjj-femenino", "is_active": True, "sort_order": 4},
    {"id": "d-kids", "name": "Kids", "slug": "kids", "is_active": True, "sort_order": 5},
]

PLANS = [
    {"id": "p-bjj", "name": "BJJ & Grappling", "price_eur": 75, "is_class_pack": False, "pack_credits": None, "promo_text": "Gi y No-Gi incluidos", "is_active": True, "plan_disciplines": [{"discipline_id": "d-bjj"}]},
    {"id": "p-mma", "name": "MMA", "price_eur": 75, "is_class_pack": False, "pack_credits": None, "promo_text": None, "is_active": True, "plan_disciplines": [{"discipline_id": "d-mma"}]},
    {"id": "p-combo", "name": "BJJ & Grappling + MMA", "price_eur": 90, "is_class_pack": False, "pack_credits": None, "promo_text": "Pack combinado", "is_active": True, "plan_disciplines": [{"discipline_id": "d-bjj"}, {"discipline_id": "d-mma"}]},
    {"id": "p-unlim", "name": "Pack Unlimited", "price_eur": 105, "is_class_pack": False, "pack_credits": None, "promo_text": "Acceso total", "is_active": True, "plan_disciplines": [{"discipline_id": "d-bjj"}, {"discipline_id": "d-mma"}, {"discipline_id": "d-lucha"}, {"discipline_id": "d-fem"}]},
    {"id": "p-k1", "name": "Kids 1 (+7 años)", "price_eur": 55, "is_class_pack": False, "pack_credits": None, "promo_text": None, "is_active": True, "plan_disciplines": [{"discipline_id": "d-kids"}]},
]

SCHEDULE = [
    {"id": "c-lun-10", "day_of_week": 1, "start_time": "10:00:00", "end_time": "11:30:00", "discipline_id": "d-bjj", "title": "GI (BJJ)", "coach_name": "Mario", "is_active": True, "disciplines": {"name": "BJJ & Grappling", "slug": "bjj-grappling"}},
    {"id": "c-lun-17", "day_of_week": 1, "start_time": "17:30:00", "end_time": "18:30:00", "discipline_id": "d-kids", "title": "KIDS 1 (+7 AÑOS)", "coach_name": "Carlos", "is_active": True, "disciplines": {"name": "Kids", "slug": "kids"}},
    {"id": "c-lun-18", "day_of_week": 1, "start_time": "18:30:00", "end_time": "19:30:00", "discipline_id": "d-mma", "title": "MMA", "coach_name": "David", "is_active": True, "disciplines": {"name": "MMA", "slug": "mma"}},
    {"id": "c-lun-19", "day_of_week": 1, "start_time": "19:30:00", "end_time": "20:30:00", "discipline_id": "d-bjj", "title": "GI (BJJ)", "coach_name": "Mario", "is_active": True, "disciplines": {"name": "BJJ & Grappling", "slug": "bjj-grappling"}},
    {"id": "c-mar-18", "day_of_week": 2, "start_time": "18:30:00", "end_time": "19:30:00", "discipline_id": "d-lucha", "title": "LUCHA", "coach_name": "David", "is_active": True, "disciplines": {"name": "Lucha", "slug": "lucha"}},
]

PROFILES = [
    {"id": UID_ADMIN, "role": "admin", "status": "active", "full_name": "Mario & David (Dirección)", "alias": "247 Admin", "email": "admin@247studio.es", "phone": "600000001", "belt": "Negro", "belt_stripes": 2, "must_change_password": False, "avatar_url": None, "birth_date": "1988-05-10", "guardian_user_id": None, "personal_goals": None, "emergency_contact_name": None, "emergency_contact_phone": None, "medical_notes": None},
    {"id": UID_COACH, "role": "coach", "status": "active", "full_name": "Carlos Ruiz", "alias": "Coach Carlos", "email": "carlos.coach@247studio.es", "phone": "600111222", "belt": "Negro", "belt_stripes": 1, "must_change_password": False, "avatar_url": None, "birth_date": "1990-02-15", "guardian_user_id": None, "personal_goals": None, "emergency_contact_name": None, "emergency_contact_phone": None, "medical_notes": None},
    {"id": UID_CLIENT1, "role": "client", "status": "active", "full_name": "Carlos García López", "alias": "Carlitos", "email": "carlos.garcia@ejemplo.com", "phone": "611222333", "belt": "Azul", "belt_stripes": 2, "must_change_password": False, "avatar_url": None, "birth_date": "1994-03-12", "guardian_user_id": None, "personal_goals": "Competir en el Open de Madrid en categoría Azul -76kg", "emergency_contact_name": "Ana López", "emergency_contact_phone": "699888777", "medical_notes": "Sin lesiones"},
    {"id": UID_CLIENT2, "role": "client", "status": "active", "full_name": "Laura Gómez Martín", "alias": "Lau", "email": "laura.gomez@ejemplo.com", "phone": "622333444", "belt": "Morado", "belt_stripes": 1, "must_change_password": False, "avatar_url": None, "birth_date": "1996-08-20", "guardian_user_id": None, "personal_goals": None, "emergency_contact_name": None, "emergency_contact_phone": None, "medical_notes": None},
    {"id": UID_CLIENT3, "role": "client", "status": "active", "full_name": "Javier Moreno Ruiz", "alias": None, "email": "javier.moreno@ejemplo.com", "phone": "633444555", "belt": "Blanco", "belt_stripes": 3, "must_change_password": False, "avatar_url": None, "birth_date": "1992-11-04", "guardian_user_id": None, "personal_goals": None, "emergency_contact_name": None, "emergency_contact_phone": None, "medical_notes": None},
    {"id": UID_CLIENT4, "role": "client", "status": "paused", "full_name": "Raúl Jiménez (Pausado)", "alias": None, "email": "raul.jimenez@ejemplo.com", "phone": "644555666", "belt": "Azul", "belt_stripes": 0, "must_change_password": False, "avatar_url": None, "birth_date": "1991-06-18", "guardian_user_id": None, "personal_goals": None, "emergency_contact_name": None, "emergency_contact_phone": None, "medical_notes": None},
]

V_PAYMENT_STATUS = [
    {"user_id": UID_CLIENT1, "full_name": "Carlos García López", "member_status": "active", "month_year": CUR_MONTH, "plan_id": "p-combo", "plan_name": "BJJ & Grappling + MMA", "price_eur": 90, "recorded_payment_status": "paid_ok", "paid_at": f"{TODAY.isoformat()}T10:15:00Z", "first_attendance_in_month": None, "effective_status": "OK", "payment_method": "Bizum", "paid_amount_eur": 90, "payment_notes": "Cobro múltiple (3 meses)"},
    {"user_id": UID_CLIENT1, "full_name": "Carlos García López", "member_status": "active", "month_year": NEXT_MONTH, "plan_id": "p-combo", "plan_name": "BJJ & Grappling + MMA", "price_eur": 90, "recorded_payment_status": "paid_ok", "paid_at": f"{TODAY.isoformat()}T10:15:00Z", "first_attendance_in_month": None, "effective_status": "ADVANCE_OK", "payment_method": "Bizum", "paid_amount_eur": 90, "payment_notes": "Cobro múltiple (3 meses)"},
    {"user_id": UID_CLIENT1, "full_name": "Carlos García López", "member_status": "active", "month_year": NEXT2_MONTH, "plan_id": "p-combo", "plan_name": "BJJ & Grappling + MMA", "price_eur": 90, "recorded_payment_status": "paid_ok", "paid_at": f"{TODAY.isoformat()}T10:15:00Z", "first_attendance_in_month": None, "effective_status": "ADVANCE_OK", "payment_method": "Bizum", "paid_amount_eur": 90, "payment_notes": "Cobro múltiple (3 meses)"},
    {"user_id": UID_CLIENT2, "full_name": "Laura Gómez Martín", "member_status": "active", "month_year": CUR_MONTH, "plan_id": "p-unlim", "plan_name": "Pack Unlimited", "price_eur": 105, "recorded_payment_status": "paid_ok", "paid_at": f"{TODAY.isoformat()}T11:00:00Z", "first_attendance_in_month": None, "effective_status": "OK", "payment_method": "Efectivo", "paid_amount_eur": 105, "payment_notes": None},
    {"user_id": UID_CLIENT3, "full_name": "Javier Moreno Ruiz", "member_status": "active", "month_year": PREV_MONTH, "plan_id": "p-bjj", "plan_name": "BJJ & Grappling", "price_eur": 75, "recorded_payment_status": "pending_nok", "paid_at": None, "first_attendance_in_month": None, "effective_status": "PAST_DUE", "payment_method": None, "paid_amount_eur": None, "payment_notes": None},
    {"user_id": UID_CLIENT3, "full_name": "Javier Moreno Ruiz", "member_status": "active", "month_year": CUR_MONTH, "plan_id": "p-bjj", "plan_name": "BJJ & Grappling", "price_eur": 75, "recorded_payment_status": "pending_nok", "paid_at": None, "first_attendance_in_month": f"{(TODAY - datetime.timedelta(days=10)).isoformat()}T19:30:00Z", "effective_status": "NOK_OVERDUE", "payment_method": None, "paid_amount_eur": None, "payment_notes": None},
]


def wait_server():
    for _ in range(40):
        try:
            with urllib.request.urlopen(BASE_URL, timeout=1) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def make_session(role_user: dict):
    exp = int(time.time()) + 36000
    return {
        "access_token": "mock-token",
        "token_type": "bearer",
        "expires_in": 36000,
        "expires_at": exp,
        "refresh_token": "mock-refresh",
        "user": {
            "id": role_user["id"],
            "aud": "authenticated",
            "role": "authenticated",
            "email": role_user["email"],
            "app_metadata": {"provider": "email"},
            "user_metadata": {},
            "created_at": "2026-01-01T00:00:00Z",
        },
    }


def make_route_handler(active_profile_state: dict):
    def handle(route):
        url = route.request.url
        parsed = urllib.parse.urlparse(url)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)
        accept = route.request.headers.get("accept", "")
        is_single = "application/vnd.pgrst.object+json" in accept

        def send_json(data, count=None):
            payload = data
            if is_single:
                if isinstance(data, list):
                    payload = data[0] if len(data) > 0 else None
            if is_single and payload is None:
                route.fulfill(
                    status=200,
                    content_type="application/vnd.pgrst.object+json",
                    body="null",
                )
                return
            headers = {"content-type": "application/json"}
            if count is not None:
                headers["content-range"] = f"0-0/{count}"
            route.fulfill(status=200, headers=headers, body=json.dumps(payload))

        if path.startswith("/auth/v1/user"):
            send_json(make_session(active_profile_state["profile"])["user"])
            return

        if path.startswith("/rest/v1/profiles"):
            if "id" in qs and qs["id"][0].startswith("eq."):
                uid = qs["id"][0][3:]
                matched = [p for p in PROFILES if p["id"] == uid]
                if matched and uid == active_profile_state["profile"]["id"]:
                    matched = [active_profile_state["profile"]]
                send_json(matched, count=len(matched))
            else:
                res = PROFILES
                if "status" in qs and qs["status"][0] == "eq.active":
                    res = [p for p in PROFILES if p["role"] == "client" and p["status"] == "active"]
                send_json(res, count=len(res))
            return

        if path.startswith("/rest/v1/v_monthly_payment_status"):
            res = V_PAYMENT_STATUS
            if "month_year" in qs and qs["month_year"][0].startswith("eq."):
                my = qs["month_year"][0][3:]
                res = [r for r in res if r["month_year"] == my]
            if "user_id" in qs and qs["user_id"][0].startswith("eq."):
                uid = qs["user_id"][0][3:]
                res = [r for r in res if r["user_id"] == uid]
            send_json(res)
            return

        if path.startswith("/rest/v1/payments"):
            send_json([
                {"amount_eur": 90, "payment_method": "Bizum"},
                {"amount_eur": 90, "payment_method": "Bizum"},
                {"amount_eur": 90, "payment_method": "Bizum"},
                {"amount_eur": 105, "payment_method": "Efectivo"},
            ])
            return

        if path.startswith("/rest/v1/disciplines"):
            send_json(DISCIPLINES)
            return

        if path.startswith("/rest/v1/plans"):
            send_json(PLANS)
            return

        if path.startswith("/rest/v1/plan_disciplines"):
            send_json([
                {"plan_id": "p-bjj"},
                {"plan_id": "p-combo"},
                {"plan_id": "p-unlim"},
            ])
            return

        if path.startswith("/rest/v1/schedule_classes"):
            send_json(SCHEDULE)
            return

        if path.startswith("/rest/v1/subscriptions"):
            if "select" in qs and "profiles!inner" in qs["select"][0]:
                send_json([
                    {"user_id": UID_CLIENT1, "profiles": PROFILES[2]},
                    {"user_id": UID_CLIENT2, "profiles": PROFILES[3]},
                    {"user_id": UID_CLIENT3, "profiles": PROFILES[4]},
                ])
            else:
                send_json([
                    {"user_id": UID_CLIENT1, "plan_id": "p-combo"},
                    {"user_id": UID_CLIENT2, "plan_id": "p-unlim"},
                    {"user_id": UID_CLIENT3, "plan_id": "p-bjj"},
                ])
            return

        if path.startswith("/rest/v1/attendances"):
            send_json([
                {
                    "id": "att-1",
                    "user_id": UID_CLIENT1,
                    "guest_name": None,
                    "profiles": {"full_name": "Carlos García López", "avatar_url": None},
                    "schedule_classes": {"title": "GI (BJJ)", "start_time": "19:30:00"},
                }
            ])
            return

        if path.startswith("/rest/v1/trial_guests"):
            send_json([
                {
                    "id": "tg-1",
                    "full_name": "Pablo Díaz Ortega",
                    "phone": "655999111",
                    "email": "pablo.prueba@ejemplo.com",
                    "trial_date": TODAY.isoformat(),
                    "disciplines": {"name": "BJJ & Grappling"},
                }
            ])
            return

        if path.startswith("/rest/v1/fighter_stats"):
            send_json({
                "user_id": UID_CLIENT1,
                "tecnica": 76,
                "fuerza": 72,
                "elasticidad": 68,
                "guardia": 80,
                "pase": 74,
                "derribos": 64,
                "leglocks": 58,
                "finalizacion": 75,
            })
            return

        if path.startswith("/rest/v1/events"):
            send_json([
                {
                    "id": "ev-1",
                    "title": "Seminario de Guardia & Pase con Mario",
                    "event_type": "Seminario",
                    "event_date": (TODAY + datetime.timedelta(days=12)).isoformat(),
                    "location": "247 STUDIO · Pinto",
                }
            ])
            return

        if path.startswith("/rest/v1/document_templates"):
            send_json([
                {
                    "id": "doc-1",
                    "title": "Consentimiento y Derechos de Imagen + Normas del Tatami",
                    "body_text": "Declaro estar en condiciones físicas aptas para la práctica de deportes de contacto y autorizo el uso deportivo de fotografías en actividades del club.",
                    "version": 1,
                }
            ])
            return

        if path.startswith("/rest/v1/document_signatures"):
            send_json([])
            return

        if path.startswith("/rest/v1/announcements"):
            send_json([
                {
                    "id": "ann-1",
                    "title": "Horarios festivos y Open Mat del mes",
                    "content": "Recordamos que los viernes hay sesión de sparring abierto tras la clase de No-Gi. Traed protecciones.",
                    "created_at": f"{TODAY.isoformat()}T09:00:00Z",
                    "disciplines": {"name": "BJJ & Grappling"},
                }
            ])
            return

        if path.startswith("/rest/v1/notices"):
            send_json([
                {
                    "id": "not-1",
                    "notice_type": "general",
                    "title": "Bienvenido a la nueva App de 247 STUDIO",
                    "message": "Aquí puedes consultar horarios, estado de tu cuota y firmar tu ficha.",
                    "created_at": f"{TODAY.isoformat()}T08:00:00Z",
                }
            ])
            return

        if path.startswith("/rest/v1/faqs"):
            send_json([
                {
                    "id": "faq-1",
                    "question": "¿Qué necesito traer a mi primera clase?",
                    "answer": "Ropa deportiva cómoda sin cremalleras, chanclas para moverte fuera del tatami y agua.",
                }
            ])
            return

        if path.startswith("/rest/v1/private_messages"):
            send_json([
                {
                    "id": "msg-1",
                    "client_id": UID_CLIENT1,
                    "sender_id": UID_CLIENT1,
                    "body": "Hola Mario, ¿qué talla de kimono me recomiendas para 1,78m y 75kg?",
                    "created_at": f"{TODAY.isoformat()}T12:00:00Z",
                    "client": {"full_name": "Carlos García López"},
                }
            ])
            return

        send_json([])

    return handle


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    server_proc = None
    already_running = False
    try:
        with urllib.request.urlopen(BASE_URL, timeout=1) as r:
            already_running = r.status == 200
    except Exception:
        already_running = False

    if not already_running:
        server_proc = subprocess.Popen(
            ["npm.cmd", "run", "preview", "--", "--port", "4173", "--strictPort"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if not wait_server():
            print("ERROR: Vite preview no arrancó a tiempo.", file=sys.stderr)
            sys.exit(1)

    active_state = {"profile": dict(PROFILES[0])}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 820}, device_scale_factor=1.5)
            context.route(f"{SB_ORIGIN}/**", make_route_handler(active_state))
            page = context.new_page()

            def set_session(profile_obj):
                active_state["profile"] = dict(profile_obj)
                sess = make_session(profile_obj)
                page.goto(f"{BASE_URL}/login", wait_until="networkidle")
                page.evaluate(
                    """([k, v]) => { localStorage.setItem(k, JSON.stringify(v)); }""",
                    [STORAGE_KEY, sess],
                )

            # 1. Login
            page.goto(f"{BASE_URL}/login", wait_until="networkidle")
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT_DIR / "01_login.png"))

            # 2. Set Password (must_change_password = true)
            forced_client = dict(PROFILES[2])
            forced_client["must_change_password"] = True
            set_session(forced_client)
            page.goto(f"{BASE_URL}/app", wait_until="networkidle")
            page.wait_for_timeout(500)
            page.screenshot(path=str(OUT_DIR / "02_set_password.png"))

            # 3. Admin Home
            set_session(PROFILES[0])
            page.goto(f"{BASE_URL}/admin", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "03_admin_home.png"))

            # 4. Admin Students + Invitados
            page.goto(f"{BASE_URL}/admin/alumnos", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "04_admin_students.png"))

            # 5. Modal Nuevo Alumno
            page.get_by_role("button", name="Nuevo Alumno").click()
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT_DIR / "05_admin_new_student_modal.png"))

            # 6. Admin Tracking (Seguimiento)
            page.goto(f"{BASE_URL}/admin/seguimiento", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "06_admin_tracking.png"))

            # 7. Modal Cobrar Varios Meses
            page.get_by_role("button", name="Cobrar varios meses").click()
            page.wait_for_timeout(450)
            page.screenshot(path=str(OUT_DIR / "07_admin_multi_month_modal.png"))

            # 8. Admin Plans
            page.goto(f"{BASE_URL}/admin/tarifas", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "08_admin_plans.png"))

            # 9. Admin Schedule
            page.goto(f"{BASE_URL}/admin/horarios", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "09_admin_schedule.png"))

            # 10. Admin Communication
            page.goto(f"{BASE_URL}/admin/comunicacion", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "10_admin_communication.png"))

            # 11. Coach Attendance (Pasar Lista)
            set_session(PROFILES[1])
            page.goto(f"{BASE_URL}/coach", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "11_coach_attendance.png"))

            # 12. Coach Trial Guest Modal
            page.get_by_role("button", name="+ Invitado / Clase Prueba").click()
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT_DIR / "12_coach_trial_modal.png"))

            # 13. Client Home
            set_session(PROFILES[2])
            page.goto(f"{BASE_URL}/app", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "13_client_home.png"))

            # 14. Client Profile + Signature Modal
            page.goto(f"{BASE_URL}/app/perfil", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "14_client_profile.png"))

            browser.close()
            print("Capturas completadas:", len(list(OUT_DIR.glob("*.png"))))
    finally:
        if server_proc is not None:
            server_proc.terminate()
            server_proc.wait(timeout=5)


if __name__ == "__main__":
    main()

