from firebase_functions import storage_fn, scheduler_fn
from firebase_admin import initialize_app, firestore
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List
import os

# Initialize Firebase Admin SDK
initialize_app()

class LineItem(BaseModel):
    name: str = Field(description="Name or description of the item")
    quantity: int = Field(description="Quantity of the item purchased")
    price: float = Field(description="Unit price of the item")

class InvoiceExtraction(BaseModel):
    vendor_name: str = Field(description="Name of the merchant or vendor")
    total_amount: float = Field(description="Total amount of the invoice/receipt")
    items: List[LineItem] = Field(description="List of items extracted from the invoice")

class ResumeExtraction(BaseModel):
    candidate_name: str = Field(description="Full name of the candidate")
    email: str = Field(description="Contact email of the candidate")
    phone: str = Field(description="Contact phone number of the candidate")
    years_of_experience: float = Field(description="Total years of professional experience extracted")
    core_skills: List[str] = Field(description="List of core technical or professional skills")
    ai_skills_match_score: int = Field(description="Overall match score (0-100) compared against the Target Job Description")
    evaluation_summary: str = Field(description="A brief paragraph summarizing the candidate profile and suitability")

class DealPrediction(BaseModel):
    id: str = Field(description="The unique document ID of the opportunity")
    ai_lead_score: int = Field(description="Predicted closure probability score from 0 to 100")
    ai_churn_risk: int = Field(description="Predicted risk of customer attrition or losing the deal from 0 to 100")
    reasoning: str = Field(description="Brief analysis on the deal state, velocity, and customer touchpoints")

class BatchScoringResponse(BaseModel):
    predictions: List[DealPrediction] = Field(description="Scoring predictions for all opportunities requested")

@storage_fn.on_object_finalized()
def handle_storage_upload(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]) -> None:
    """
    Consolidated storage trigger. Selects appropriate parser (Invoice/Receipt vs. Resume PDF)
    based on object prefix and content.
    """
    bucket_name = event.data.bucket
    file_name = event.data.name
    mime_type = event.data.content_type

    print(f"File upload detected: {file_name} in {bucket_name} ({mime_type})")

    # Guard clause
    if not mime_type or not (mime_type.startswith("image/") or mime_type == "application/pdf"):
        print(f"Skipping unsupported file format: {mime_type}")
        return

    # Check if this is a resume based on folder structure or naming convention
    if "resume" in file_name.lower() or file_name.startswith("resumes/") or "applicant" in file_name.lower():
        process_applicant_resume(bucket_name, file_name, mime_type)
    else:
        process_vendor_invoice(bucket_name, file_name, mime_type)

def process_vendor_invoice(bucket_name: str, file_name: str, mime_type: str) -> None:
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    from firebase_admin import storage
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(file_name)
    file_bytes = blob.download_as_bytes()

    print(f"Processing vendor invoice: {file_name}")

    response = client.models.generate_content(
        model='gemini-3.8-flash',
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            "Analyze this invoice/receipt document. Extract the vendor name, total amount, and line items into the structured schema."
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=InvoiceExtraction,
        ),
    )

    extracted_data = InvoiceExtraction.model_validate_json(response.text.strip())
    db = firestore.client()

    order_id = f"ai_scan_{os.urandom(4).hex()}"
    draft_order = {
        "id": order_id,
        "vendor": extracted_data.vendor_name,
        "items": [
            {
                "productId": f"ai_scanned_{i}",
                "name": item.name,
                "quantity": item.quantity,
                "price": item.price
            } for i, item in enumerate(extracted_data.items)
        ],
        "totalAmount": extracted_data.total_amount,
        "status": "draft",
        "cashierName": "Gemini AI Ingestion Pipeline",
        "cashierUid": "ai_pipeline_system",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }

    db.collection("pos_orders").document(order_id).set(draft_order)
    print(f"Successfully processed invoice {file_name}. Order draft {order_id} created.")

