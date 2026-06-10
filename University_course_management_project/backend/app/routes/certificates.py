from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
import uuid
from bson import ObjectId
from app.core.database import get_db
from app.core.security import get_current_user, require_teacher
from app.models.schemas import CertificateIssueRequest, CertificateResponse, MessageResponse

router = APIRouter()

def _fmt_cert(c) -> dict:
    return {
        "id": str(c["_id"]),
        "course_id": str(c["course_id"]),
        "course_title": c.get("course_title", ""),
        "student_id": str(c["student_id"]),
        "student_name": c.get("student_name", ""),
        "teacher_name": c.get("teacher_name", ""),
        "grade": c.get("grade", "Pass"),
        "issued_at": c["issued_at"],
        "verification_code": c.get("verification_code", "")
    }

@router.post("/issue", response_model=CertificateResponse)
async def issue_certificate(
    req: CertificateIssueRequest,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    """Teacher issues a certificate to a student for completing a course."""
    
    # 1. Verify teacher owns the course
    course = await db["courses"].find_one({"_id": ObjectId(req.course_id), "teacher_id": ObjectId(teacher["id"])})
    if not course:
        raise HTTPException(status_code=403, detail="You can only issue certificates for your own courses")
    
    # 2. Verify student is enrolled
    student = await db["users"].find_one({"_id": ObjectId(req.student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if req.course_id not in student.get("enrolled_courses", []):
        raise HTTPException(status_code=400, detail="Student is not enrolled in this course")

    # 3. Check if certificate already exists
    existing = await db["certificates"].find_one({
        "course_id": ObjectId(req.course_id),
        "student_id": ObjectId(req.student_id)
    })
    if existing:
        return _fmt_cert(existing)

    # 4. Create certificate
    verification_code = f"LMS-{uuid.uuid4().hex[:12].upper()}"
    
    cert_doc = {
        "course_id": ObjectId(req.course_id),
        "course_title": course["title"],
        "student_id": ObjectId(req.student_id),
        "student_name": student["name"],
        "teacher_id": ObjectId(teacher["id"]),
        "teacher_name": teacher["name"],
        "grade": req.grade,
        "issued_at": datetime.utcnow(),
        "verification_code": verification_code
    }
    
    result = await db["certificates"].insert_one(cert_doc)
    cert_doc["_id"] = result.inserted_id
    
    # Award bonus XP for course completion
    from app.services.gamification_service import award_xp
    await award_xp(db, req.student_id, 500, f"Course Completion: {course['title']}")
    
    return _fmt_cert(cert_doc)

@router.get("/verify/{code}", response_model=CertificateResponse)
async def verify_certificate(code: str, db=Depends(get_db)):
    """Public verification endpoint."""
    cert = await db["certificates"].find_one({"verification_code": code})
    if not cert:
        raise HTTPException(status_code=404, detail="Invalid certificate code")
    return _fmt_cert(cert)

@router.get("/student", response_model=List[CertificateResponse])
async def get_my_certificates(
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Students see their own certificates."""
    cursor = db["certificates"].find({"student_id": ObjectId(user["id"])})
    certs = await cursor.to_list(length=100)
    return [_fmt_cert(c) for c in certs]

@router.get("/course/{course_id}", response_model=List[CertificateResponse])
async def get_course_certificates(
    course_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Teacher sees certificates issued for a specific course."""
    cursor = db["certificates"].find({"course_id": ObjectId(course_id)})
    certs = await cursor.to_list(length=100)
    return [_fmt_cert(c) for c in certs]
@router.post("/{cert_id}/reset-progress", response_model=MessageResponse)
async def reset_student_progress(
    cert_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """
    After downloading a certificate, a student can reset their progress.
    This removes their enrollment and all submissions/evaluations for that course.
    """
    # 1. Verify certificate belongs to this student
    cert = await db["certificates"].find_one({"_id": ObjectId(cert_id)})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if str(cert["student_id"]) != user["id"]:
        raise HTTPException(status_code=403, detail="You can only reset your own course progress")

    course_id = cert["course_id"]
    student_id = cert["student_id"]

    # 2. Remove enrollment from user
    await db["users"].update_one(
        {"_id": student_id},
        {"$pull": {"enrolled_courses": str(course_id)}}
    )

    # 3. Delete all submissions for this student in this course
    await db["submissions"].delete_many({
        "course_id": course_id,
        "student_id": student_id
    })

    # 4. Delete all evaluations
    await db["evaluations"].delete_many({
        "course_id": course_id,
        "student_id": student_id
    })

    # 5. Decrement enrolled_count in courses
    await db["courses"].update_one(
        {"_id": course_id},
        {"$inc": {"enrolled_count": -1}}
    )

    return {"message": "Course progress has been reset successfully. You can now re-enroll."}
