from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.schemas import LeaderboardResponse, LeaderboardEntry, UserProfileResponse, Badge
from bson import ObjectId

router = APIRouter()

@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_global_leaderboard(
    limit: int = 10,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Fetch global top players and current user's rank."""
    # Find top players based on XP
    top_users_cursor = db["users"].find({"role": "student"}).sort("xp", -1).limit(limit)
    top_users = await top_users_cursor.to_list(length=limit)
    
    leaderboard = []
    for i, user in enumerate(top_users):
        leaderboard.append(LeaderboardEntry(
            rank=i + 1,
            name=user["name"],
            xp=user.get("xp", 0),
            level=user.get("level", 1),
            badges_count=len(user.get("badges", []))
        ))
    
    # Calculate current user rank
    # Count how many users have more XP than the current user
    user_xp = current_user.get("xp", 0)
    higher_xp_count = await db["users"].count_documents({
        "role": "student",
        "xp": {"$gt": user_xp}
    })
    
    user_rank_entry = LeaderboardEntry(
        rank=higher_xp_count + 1,
        name=current_user["name"],
        xp=user_xp,
        level=current_user.get("level", 1),
        badges_count=len(current_user.get("badges", []))
    )
    
    return LeaderboardResponse(
        top_players=leaderboard,
        user_rank=user_rank_entry
    )

@router.get("/profile", response_model=UserProfileResponse)
async def get_gamified_profile(
    current_user=Depends(get_current_user)
):
    """Fetch the full gamified profile of the logged-in user."""
    return UserProfileResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        xp=current_user.get("xp", 0),
        level=current_user.get("level", 1),
        streak=current_user.get("streak", 0),
        badges=[Badge(**b) for b in current_user.get("badges", [])],
        last_login=current_user.get("last_login")
    )

@router.get("/leaderboard/course/{course_id}", response_model=LeaderboardResponse)
async def get_course_leaderboard(
    course_id: str,
    limit: int = 10,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Fetch top players specifically enrolled in a course."""
    # This assumes we track enrollment in the user doc or a separate collection
    # If using enrollment in user doc:
    query = {
        "role": "student",
        "enrolled_courses": ObjectId(course_id)
    }
    
    top_users_cursor = db["users"].find(query).sort("xp", -1).limit(limit)
    top_users = await top_users_cursor.to_list(length=limit)
    
    leaderboard = []
    for i, user in enumerate(top_users):
        leaderboard.append(LeaderboardEntry(
            rank=i + 1,
            name=user["name"],
            xp=user.get("xp", 0),
            level=user.get("level", 1),
            badges_count=len(user.get("badges", []))
        ))
        
    # User rank in course
    user_xp = current_user.get("xp", 0)
    higher_xp_count = await db["users"].count_documents({
        **query,
        "xp": {"$gt": user_xp}
    })
    
    return LeaderboardResponse(
        top_players=leaderboard,
        user_rank=LeaderboardEntry(
            rank=higher_xp_count + 1,
            name=current_user["name"],
            xp=user_xp,
            level=current_user.get("level", 1),
            badges_count=len(current_user.get("badges", []))
        )
    )
