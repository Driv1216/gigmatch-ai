from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import applicant_review, applications, auth, contact_exchange, engagements, evaluation, gigs, health, matching, parsing, profiles, qa, selections
from app.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(gigs.router, prefix="/gigs", tags=["gigs"])
app.include_router(applications.router, tags=["applications"])
app.include_router(applicant_review.router, tags=["applicant-review"])
app.include_router(qa.router, tags=["application-qa"])
app.include_router(selections.router, tags=["selection-requests"])
app.include_router(engagements.router, tags=["engagements"])
app.include_router(contact_exchange.router, tags=["contact-exchange"])
app.include_router(parsing.router, prefix="/parsing", tags=["parsing"])
app.include_router(matching.router, prefix="/matching", tags=["matching"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
