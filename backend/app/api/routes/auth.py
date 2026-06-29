from fastapi import APIRouter

router = APIRouter()


@router.get("")
def auth_status() -> dict[str, str]:
    return {"module": "auth", "status": "planned"}
