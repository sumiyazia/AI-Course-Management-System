from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from app.models.schemas import CourseCreate, CourseResponse, EnrollRequest, TopicCheckRequest
from app.core.security import get_current_user, require_teacher
from app.core.database import get_db
from app.services.groq_service import check_topic_in_syllabus

router = APIRouter()

def _fmt_course(c, teacher_name="") -> dict:
    return {
        "id":             str(c["_id"]),
        "title":          c["title"],
        "description":    c.get("description", ""),
        "course_outline": c["course_outline"],
        "teacher_id":     str(c["teacher_id"]),
        "teacher_name":   c.get("teacher_name", teacher_name),
        "created_at":     c["created_at"],
        "enrolled_count": c.get("enrolled_count", 0),
    }


@router.post("/", summary="Teacher: Create a new course")
async def create_course(
    data: CourseCreate,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    doc = {
        "title":          data.title,
        "description":    data.description,
        "course_outline": data.course_outline,
        "teacher_id":     ObjectId(teacher["id"]),
        "teacher_name":   teacher["name"],
        "created_at":     datetime.utcnow(),
        "enrolled_count": 0,
    }
    result = await db["courses"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"message": "Course created", "course": _fmt_course(doc)}


@router.get("/", summary="List all courses")
async def list_courses(db=Depends(get_db), current_user=Depends(get_current_user)):
    courses = await db["courses"].find().to_list(length=100)
    return [_fmt_course(c) for c in courses]


@router.get("/my", summary="Get my courses (Created or Enrolled)")
async def my_courses(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] == "teacher":
        query = {"teacher_id": ObjectId(current_user["id"])}
    else:
        # Students: find courses they are enrolled in
        enrolled_ids = current_user.get("enrolled_courses", [])
        query = {"_id": {"$in": [ObjectId(cid) for cid in enrolled_ids]}}
        
    courses = await db["courses"].find(query).to_list(length=100)
    return [_fmt_course(c) for c in courses]


@router.get("/{course_id}", summary="Get course detail")
async def get_course(course_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return _fmt_course(course)


@router.post("/enroll", summary="Student: Enroll in a course")
async def enroll(
    data: EnrollRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(data.course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrolled = current_user.get("enrolled_courses", [])
    pending = current_user.get("pending_courses", [])
    if data.course_id in enrolled or data.course_id in pending:
        raise HTTPException(status_code=400, detail="Already enrolled or pending approval")

    await db["users"].update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$addToSet": {"pending_courses": data.course_id}}
    )
    await db["courses"].update_one(
        {"_id": ObjectId(data.course_id)},
        {"$addToSet": {"pending_students": {
            "student_id": current_user["id"],
            "student_name": current_user["name"]
        }}}
    )
    return {"message": f"Enrollment request sent for '{course['title']}'. Waiting for teacher approval."}


@router.post("/check-topic", summary="Check if topic is in syllabus")
async def check_topic(
    data: TopicCheckRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(data.course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    result = await check_topic_in_syllabus(course["course_outline"], data.topic)
    return result

@router.get("/{course_id}/pending", summary="Teacher: Get pending students for a course")
async def get_pending_students(
    course_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course["teacher_id"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your course")
    
    return course.get("pending_students", [])

class ApprovalRequest(BaseModel):
    student_id: str
    approve: bool

@router.post("/{course_id}/approve", summary="Teacher: Approve or reject enrollment")
async def approve_enrollment(
    course_id: str,
    data: ApprovalRequest,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course["teacher_id"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your course")

    # Remove from pending_students
    await db["courses"].update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"pending_students": {"student_id": data.student_id}}}
    )
    # Remove from student's pending_courses
    await db["users"].update_one(
        {"_id": ObjectId(data.student_id)},
        {"$pull": {"pending_courses": course_id}}
    )

    if data.approve:
        # Enrol properly
        await db["users"].update_one(
            {"_id": ObjectId(data.student_id)},
            {"$addToSet": {"enrolled_courses": course_id}}
        )
        await db["courses"].update_one(
            {"_id": ObjectId(course_id)},
            {"$inc": {"enrolled_count": 1}}
        )
        return {"message": "Enrollment approved"}
    else:
        return {"message": "Enrollment rejected"}

@router.get("/{course_id}/students", summary="Teacher: Get all enrolled students")
async def get_enrolled_students(
    course_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course["teacher_id"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your course")

    # Find students who have this course_id in their enrolled_courses
    students = await db["users"].find({
        "role": "student",
        "enrolled_courses": course_id
    }).to_list(length=1000)

    return [{
        "id": str(s["_id"]),
        "name": s["name"],
        "email": s["email"]
    } for s in students]

@router.delete("/{course_id}/students/{student_id}", summary="Teacher: Unenroll a student")
async def unenroll_student(
    course_id: str,
    student_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course["teacher_id"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your course")

    # Remove course from student's list
    await db["users"].update_one(
        {"_id": ObjectId(student_id)},
        {"$pull": {"enrolled_courses": course_id}}
    )
    # Decrement enrolled_count
    await db["courses"].update_one(
        {"_id": ObjectId(course_id)},
        {"$inc": {"enrolled_count": -1}}
    )
    return {"message": "Student unenrolled"}

@router.delete("/{course_id}", summary="Teacher: Delete a course")
async def delete_course(
    course_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course["teacher_id"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your course")

    # 1. Delete the course document
    await db["courses"].delete_one({"_id": ObjectId(course_id)})
    # 2. Delete all exams associated with the course
    await db["exams"].delete_many({"course_id": ObjectId(course_id)})
    # 3. Remove from all students' enrolled/pending lists
    await db["users"].update_many(
        {},
        {"$pull": {"enrolled_courses": course_id, "pending_courses": course_id}}
    )
    return {"message": "Course and all related data deleted"}
    
@router.get("/{course_id}/roadmap", summary="Get a structured AI roadmap for the course")
async def get_roadmap(
    course_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if roadmap already exists in the course document
    if "roadmap" in course:
        roadmap = course["roadmap"]
    else:
        # Generate it using AI
        from app.services.groq_service import generate_course_roadmap
        roadmap_data = await generate_course_roadmap(course["course_outline"])
        
        # Save it to the course for future use
        await db["courses"].update_one(
            {"_id": ObjectId(course_id)},
            {"$set": {"roadmap": roadmap_data}}
        )
        roadmap = roadmap_data

    # Now calculate progress for the current student
    if current_user["role"] == "student":
        # 1. Fetch evaluated exams/quizzes
        evals = await db["evaluations"].find({
            "course_id": ObjectId(course_id),
            "student_id": ObjectId(current_user["id"])
        }).to_list(length=100)
        
        # 2. Map progress
        completed_prev = True
        for i, mod in enumerate(roadmap.get("modules", [])):
            # Check if topics are covered in evaluations with passing grade
            passing_eval = any(
                e.get("percentage", 0) >= 50 and 
                any(t in mod["topics"] for t in [r.get("topic") for r in e.get("results", [])])
                for e in evals
            )
            
            if passing_eval:
                mod["status"] = "completed"
                completed_prev = True
            elif completed_prev:
                mod["status"] = "unlocked"
                completed_prev = False
            else:
                mod["status"] = "locked"
                completed_prev = False

    return roadmap

