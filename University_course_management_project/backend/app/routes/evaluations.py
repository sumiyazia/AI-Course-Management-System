from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from app.core.security import get_current_user, require_teacher
from app.core.database import get_db
from app.services.groq_service import evaluate_submission
from app.services.gamification_service import award_xp, check_and_award_badges, XP_PER_EXAM, XP_PER_QUIZ

router = APIRouter()

def _fmt_eval(e) -> dict:
    return {
        "id":                    str(e["_id"]),
        "submission_id":         str(e["submission_id"]),
        "student_name":          e.get("student_name", ""),
        "exam_title":            e.get("exam_title", ""),
        "total_marks_available": e.get("total_marks_available", 0),
        "marks_obtained":        e.get("marks_obtained", 0),
        "percentage":            e.get("percentage", 0),
        "grade":                 e.get("grade", ""),
        "overall_feedback":      e.get("overall_feedback", ""),
        "plagiarism_summary":    e.get("plagiarism_summary", {}),
        "topic_performance":     e.get("topic_performance", []),
        "results":               e.get("results", []),
        "evaluated_at":          e["evaluated_at"],
    }


@router.post("/evaluate/{submission_id}", summary="Teacher: AI-evaluate a submission")
async def evaluate(
    submission_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    # Load submission
    sub = await db["submissions"].find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.get("status") == "evaluated":
        raise HTTPException(status_code=400, detail="Already evaluated")

    # Load exam (with correct answers — teacher-level access)
    exam = await db["exams"].find_one({"_id": sub["exam_id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Load course outline
    course = await db["courses"].find_one({"_id": exam["course_id"]})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Call Groq
    questions       = exam.get("questions", [])
    student_answers = sub.get("answers", [])
    ai_result       = await evaluate_submission(course["course_outline"], questions, student_answers)

    # Save evaluation
    eval_doc = {
        "submission_id":         ObjectId(submission_id),
        "exam_id":               exam["_id"],
        "exam_title":            exam.get("title", ""),
        "course_id":             course["_id"],
        "student_id":            sub["student_id"],
        "student_name":          sub.get("student_name", ""),
        "total_marks_available": ai_result.get("total_marks_available", 0),
        "marks_obtained":        ai_result.get("marks_obtained", 0),
        "percentage":            ai_result.get("percentage", 0),
        "grade":                 ai_result.get("grade", ""),
        "overall_feedback":      ai_result.get("overall_feedback", ""),
        "plagiarism_summary":    ai_result.get("plagiarism_summary", {}),
        "topic_performance":     ai_result.get("topic_performance", []),
        "results":               ai_result.get("results", []),
        "evaluated_at":          datetime.utcnow(),
    }
    result = await db["evaluations"].insert_one(eval_doc)
    eval_doc["_id"] = result.inserted_id

    # Mark submission as evaluated
    await db["submissions"].update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"status": "evaluated", "evaluation_id": result.inserted_id}}
    )

    # Award Gamification XP & Badges
    base_xp = XP_PER_EXAM if exam.get("assessment_type") == "exam" else XP_PER_QUIZ
    xp_to_award = base_xp + int(ai_result.get("percentage", 0))
    await award_xp(db, str(sub["student_id"]), xp_to_award, f"Evaluation of {exam.get('title', 'Assessment')}")

    context_data = {
        "percentage": ai_result.get("percentage", 0),
        "time_taken": sub.get("time_taken"),
        "time_limit": exam.get("time_limit")
    }
    await check_and_award_badges(db, str(sub["student_id"]), "submission", context_data)

    return {"message": "Evaluation complete", "evaluation": _fmt_eval(eval_doc)}


@router.post("/evaluate-all/{exam_id}", summary="Teacher: AI-evaluate ALL pending submissions for an exam")
async def evaluate_all(
    exam_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    exam = await db["exams"].find_one({"_id": ObjectId(exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    course = await db["courses"].find_one({"_id": exam["course_id"]})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    pending_subs = await db["submissions"].find({
        "exam_id": ObjectId(exam_id),
        "status":  "pending"
    }).to_list(length=500)

    if not pending_subs:
        return {"message": "No pending submissions", "evaluated": 0}

    evaluated = []
    errors     = []

    for sub in pending_subs:
        try:
            print(f"Evaluating submission {sub['_id']} for student {sub['student_name']}...")
            ai_result = await evaluate_submission(
                course["course_outline"],
                exam.get("questions", []),
                sub.get("answers", [])
            )
            eval_doc = {
                "submission_id":         sub["_id"],
                "exam_id":               exam["_id"],
                "exam_title":            exam.get("title", ""),
                "course_id":             course["_id"],
                "student_id":            sub["student_id"],
                "student_name":          sub.get("student_name", ""),
                "total_marks_available": ai_result.get("total_marks_available", 0),
                "marks_obtained":        ai_result.get("marks_obtained", 0),
                "percentage":            ai_result.get("percentage", 0),
                "grade":                 ai_result.get("grade", ""),
                "overall_feedback":      ai_result.get("overall_feedback", ""),
                "plagiarism_summary":    ai_result.get("plagiarism_summary", {}),
                "topic_performance":     ai_result.get("topic_performance", []),
                "results":               ai_result.get("results", []),
                "evaluated_at":          datetime.utcnow(),
            }
            res = await db["evaluations"].insert_one(eval_doc)
            await db["submissions"].update_one(
                {"_id": sub["_id"]},
                {"$set": {"status": "evaluated", "evaluation_id": res.inserted_id}}
            )

            # Award Gamification XP & Badges
            try:
                base_xp = XP_PER_EXAM if exam.get("assessment_type") == "exam" else XP_PER_QUIZ
                xp_to_award = base_xp + int(ai_result.get("percentage", 0))
                await award_xp(db, str(sub["student_id"]), xp_to_award, f"Auto-Evaluation of {exam.get('title', 'Assessment')}")

                await check_and_award_badges(db, str(sub["student_id"]), "submission", {
                    "percentage": ai_result.get("percentage", 0),
                    "time_taken": sub.get("time_taken"),
                    "time_limit": exam.get("time_limit")
                })
            except Exception as gx:
                print(f"Gamification update failed for {sub['_id']}: {str(gx)}")

            evaluated.append(str(sub["_id"]))
            print(f"Successfully evaluated {sub['_id']}")
        except Exception as e:
            import traceback
            print(f"EVALUATION ERROR for submission {sub['_id']}: {str(e)}")
            traceback.print_exc()
            errors.append({"submission_id": str(sub["_id"]), "error": str(e)})

    return {
        "message":   f"Evaluated {len(evaluated)} submissions",
        "evaluated": len(evaluated),
        "errors":    errors
    }


@router.get("/submission/{submission_id}", summary="Get evaluation result for a submission")
async def get_evaluation_by_submission(
    submission_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    sub = await db["submissions"].find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Students can only see their own
    if current_user["role"] == "student" and str(sub["student_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    ev = await db["evaluations"].find_one({"submission_id": ObjectId(submission_id)})
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not yet available")

    return _fmt_eval(ev)


@router.get("/exam/{exam_id}/results", summary="Teacher: Get all results for an exam")
async def exam_results(
    exam_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    evals = await db["evaluations"].find(
        {"exam_id": ObjectId(exam_id)}
    ).to_list(length=500)

    return {
        "total":   len(evals),
        "results": [_fmt_eval(e) for e in evals]
    }
