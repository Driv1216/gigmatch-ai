import asyncio
import json
import unittest
from typing import Any

from app.main import app


def post_json(path: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    return asyncio.run(_post_json(path, payload))


async def _post_json(path: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    body = json.dumps(payload).encode("utf-8")
    events: list[dict[str, Any]] = []
    request_sent = False

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": [
            (b"host", b"testserver"),
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("ascii")),
        ],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive() -> dict[str, Any]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, Any]) -> None:
        events.append(message)

    await app(scope, receive, send)

    status = next(event["status"] for event in events if event["type"] == "http.response.start")
    response_body = b"".join(
        event.get("body", b"") for event in events if event["type"] == "http.response.body"
    )
    return status, json.loads(response_body.decode("utf-8"))


class ParsingRouteTests(unittest.TestCase):
    def test_extract_skills_basic_stack(self):
        status, data = post_json(
            "/parsing/extract-skills",
            {"text": "Need React, FastAPI, PostgreSQL, Supabase, and Docker experience."},
        )

        self.assertEqual(status, 200)
        self.assertEqual(data["skills"], ["React", "FastAPI", "PostgreSQL", "Supabase", "Docker"])
        self.assertEqual(data["categories"], ["frontend", "backend", "database", "devops"])
        self.assertEqual(data["matched_terms"], ["react", "fastapi", "postgresql", "supabase", "docker"])

    def test_empty_text_returns_empty_deterministic_result(self):
        status, data = post_json("/parsing/extract-skills", {"text": ""})

        self.assertEqual(status, 200)
        self.assertEqual(
            data,
            {
                "skills": [],
                "categories": [],
                "matched_terms": [],
                "unmatched_keywords": [],
                "confidence": "deterministic",
            },
        )

    def test_whitespace_only_text_returns_empty_deterministic_result(self):
        status, data = post_json("/parsing/extract-skills", {"text": "   \n\t   "})

        self.assertEqual(status, 200)
        self.assertEqual(data["skills"], [])
        self.assertEqual(data["categories"], [])
        self.assertEqual(data["matched_terms"], [])
        self.assertEqual(data["confidence"], "deterministic")

    def test_js_maps_to_javascript(self):
        status, data = post_json("/parsing/extract-skills", {"text": "Need JS work."})

        self.assertEqual(status, 200)
        self.assertEqual(data["skills"], ["JavaScript"])

    def test_postgres_maps_to_postgresql(self):
        status, data = post_json("/parsing/extract-skills", {"text": "Need postgres tuning."})

        self.assertEqual(status, 200)
        self.assertEqual(data["skills"], ["PostgreSQL"])

    def test_node_variants_map_to_nodejs(self):
        status, data = post_json("/parsing/extract-skills", {"text": "node.js and node js services"})

        self.assertEqual(status, 200)
        self.assertEqual(data["skills"], ["Node.js"])
        self.assertEqual(data["matched_terms"], ["node.js", "node js"])

    def test_reactive_does_not_return_react(self):
        status, data = post_json("/parsing/extract-skills", {"text": "Reactive systems experience"})

        self.assertEqual(status, 200)
        self.assertNotIn("React", data["skills"])

    def test_symbol_heavy_skills_are_handled(self):
        status, data = post_json("/parsing/extract-skills", {"text": "C++, C#, .NET, and Node.js"})

        self.assertEqual(status, 200)
        self.assertEqual(data["skills"], ["C++", "C#", ".NET", "Node.js"])
        self.assertEqual(data["matched_terms"], ["c++", "c#", ".net", "node.js"])

    def test_response_includes_all_required_keys(self):
        status, data = post_json("/parsing/extract-skills", {"text": "React"})

        self.assertEqual(status, 200)
        self.assertEqual(
            set(data.keys()),
            {"skills", "categories", "matched_terms", "unmatched_keywords", "confidence"},
        )

    def test_rejects_non_string_text(self):
        status, data = post_json("/parsing/extract-skills", {"text": 123})

        self.assertEqual(status, 422)
        self.assertIn("detail", data)

    def test_rejects_oversized_text(self):
        status, data = post_json("/parsing/extract-skills", {"text": "a" * 50001})

        self.assertEqual(status, 422)
        self.assertIn("detail", data)
