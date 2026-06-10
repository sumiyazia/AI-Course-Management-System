import io
from pypdf import PdfReader
from app.services.groq_service import _call_groq
from typing import List

async def extract_text_from_pdf(file_content: bytes) -> str:
    """Extracts text from a PDF byte stream."""
    pdf = PdfReader(io.BytesIO(file_content))
    text = ""
    for page in pdf.pages:
        text += page.extract_text() + "\n"
    return text

async def get_rag_answer(question: str, course_materials: List[dict]) -> dict:
    """
    course_materials: list of {title: str, text: str}
    """
    # 1. Prepare context from materials
    context_blocks = []
    for m in course_materials:
        # We cap each material to avoid hitting Groq's token limits if they are huge
        # But usually context is 128k, so we can fit a lot.
        context_blocks.append(f"--- DOCUMENT: {m['title']} ---\n{m['text'][:10000]}") # 10k chars per doc for safety

    context_str = "\n\n".join(context_blocks)

    # 2. Prepare AI Prompt
    system_prompt = """You are a 'Course Material AI Interviewer'. 
Your task is to answer student questions based ONLY on the provided course materials.

STRICT RULES:
1. If the answer is NOT in the provided materials, say: 'I'm sorry, but that information is not covered in the course materials provided by the teacher.'
2. Always cite which document you are getting the information from (e.g., 'According to [Document Name], ...').
3. Keep answers concise, academic, and helpful.
4. If the student asks something unrelated to the course, politely refuse to answer.
"""

    user_msg = f"""STUDENT QUESTION: {question}

COURSE MATERIALS CONTEXT:
{context_str}

Please provide a helpful answer based on the context above.
"""
    
    answer = await _call_groq(system_prompt, user_msg)

    # 3. Simple source detection
    sources = []
    for m in course_materials:
        if m['title'] in answer:
            sources.append(m['title'])

    return {
        "answer": answer,
        "sources": sources if sources else [m['title'] for m in course_materials[:1]]
    }
