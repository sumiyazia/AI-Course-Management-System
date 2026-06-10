import httpx
import json
from app.core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

def _syllabus_system_prompt(course_outline: str) -> str:
    return f"""You are an academic AI assistant for a university course assessment system.

COURSE SYLLABUS (your ONLY allowed scope):
===
{course_outline}
===

STRICT RULES — follow these without exception:
1. You may ONLY generate assessment questions based on topics explicitly listed in the syllabus above.
2. If a request involves ANY topic NOT covered in the syllabus, return ONLY the out-of-scope JSON.
3. OUTPUT FORMAT: Respond ONLY with a valid JSON object. Do not include any introductory text, preambles, or markdown formatting outside the JSON itself.
4. VALIDATION: Ensure the JSON is perfectly formatted. Never include trailing commas at the end of lists or objects.
"""

async def _call_groq(system_prompt: str, user_message: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "max_tokens": 4096, # Increased for detailed feedback
        "temperature": 0.2, # Lower temperature for more stable JSON
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message}
        ],
        "response_format": {"type": "json_object"}
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

def _parse_json_response(raw: str) -> dict:
    """Safely parse JSON from AI response, handling markdown fences and surrounding text."""
    import re
    raw = raw.strip()
    
    # helper to escape unescaped quotes in string values
    def fix_unescaped_quotes(json_str):
        # This regex looks for text between "key": " and " and try to escape internal quotes
        # It's not perfect but handles 90% of AI casing errors
        def replace_internal_quotes(match):
            content = match.group(2)
            # Escape quotes that aren't already escaped
            fixed = re.sub(r'(?<!\\)"', r'\"', content)
            return f'{match.group(1)}"{fixed}"'
        
        # Look for patterns like : "..." and handle internal quotes
        return re.sub(r'(: \s*)"(.*)("(?=\s*[,\]\}]))', replace_internal_quotes, json_str, flags=re.DOTALL)

    # 1. Try to extract JSON from between first { and last }
    match = re.search(r'(\{.*\})', raw, re.DOTALL)
    if match:
        raw = match.group(0)
    
    # 2. Basic cleanup for common AI mistakes
    raw = re.sub(r',\s*([\}\]])', r'\1', raw) # Trailing commas
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Attempt more aggressive cleaning
        try:
            cleaned = fix_unescaped_quotes(raw)
            return json.loads(cleaned)
        except:
            # Fallback for markdown fences
            if raw.startswith("```"):
                lines = raw.split("\n")
                raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
            
            raw = re.sub(r',\s*([\}\]])', r'\1', raw)
            try:
                return json.loads(raw)
            except:
                # Last resort: try to replace single quotes with double quotes if AI used them
                try:
                    return json.loads(raw.replace("'", '"'))
                except:
                    # Re-raise the original for debugging
                    return json.loads(raw)

# ─── EXAM GENERATION ──────────────────────────────────────────────────────────

async def generate_exam(course_outline: str, instructions: dict) -> dict:
    """
    instructions: {
        num_questions: int,
        question_types: list[str],  # ["mcq", "short_answer", "essay"]
        difficulty: str,            # "easy" | "medium" | "hard"
        topic_focus: str | None
    }
    """
    num_q   = instructions.get("num_questions", 10)
    q_types = instructions.get("question_types", ["mcq", "short_answer"])
    diff    = instructions.get("difficulty", "medium")
    focus   = instructions.get("topic_focus", "")

    focus_note = f"Focus specifically on: {focus}." if focus else "Cover topics broadly across the syllabus."

    user_msg = f"""Generate a comprehensive {instructions.get("type", "exam").upper()} based on the syllabus.
    
SPECIFICATIONS:
- Total marks to follow: {num_q * 10} (distributed according to question depth)
- REQUIRED Number of questions: EXACTLY {num_q} (Do not generate more, do not generate less)
- ALLOWED Question types: {", ".join(q_types)}
- Difficulty level: {diff}
- {focus_note}

STRICT RULE: You MUST ONLY generate questions of the types specified above: ({", ".join(q_types)}). 
If "true_false" is requested, provide a clear statement with options ["True", "False"]. 
DO NOT use "mcq" if "true_false" is the only type requested.

JSON STRUCTURE (Return ONLY valid JSON):
{{
  "title": "Clear Exam Title",
  "total_marks": <sum of all question marks>,
  "estimated_duration_minutes": {num_q * 5},
  "questions": [
    {{
      "id": 1,
      "type": "one of {q_types}",
      "question": "The question text",
      "options": ["Option A", "Option B", "..."] (REQUIRED for mcq and true_false types only),
      "correct_answer": "The correct option or value",
      "marks": <marks>,
      "expected_answer_guide": "Key points for short_answer/essay",
      "topic": "Syllabus topic"
    }}
  ]
}}
"""
    system = _syllabus_system_prompt(course_outline)
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)


