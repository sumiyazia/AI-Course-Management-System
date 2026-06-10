from datetime import datetime, timedelta
from bson import ObjectId
from typing import List, Optional
from app.models.schemas import Badge

XP_PER_MATERIAL = 50
XP_PER_QUIZ = 100
XP_PER_EXAM = 200
XP_STREAK_BONUS = 20

def calculate_level(xp: int) -> int:
    """Simple level calculation: every 1000 XP is a level."""
    return (xp // 1000) + 1

async def award_xp(db, user_id: str, amount: int, reason: str):
    """Awards XP to a user and handles level up logic."""
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    
    current_xp = user.get("xp", 0)
    new_xp = current_xp + amount
    
    old_level = calculate_level(current_xp)
    new_level = calculate_level(new_xp)
    
    update_data = {
        "xp": new_xp,
        "level": new_level
    }
    
    # Logic for Level Up Badge or Notification could go here
    
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    return {"xp_gained": amount, "new_total": new_xp, "level_up": new_level > old_level}

async def update_streak(db, user_id: str):
    """Updates daily login streak and awards bonus XP if applicable."""
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    
    now = datetime.utcnow()
    last_login = user.get("last_login")
    streak = user.get("streak", 0)
    
    if not last_login:
        # First login ever
        streak = 1
        await award_xp(db, user_id, XP_STREAK_BONUS, "First Login")
    else:
        # Calculate time since last login
        delta = now.date() - last_login.date()
        
        if delta.days == 1:
            # Consecutive day!
            streak += 1
            await award_xp(db, user_id, XP_STREAK_BONUS, f"Daily Streak Day {streak}")
        elif delta.days > 1:
            # Streak broken
            streak = 1
            await award_xp(db, user_id, XP_STREAK_BONUS, "Streak Restorted")
        # If delta.days == 0, they already logged in today, do nothing to streak
            
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"streak": streak, "last_login": now}}
    )

async def check_and_award_badges(db, user_id: str, context_type: str, context_data: dict):
    """
    Checks if a user qualifies for any badges based on their actions.
    Types: 'submission', 'course_completion', 'streak'
    """
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    current_badges = [b["name"] for b in user.get("badges", [])]
    new_badges = []
    
    if context_type == "submission":
        percentage = context_data.get("percentage", 0)
        time_taken = context_data.get("time_taken") # in minutes
        time_limit = context_data.get("time_limit")
        
        # Rector's List Badge: 90%+ in an exam
        if percentage >= 90 and "Rector's List" not in current_badges:
            new_badges.append({
                "name": "Rector's List",
                "description": "Scored 90% or higher in an assessment.",
                "icon": "🏅",
                "awarded_at": datetime.utcnow()
            })
            
        # The Speedster Badge: Finished in less than 25% of the time limit
        if time_limit and time_taken and (time_taken <= time_limit * 0.25) and percentage >= 70:
            if "The Speedster" not in current_badges:
                new_badges.append({
                    "name": "The Speedster",
                    "description": "Finished an exam in record time with a passing grade.",
                    "icon": "⚡",
                    "awarded_at": datetime.utcnow()
                })

    if context_type == "streak":
        streak = context_data.get("streak", 0)
        if streak >= 7 and "Week Warrior" not in current_badges:
            new_badges.append({
                "name": "Week Warrior",
                "description": "Maintained a 7-day learning streak.",
                "icon": "🔥",
                "awarded_at": datetime.utcnow()
            })

    if new_badges:
        await db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"badges": {"$each": new_badges}}}
        )
        return new_badges
    
    return []
