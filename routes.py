import os
from datetime import datetime, date
from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from jose import jwt, JWTError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google import genai
import stripe


# --- Pydantic models ---
class GoogleAuthRequest(BaseModel):
    credential: str


class InvoiceCreateRequest(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    amount: float
    due_date: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "pending"


class InvoiceUpdateRequest(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class ProposalCreateRequest(BaseModel):
    project_description: str


class StripePaymentLinkRequest(BaseModel):
    invoice_id: int


def _row_to_dict(row) -> dict:
    """Convert a SQLAlchemy row to a plain dict, serializing dates."""
    d = dict(row._mapping)
    for k, v in list(d.items()):
        if isinstance(v, date) and not isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, float):
            d[k] = float(v)
    return d


def create_app(static_dir: str) -> FastAPI:
    # --- DB Setup ---
    db_url = os.environ.get("DB9EC716F3_DATABASE_URL", "")
    engine = create_engine(db_url, poolclass=NullPool) if db_url else create_engine("sqlite:///:memory:", poolclass=NullPool)

    def init_db():
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    google_id TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    picture TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS invoices (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    invoice_number TEXT NOT NULL,
                    client_name TEXT NOT NULL,
                    client_email TEXT,
                    amount NUMERIC(10,2) NOT NULL,
                    due_date DATE,
                    status TEXT DEFAULT 'pending',
                    description TEXT,
                    stripe_payment_link TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS proposals (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    project_description TEXT NOT NULL,
                    generated_content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()

    try:
        init_db()
    except Exception as e:
        print(f"DB init warning: {e}")

    # --- Auth helper ---
    SECRET_KEY = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-prod")
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    security = HTTPBearer(auto_error=False)

    def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
        if not credentials:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

    # --- Gemini client ---
    _gemini_base_url = os.environ.get("GEMINI_WORKSHOP_BASE_URL")
    _gemini_http_opts = {"base_url": _gemini_base_url} if _gemini_base_url else {}
    gemini_client = genai.Client(
        api_key=os.environ.get("GEMINI_WORKSHOP_API_KEY") or os.environ.get("GEMINI_API_KEY"),
        http_options=_gemini_http_opts
    )

    # --- Stripe key ---
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

    # --- Router ---
    api = APIRouter()

    @api.get("/health")
    def health():
        return {"ok": True}

    @api.get("/config")
    def config():
        return {"google_client_id": GOOGLE_CLIENT_ID}

    @api.post("/auth/google")
    def auth_google(body: GoogleAuthRequest):
        try:
            idinfo = id_token.verify_oauth2_token(
                body.credential, google_requests.Request(), GOOGLE_CLIENT_ID
            )
            google_id = idinfo.get("sub")
            email = idinfo.get("email", "")
            name = idinfo.get("name", "")
            picture = idinfo.get("picture", "")

            with engine.connect() as conn:
                result = conn.execute(
                    text("""
                        INSERT INTO users (google_id, email, name, picture)
                        VALUES (:google_id, :email, :name, :picture)
                        ON CONFLICT (google_id) DO UPDATE SET
                            email = EXCLUDED.email,
                            name = EXCLUDED.name,
                            picture = EXCLUDED.picture
                        RETURNING id, google_id, email, name, picture, created_at
                    """),
                    {
                        "google_id": google_id,
                        "email": email,
                        "name": name,
                        "picture": picture,
                    },
                )
                row = result.fetchone()
                user = _row_to_dict(row)
                conn.commit()

            token_payload = {
                "user_id": user["id"],
                "email": email,
                "name": name,
                "picture": picture,
            }
            jwt_token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")
            return {"token": jwt_token, "user": user}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @api.get("/auth/me")
    def auth_me(user: dict = Depends(get_current_user)):
        return user

    @api.post("/auth/logout")
    def auth_logout():
        return {"ok": True}

    @api.get("/dashboard")
    def dashboard(user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            with engine.connect() as conn:
                # total earned (paid)
                earned_result = conn.execute(
                    text("SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE user_id = :uid AND status = 'paid'"),
                    {"uid": user_id},
                )
                total_earned = float(earned_result.scalar() or 0)

                # outstanding (pending)
                outstanding_result = conn.execute(
                    text("SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE user_id = :uid AND status = 'pending'"),
                    {"uid": user_id},
                )
                outstanding = float(outstanding_result.scalar() or 0)

                # overdue (pending and past due)
                overdue_result = conn.execute(
                    text("""
                        SELECT COALESCE(SUM(amount), 0) FROM invoices
                        WHERE user_id = :uid AND status = 'pending'
                        AND due_date IS NOT NULL AND due_date < CURRENT_DATE
                    """),
                    {"uid": user_id},
                )
                overdue = float(overdue_result.scalar() or 0)

                # recent invoices
                recent_result = conn.execute(
                    text("""
                        SELECT * FROM invoices
                        WHERE user_id = :uid
                        ORDER BY created_at DESC
                        LIMIT 5
                    """),
                    {"uid": user_id},
                )
                recent_invoices = [_row_to_dict(r) for r in recent_result.fetchall()]

            return {
                "total_earned": total_earned,
                "outstanding": outstanding,
                "overdue": overdue,
                "recent_invoices": recent_invoices,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @api.get("/invoices")
    def list_invoices(user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT * FROM invoices WHERE user_id = :uid ORDER BY created_at DESC"),
                    {"uid": user_id},
                )
                invoices = [_row_to_dict(r) for r in result.fetchall()]
            return invoices
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @api.post("/invoices")
    def create_invoice(body: InvoiceCreateRequest, user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            with engine.connect() as conn:
                count_result = conn.execute(
                    text("SELECT COUNT(*) FROM invoices WHERE user_id = :uid"),
                    {"uid": user_id},
                )
                count = int(count_result.scalar() or 0)
                invoice_number = f"INV-{count + 1:03d}"

                result = conn.execute(
                    text("""
                        INSERT INTO invoices (user_id, invoice_number, client_name, client_email, amount, due_date, status, description)
                        VALUES (:uid, :inv_num, :client_name, :client_email, :amount, :due_date, :status, :description)
                        RETURNING *
                    """),
                    {
                        "uid": user_id,
                        "inv_num": invoice_number,
                        "client_name": body.client_name,
                        "client_email": body.client_email,
                        "amount": body.amount,
                        "due_date": body.due_date,
                        "status": body.status or "pending",
                        "description": body.description,
                    },
                )
                row = result.fetchone()
                invoice = _row_to_dict(row)
                conn.commit()
            return invoice
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @api.put("/invoices/{invoice_id}")
    def update_invoice(invoice_id: int, body: InvoiceUpdateRequest, user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            # Build dynamic update
            fields = []
            params = {"invoice_id": invoice_id, "uid": user_id}
            if body.client_name is not None:
                fields.append("client_name = :client_name")
                params["client_name"] = body.client_name
            if body.client_email is not None:
                fields.append("client_email = :client_email")
                params["client_email"] = body.client_email
            if body.amount is not None:
                fields.append("amount = :amount")
                params["amount"] = body.amount
            if body.due_date is not None:
                fields.append("due_date = :due_date")
                params["due_date"] = body.due_date
            if body.status is not None:
                fields.append("status = :status")
                params["status"] = body.status
            if body.description is not None:
                fields.append("description = :description")
                params["description"] = body.description

            if not fields:
                # No fields to update, just return current
                with engine.connect() as conn:
                    result = conn.execute(
                        text("SELECT * FROM invoices WHERE id = :invoice_id AND user_id = :uid"),
                        params,
                    )
                    row = result.fetchone()
                    if not row:
                        raise HTTPException(status_code=404, detail="Invoice not found")
                    return _row_to_dict(row)

            with engine.connect() as conn:
                result = conn.execute(
                    text(f"""
                        UPDATE invoices SET {', '.join(fields)}
                        WHERE id = :invoice_id AND user_id = :uid
                        RETURNING *
                    """),
                    params,
                )
                row = result.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Invoice not found")
                invoice = _row_to_dict(row)
                conn.commit()
            return invoice
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @api.delete("/invoices/{invoice_id}")
    def delete_invoice(invoice_id: int, user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("DELETE FROM invoices WHERE id = :invoice_id AND user_id = :uid RETURNING id"),
                    {"invoice_id": invoice_id, "uid": user_id},
                )
                row = result.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Invoice not found")
                conn.commit()
            return {"ok": True}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @api.get("/proposals")
    def list_proposals(user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT * FROM proposals WHERE user_id = :uid ORDER BY created_at DESC"),
                    {"uid": user_id},
                )
                proposals = [_row_to_dict(r) for r in result.fetchall()]
            return proposals
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @api.post("/proposals")
    def create_proposal(body: ProposalCreateRequest, user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            prompt = f"""Write a professional project proposal for the following project.
Include: Executive Summary, Scope of Work, Timeline, Deliverables, and Investment.
Make it polished and ready to send to a client.

Project Description: {body.project_description}"""

            response = gemini_client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt,
            )
            generated_content = response.text

            with engine.connect() as conn:
                result = conn.execute(
                    text("""
                        INSERT INTO proposals (user_id, project_description, generated_content)
                        VALUES (:uid, :project_description, :generated_content)
                        RETURNING *
                    """),
                    {
                        "uid": user_id,
                        "project_description": body.project_description,
                        "generated_content": generated_content,
                    },
                )
                row = result.fetchone()
                proposal = _row_to_dict(row)
                conn.commit()
            return proposal
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @api.post("/stripe/payment-link")
    def create_payment_link(body: StripePaymentLinkRequest, user: dict = Depends(get_current_user)):
        user_id = user.get("user_id")
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT * FROM invoices WHERE id = :invoice_id AND user_id = :uid"),
                    {"invoice_id": body.invoice_id, "uid": user_id},
                )
                row = result.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Invoice not found")
                invoice = _row_to_dict(row)

            price = stripe.Price.create(
                unit_amount=int(float(invoice["amount"]) * 100),
                currency="usd",
                product_data={"name": f"Invoice {invoice['invoice_number']} - {invoice['client_name']}"},
            )
            payment_link = stripe.PaymentLink.create(
                line_items=[{"price": price.id, "quantity": 1}]
            )
            link_url = payment_link.url

            with engine.connect() as conn:
                conn.execute(
                    text("UPDATE invoices SET stripe_payment_link = :link WHERE id = :invoice_id"),
                    {"link": link_url, "invoice_id": body.invoice_id},
                )
                conn.commit()

            return {"payment_link_url": link_url}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # --- App assembly ---
    app = FastAPI()
    app.include_router(api, prefix="/api")

    # Static files + SPA fallback (keep existing logic)
    if os.path.isdir(static_dir):
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{path:path}")
        async def spa_fallback(request: Request, path: str):
            file_path = os.path.join(static_dir, path)
            if path and os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(
                os.path.join(static_dir, "index.html"),
                headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"},
            )

    return app