# ─── EVALUATION ───────────────────────────────────────────────────────────────

async def evaluate_submission(course_outline: str, questions: list, student_answers: list) -> dict:
    """
    questions: list of question dicts (from exam)
    student_answers: list of {"question_id": int, "answer": str}
    """
    qa_pairs = []
    for q in questions:
        ans_obj = next((a for a in student_answers if a["question_id"] == q["id"]), None)
        student_ans = ans_obj["answer"] if ans_obj else "(No answer provided)"
        qa_pairs.append({
            "id": q["id"],
            "type": q.get("type"),
            "question": q["question"],
            "student_answer": student_ans,
            "marks": q.get("marks", 0),
            "correct_answer": q.get("correct_answer"),
            "expected_answer_guide": q.get("expected_answer_guide"),
            "rubric": q.get("rubric"),
            "topic": q.get("topic")
        })

    user_msg = f"""Evaluate the following student answers based STRICTLY on the provided course syllabus.

Questions and Student Answers:
{json.dumps(qa_pairs, indent=2)}

Return ONLY valid JSON in this exact format:
{{
  "total_marks_available": <number>,
  "marks_obtained": <number>,
  "percentage": <number>,
  "grade": "A/B/C/D/F",
  "overall_feedback": "General feedback on performance",
  "plagiarism_summary": {{
    "is_flagged": true/false,
    "max_similarity_score": <number>,
    "notes": "Brief summary of any suspicious findings"
  }},
  "topic_performance": [
    {{ "topic": "Name", "score": <number>, "total": <number>, "feedback": "Brief note" }}
  ],
  "results": [
    {{
      "question_id": 1,
      "marks_awarded": <number>,
      "marks_available": <number>,
      "is_correct": true/false,
      "feedback": "Specific feedback for this answer",
      "correct_answer": "The correct answer or key points",
      "plagiarism_score": <percentage 0-100 indicating similarity to external/AI sources>,
      "plagiarism_reason": "Reason if high similarity (e.g. 'Match found in online documentation' or 'Highly structured AI pattern')"
    }}
  ]
}}
"""
    system = _syllabus_system_prompt(course_outline)
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)


# ─── ASSIGNMENT / QUIZ GENERATION ─────────────────────────────────────────────

async def generate_assignment(course_outline: str, instructions: dict) -> dict:
    task_type = instructions.get("type", "assignment")  # "assignment" or "quiz"
    topic     = instructions.get("topic", "")
    num_q     = instructions.get("num_questions", 5)
    diff      = instructions.get("difficulty", "medium")

    topic_note = f"Topic: {topic}" if topic else "Cover relevant syllabus topics."

    user_msg = f"""Generate an academic {task_type} with these specifications:
- Topic/Focus: {topic_note}
- EXACT number of questions/tasks: {num_q}
- Difficulty: {diff}
- Allowed types: {", ".join(instructions.get("question_types", ["mcq"]))}

STRICT COMPLIANCE: 
1. You MUST generate EXACTLY {num_q} questions. No more, no less.
2. Only use the requested types. If user asked for true_false, do NOT generate MCQs with 4 options.

Return ONLY valid JSON:
{{
  "title": "{task_type.capitalize()} Title",
  "instructions": "Helpful instructions",
  "total_marks": <total marks>,
  "tasks": [
    {{
      "id": 1,
      "type": "one of requested types",
      "question": "The question/task text",
      "options": ["List of options if mcq/true_false"],
      "correct_answer": "Answer",
      "marks": <marks>,
      "topic": "Related syllabus topic"
    }}
  ]
}}
"""
    system = _syllabus_system_prompt(course_outline)
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)


# ─── OUT-OF-SCOPE CHECK ───────────────────────────────────────────────────────

async def check_topic_in_syllabus(course_outline: str, topic: str) -> dict:
    user_msg = f"""Is the topic "{topic}" covered in the course syllabus?

Return ONLY valid JSON:
{{
  "in_syllabus": true/false,
  "related_topics": ["list of related topics from syllabus if any"],
  "message": "Brief explanation"
}}
"""
    system = _syllabus_system_prompt(course_outline)
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)
# ─── ANALYTICS & INSIGHTS ─────────────────────────────────────────────────────

