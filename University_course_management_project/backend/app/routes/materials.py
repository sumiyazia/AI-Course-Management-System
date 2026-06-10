from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime
from bson import ObjectId
from typing import List
from app.core.security import get_current_user, require_teacher
from app.core.database import get_db
from app.models.schemas import MaterialResponse, ChatRequest, ChatResponse, MessageResponse
from app.services.rag_service import extract_text_from_pdf, get_rag_answer
from app.services.gamification_service import award_xp, XP_PER_MATERIAL

router = APIRouter()
print("MATERIALS ROUTER LOADED")

@router.post("/upload/{course_id}", response_model=MessageResponse, summary="Teacher: Upload course material (PDF)")
async def upload_material(
    course_id: str,
    file: UploadFile = File(...),
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported currently")

    # 1. Read and extract text
    content = await file.read()
    try:
        text = await extract_text_from_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    # 2. Save info to DB
    material_doc = {
        "course_id": ObjectId(course_id),
        "title": file.filename,
        "text": text,
        "file_type": "pdf",
        "size_bytes": len(content),
        "upload_date": datetime.utcnow(),
        "uploaded_by": ObjectId(teacher["id"])
    }
    
    result = await db["materials"].insert_one(material_doc)
    
    return {"message": f"Material '{file.filename}' uploaded and processed successfully", "data": {"id": str(result.inserted_id)}}

@router.get("/course/{course_id}", response_model=List[MaterialResponse], summary="Get all materials for a course")
async def list_materials(
    course_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    materials = await db["materials"].find({"course_id": ObjectId(course_id)}).to_list(length=100)
    
    return [
        {
            "id": str(m["_id"]),
            "course_id": str(m["course_id"]),
            "title": m["title"],
            "file_type": m["file_type"],
            "upload_date": m["upload_date"],
            "size_bytes": m.get("size_bytes", 0)
        } for m in materials
    ]

@router.post("/chat", response_model=ChatResponse, summary="Student: Chat with course materials")
async def chat_with_materials(
    req: ChatRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    # 0. Check enrollment permissions
    if current_user["role"] == "student":
        enrolled_ids = current_user.get("enrolled_courses", [])
        if ObjectId(req.course_id) not in enrolled_ids:
            raise HTTPException(status_code=403, detail="Access denied. You must be enrolled in this course to chat with its materials.")

    # 1. Fetch materials
    query = {"course_id": ObjectId(req.course_id)}
    if req.material_id:
        query["_id"] = ObjectId(req.material_id)
        
    materials = await db["materials"].find(query).to_list(length=10) # limit to top 10 for context window
    
    if not materials:
        raise HTTPException(status_code=404, detail="No study materials available for this course yet. Please ask your teacher to upload PDFs first!")

    # 2. Get AI answer
    rag_result = await get_rag_answer(req.question, materials)
    
    return rag_result

@router.delete("/{material_id}", response_model=MessageResponse, summary="Teacher: Delete a material")
async def delete_material(
    material_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    result = await db["materials"].delete_one({"_id": ObjectId(material_id), "uploaded_by": ObjectId(teacher["id"])})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found or access denied")
        
    return {"message": "Material deleted successfully"}

@router.post("/read/{material_id}", response_model=MessageResponse, summary="Student: Mark material as read to earn XP")
async def mark_as_read(
    material_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    # Check if already read
    user_id = ObjectId(current_user["id"])
    already_read = await db["users"].find_one({
        "_id": user_id,
        "read_materials": ObjectId(material_id)
    })
    
    if already_read:
        return {"message": "Material already read. No extra XP awarded."}
    
    # Update user: add to read_materials list and award XP
    await db["users"].update_one(
        {"_id": user_id},
        {"$push": {"read_materials": ObjectId(material_id)}}
    )
    
    xp_result = await award_xp(db, current_user["id"], XP_PER_MATERIAL, f"Read material {material_id}")
    
    return {"message": "Success! You earned XP.", "data": xp_result}
