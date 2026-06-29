from fastapi import APIRouter

router = APIRouter()


@router.get("")
def gigs_status() -> dict[str, str]:
    return {"module": "gigs", "status": "planned"}