async def analyze_course_performance(course_outline: str, evaluation_data: list) -> dict:
    """
    evaluation_data: list of results with topics, scores, and feedback
    """
    user_msg = f"""Analyze the following aggregated student performance data for this course. Identify trends, bottleneck topics, and provide specific instructional recommendations.
    
SYLLABUS CONTEXT:
{course_outline}

PERFORMANCE DATA (Aggregated from multiple evaluations):
{json.dumps(evaluation_data, indent=2)}

Return ONLY valid JSON in this exact format:
{{
  "overall_performance_summary": "High level analysis of how students are doing",
  "bottleneck_topics": [
    {{
      "topic": "Specific syllabus topic",
      "average_score_percentage": <number>,
      "student_struggle_count": <number of students who failed this topic>,
      "recommendation": "What the teacher should do differently (e.g., 'Review pointers in lecture 5', 'Add more practice for recursion')"
    }}
  ],
  "suggested_actions": ["Action 1", "Action 2"]
}}
"""
    system = "You are an expert Educational Data Analyst. Your goal is to help teachers improve their courses by identifying where students struggle."
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)


async def generate_remedial_quiz(course_outline: str, failed_questions_context: list) -> dict:
    """
    failed_questions_context: list of {question, student_answer, correct_answer, feedback, topic}
    """
    user_msg = f"""Generate a personalized REMEDIAL QUIZ (5 questions) to help a student master topics they previously failed.
    
THE TOPICS TO FOCUS ON (Based on past failures):
{json.dumps(failed_questions_context, indent=2)}

SYLLABUS CONTEXT:
{course_outline}

STRICT SPECIFICATIONS:
- Number of questions: EXACTLY 5
- Purpose: Bridge the gap in understanding for the specific failed topics.
- Type: mix of MCQ and True/False.

Return ONLY valid JSON:
{{
  "title": "Remedial Mastery Quiz",
  "topic_focus": "The specific topics being addressed",
  "questions": [
    {{
      "id": 1,
      "type": "mcq/true_false",
      "question": "Question text",
      "options": ["A", "B", "..."],
      "correct_answer": "Answer",
      "marks": 2,
      "explanation": "Brief explanation of WHY this is correct to help learning",
      "topic": "Related syllabus topic"
    }}
  ]
}}
"""
    system = _syllabus_system_prompt(course_outline)
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)


async def generate_study_guide(course_outline: str, topic_focus: str = "") -> dict:
    focus_note = f"Concentrate specifically on: {topic_focus}" if topic_focus else "Provide a broad summary of the entire syllabus."
    
    user_msg = f"""Generate a structured, high-premium STUDY GUIDE ('Cheat Sheet') for students.
    
{focus_note}

SYLLABUS:
{course_outline}

Return ONLY valid JSON in this exact format:
{{
  "title": "Ultimate Study Guide: [Course/Topic Name]",
  "summary": "Executive summary of the course core goals",
  "key_concepts": [
    {{ "concept": "Name", "explanation": "Clear, concise academic explanation", "importance": "Why this matters" }}
  ],
  "important_terms": [
    {{ "term": "Term", "definition": "Academic definition" }}
  ],
  "practice_prompts": ["Active recall question 1", "Active recall question 2"],
  "exam_tips": ["Tip 1", "Tip 2"]
}}
"""
    system = "You are a professional academic tutor who creates high-quality, dense, and effective study materials for university students."
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)

async def generate_course_roadmap(course_outline: str) -> dict:
    """
    Parses a syllabus/outline into a series of logical modules/milestones.
    """
    user_msg = f"""Deconstruct the following course syllabus into a logical, sequential LEARNING ROADMAP.
    
SYLLABUS:
{course_outline}

STRICT SPECIFICATIONS:
- Group related topics into 5-8 "Modules" or "Learning Milestones".
- Module IDs should be "module_1", "module_2", etc. in order.
- For each module, identify:
    1. A clear title.
    2. A list of 3-5 specific topics covered.
    3. The absolute prerequisites (which other module titles must be completed first).
    4. A "Mastery Task" description (what they should do to unlock the next).

Return ONLY valid JSON in this exact format:
{{
  "course_title": "Title",
  "modules": [
    {{
      "id": "module_1",
      "title": "Module Title",
      "topics": ["Topic A", "Topic B"],
      "description": "Short summary of what is learned here",
      "prerequisites": [],
      "mastery_task": "Description of the requirement to unlock the next module"
    }}
  ]
}}
"""
    system = "You are an expert instructional designer and curriculum architect. Your goal is to turn a flat syllabus into a dynamic, game-like character progression tree."
    raw = await _call_groq(system, user_msg)
    return _parse_json_response(raw)
