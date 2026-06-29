from fastapi import APIRouter

router = APIRouter()


@router.get("")
def profiles_status() -> dict[str, str]:
    return {"module": "profiles", "status": "planned"}
