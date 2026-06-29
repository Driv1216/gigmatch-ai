from fastapi import APIRouter

router = APIRouter()


@router.get("")
def matching_status() -> dict[str, str]:
    return {"module": "matching", "status": "planned"}
