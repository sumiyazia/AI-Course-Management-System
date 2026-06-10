from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from app.models.schemas import UserRegister, UserLogin, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import get_db

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db=Depends(get_db)):
    existing = await db["users"].find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name":       user_data.name.strip(),
        "email":      user_data.email.strip().lower(),
        "password":   hash_password(user_data.password),
        "role":       user_data.role,
        "created_at": datetime.utcnow(),
        "enrolled_courses": [],
        "pending_courses": [],
        "xp": 0,
        "level": 1,
        "streak": 0,
        "badges": [],
        "last_login": None
    }
    result = await db["users"].insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token({"sub": user_id, "role": user_data.role})
    return TokenResponse(access_token=token, role=user_data.role, name=user_data.name)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db=Depends(get_db)):
    email_clean = credentials.email.strip().lower()
    user = await db["users"].find_one({"email": email_clean})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    from app.services.gamification_service import update_streak
    await update_streak(db, str(user["_id"]))

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return TokenResponse(access_token=token, role=user["role"], name=user["name"])


@router.get("/me")
async def get_profile(db=Depends(get_db),
                       current_user=Depends(__import__("app.core.security", fromlist=["get_current_user"]).get_current_user)):
    return {
        "id":    current_user["id"],
        "name":  current_user["name"],
        "email": current_user["email"],
        "role":  current_user["role"],
        "enrolled_courses": current_user.get("enrolled_courses", []),
        "pending_courses": current_user.get("pending_courses", []),
        "xp": current_user.get("xp", 0),
        "level": current_user.get("level", 1),
        "streak": current_user.get("streak", 0),
        "badges": current_user.get("badges", [])
    }