def process_applicant_resume(bucket_name: str, file_name: str, mime_type: str) -> None:
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    from firebase_admin import storage
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(file_name)
    file_bytes = blob.download_as_bytes()

    print(f"Processing applicant resume PDF: {file_name}")

    # Standard corporate target job description for matching context
    job_description = """
    We are hiring an Enterprise ERP Systems Specialist and Sales Administrator.
    Core Requirements: 
    - Proven experience with NoSQL / Relational databases (Firebase, PostgreSQL).
    - Web frontend development (React, Next.js) and cloud services.
    - POS and Inventory accounting workflow management.
    - Excellent communication and CRM coordination skills.
    """

    prompt = f"""
    Please analyze this resume PDF.
    Extract the candidate's years of experience, core skills, and contact information.
    Compare these skills against the following target job description and generate an overall compatibility score (ai_skills_match_score) between 0 and 100:
    
    JOB DESCRIPTION:
    {job_description}
    """

    response = client.models.generate_content(
        model='gemini-3.8-flash',
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            prompt
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ResumeExtraction,
        ),
    )

    extracted_data = ResumeExtraction.model_validate_json(response.text.strip())
    db = firestore.client()

    applicant_id = f"app_{os.urandom(4).hex()}"
    applicant_doc = {
        "id": applicant_id,
        "name": extracted_data.candidate_name,
        "email": extracted_data.email,
        "phone": extracted_data.phone,
        "yearsOfExperience": extracted_data.years_of_experience,
        "skills": extracted_data.core_skills,
        "ai_skills_match_score": extracted_data.ai_skills_match_score,
        "ai_evaluation_summary": extracted_data.evaluation_summary,
        "resumeFile": file_name,
        "status": "New",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }

    db.collection("applicants").document(applicant_id).set(applicant_doc)
    print(f"Successfully parsed resume {file_name}. Match score: {extracted_data.ai_skills_match_score}. Applicant doc {applicant_id} created.")

@scheduler_fn.on_schedule(schedule="0 0 * * *")
def nightly_crm_scoring(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Scheduled night cron task. Collects all active deal documents from 'opportunities'
    and triggers Gemini evaluation of likelihood of closing and attrition danger.
    """
    print("Initiating scheduled nightly lead scoring pipeline...")
    db = firestore.client()
    
    # Query opportunities
    opportunities_ref = db.collection("opportunities")
    docs = opportunities_ref.stream()

    deals_list = []
    deal_docs = {}
    for doc in docs:
        data = doc.to_dict()
        doc_id = doc.id
        deal_docs[doc_id] = data
        
        # Package concise deal context for the LLM
        deals_list.append({
            "id": doc_id,
            "title": data.get("title", "Untitled Deal"),
            "value": data.get("value", 0.0),
            "stage": data.get("kanban_stage", "Lead"),
            "customer": data.get("company", "Unknown"),
            "age_days": data.get("daysInStage", 5) # dummy or stored metric
        })

    if not deals_list:
        print("No opportunities found for evaluation.")
        return

    print(f"Loaded {len(deals_list)} active opportunities. Submitting to batch evaluation...")

    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert sales performance algorithm. Analyse the following sales pipeline opportunities and estimate the probability of closing successfully (ai_lead_score, 0-100) and the risk of the customer walking away (ai_churn_risk, 0-100).
    Take into account factors like value size, velocity in stage, and customer profile.
    
    ACTIVE PIPELINE DATA:
    {deals_list}
    """

    response = client.models.generate_content(
        model='gemini-3.8-flash',
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BatchScoringResponse,
        ),
    )

    batch_output = BatchScoringResponse.model_validate_json(response.text.strip())
    
    # Write batches back to firestore
    batch = db.batch()
    updated_count = 0

    for prediction in batch_output.predictions:
        target_id = prediction.id
        if target_id in deal_docs:
            ref = opportunities_ref.document(target_id)
            batch.update(ref, {
                "ai_lead_score": prediction.ai_lead_score,
                "ai_churn_risk": prediction.ai_churn_risk,
                "ai_scoring_reason": prediction.reasoning,
                "lastScoredAt": firestore.SERVER_TIMESTAMP
            })
            updated_count += 1

    if updated_count > 0:
        batch.commit()
        print(f"Batch writes committed. Updated lead scores and churn risks for {updated_count} deals.")
    else:
        print("No prediction IDs matched active opportunity records.")

