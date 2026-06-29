from fastapi import APIRouter

router = APIRouter()


@router.get("")
def evaluation_status() -> dict[str, str]:
    return {"module": "evaluation", "status": "planned"}
