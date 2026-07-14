import os
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import google.generativeai as genai

from backend.app.api import deps
from backend.app.db.models import Machine, SensorData, Production, QualityInspection, MaintenanceLog, Prediction, Alert

router = APIRouter()

# Schema definition
class ChatQuery(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

# Retrieve Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your_gemini_api_key_here")

def get_sql_context(query_text: str, db: Session) -> str:
    """Intelligently routes natural language intents, queries database tables, and structures context."""
    query_lower = query_text.lower()
    
    # 1. INTENT: Predictive Maintenance / Health Scores
    if any(k in query_lower for k in ["maintenance", "health", "risk", "predict", "fail"]):
        machines = db.query(Machine).all()
        context = "### Shop-Floor Machinery Health Inferences:\n"
        for m in machines:
            pred = db.query(Prediction).filter(
                Prediction.machine_id == m.id
            ).order_by(Prediction.timestamp.desc()).first()
            
            score = round(float(pred.health_score), 1) if pred else 100.0
            fail_prob = round(float(pred.failure_probability) * 100.0, 1) if pred else 0.0
            rec = pred.recommendation if pred else "Proceed with nominal standard maintenance checkups."
            
            context += f"* **{m.name}** (Type: {m.type}, Status: {m.status}):\n"
            context += f"  - Health Score: {score}%\n"
            context += f"  - Failure Prob: {fail_prob}%\n"
            context += f"  - AI Action Recommendation: {rec}\n"
        return context

    # 2. INTENT: Production yields, OEE scores
    elif any(k in query_lower for k in ["production", "yield", "parts", "oee", "performance", "shift"]):
        recent_prod = db.query(
            func.sum(Production.production_count).label("production_yield"),
            func.sum(Production.defect_count).label("defects"),
            func.avg(Production.oee_score).label("avg_oee")
        ).first()
        
        yield_count = recent_prod.production_yield or 0
        defects = recent_prod.defects or 0
        oee = round(float(recent_prod.avg_oee or 0.0), 1)
        defect_rate = round((defects / yield_count) * 100, 2) if yield_count > 0 else 0.0
        
        context = "### Production Performance Report (Recent Period):\n"
        context += f"* **Total Production Output**: {yield_count:,} units\n"
        context += f"* **Total Defects / Scraps**: {defects:,} units\n"
        context += f"* **Defect Rate**: {defect_rate}%\n"
        context += f"* **Plant Overall Equipment Effectiveness (OEE) Average**: {oee}%\n"
        return context

    # 3. INTENT: Defect categorization & Quality Inspections
    elif any(k in query_lower for k in ["defect", "quality", "crack", "label", "dimensions"]):
        inspections = db.query(
            QualityInspection.defect_type,
            func.count(QualityInspection.id).label("count")
        ).group_by(QualityInspection.defect_type).all()
        
        context = "### Quality Control Defect Categories Breakdowns:\n"
        total_defects = 0
        for category, count in inspections:
            if category != "NONE":
                context += f"* **{category.replace('_', ' ')}**: {count} parts flagged\n"
                total_defects += count
                
        if total_defects == 0:
            context += "No defects or anomalies have been flagged by the computer vision systems."
        return context

    # 4. INTENT: Downtime duration & costs
    elif any(k in query_lower for k in ["downtime", "cost", "technician", "duration", "spend"]):
        logs = db.query(MaintenanceLog).order_by(MaintenanceLog.log_date.desc()).limit(5).all()
        total_cost = db.query(func.sum(MaintenanceLog.cost)).scalar() or 0.0
        total_hours = db.query(func.sum(MaintenanceLog.duration_hours)).scalar() or 0.0
        
        context = "### Machinery Downtime and Maintenance Spend Summary:\n"
        context += f"* **Cumulative Financial Spend**: ${total_cost:,.2f}\n"
        context += f"* **Cumulative Downtime Duration**: {total_hours:.1f} hours\n"
        context += "* **Recent Work Logs Details**:\n"
        for log in logs:
            context += f"  - {log.log_date.strftime('%Y-%m-%d')}: Machine ID {log.machine_id} was down for {log.duration_hours} hrs. Cost: ${log.cost:.2f}. Tech: {log.technician}. Note: {log.description}\n"
        return context

    # 5. DEFAULT: General Factory Summary
    else:
        machines_count = db.query(Machine).count()
        offline = db.query(Machine).filter(Machine.status == "OFFLINE").count()
        alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
        
        context = "### Global Smart Factory Operational Status Summary:\n"
        context += f"* **Total Assets Installed**: {machines_count}\n"
        context += f"* **Assets Offline / Maintenance**: {offline}\n"
        context += f"* **Active Alarms / Warnings**: {alerts}\n"
        return context

@router.post("/query", response_model=ChatResponse)
def query_factory_assistant(
    query_in: ChatQuery,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Chat query endpoint running Text-to-SQL logic and generating a RAG response using Gemini or offline Markdown templates."""
    query_text = query_in.query
    
    # 1. Retrieve SQL database context
    sql_context = get_sql_context(query_text, db)
    
    # 2. Check for live Gemini API Key
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = (
                "You are 'Antigravity AI', an expert Industry 4.0 factory optimization assistant. "
                "You have direct database access. Use the SQL database context provided below to formulate a highly professional, "
                "well-structured natural language answer to the user's question.\n\n"
                f"--- SQL DATABASE CONTEXT ---\n{sql_context}\n\n"
                f"--- USER QUESTION ---\n{query_text}\n\n"
                "Format your response cleanly using markdown (tables, bold text, bullet points). "
                "Do not mention that you queried a database or got context; present it naturally as if you monitor the factory lines live."
            )
            
            response = model.generate_content(prompt)
            return {"response": response.text}
            
        except Exception as e:
            # Fallback to local NLP summarizer if API fails
            print(f"Gemini API execution error: {e}. Falling back to offline report parser.")
            
    # 3. Offline fall-back: Format clean markdown reports programmatically
    offline_response = (
        f"### Antigravity AI Assistant (Offline Diagnostics Mode)\n\n"
        f"Analyzed your question: *\"{query_text}\"*\n\n"
        f"Direct database query returned the following live factory context:\n\n"
        f"{sql_context}\n\n"
        f"**System Diagnostic Notes**:\n"
        f"* Recommendations are generated programmatically using trained Random Forest inferences and telemetry rules.\n"
        f"* Configure your `GEMINI_API_KEY` inside `backend/.env` to enable full Generative AI capabilities."
    )
    
    return {"response": offline_response}
