import asyncio
import json
import unittest
from unittest.mock import patch

from app.main import app
from app.services.document_text_extractor import SCANNED_PDF_WARNING
from tests.test_document_text_extractor import make_blank_pdf, make_test_docx, make_test_pdf


def post_multipart_file(
    path: str,
    *,
    field_name: str = "file",
    file_name: str = "resume.pdf",
    file_bytes: bytes,
    content_type: str = "application/octet-stream",
) -> tuple[int, dict[str, object]]:
    return asyncio.run(
        _post_multipart_file(
            path,
            field_name=field_name,
            file_name=file_name,
            file_bytes=file_bytes,
            content_type=content_type,
        )
    )


def post_two_multipart_files(path: str) -> tuple[int, dict[str, object]]:
    return asyncio.run(_post_two_multipart_files(path))


def post_without_file(path: str) -> tuple[int, dict[str, object]]:
    return asyncio.run(_post_without_file(path))


async def _post_multipart_file(
    path: str,
    *,
    field_name: str,
    file_name: str,
    file_bytes: bytes,
    content_type: str,
) -> tuple[int, dict[str, object]]:
    boundary = "gigmatch-test-boundary"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'
        f"Content-Type: {content_type}\r\n"
        "\r\n"
    ).encode("utf-8")
    body += file_bytes
    body += f"\r\n--{boundary}--\r\n".encode("utf-8")

    events: list[dict[str, object]] = []
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
            (b"content-type", f"multipart/form-data; boundary={boundary}".encode("ascii")),
            (b"content-length", str(len(body)).encode("ascii")),
        ],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive() -> dict[str, object]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, object]) -> None:
        events.append(message)

    await app(scope, receive, send)

    status = next(event["status"] for event in events if event["type"] == "http.response.start")
    response_body = b"".join(
        event.get("body", b"") for event in events if event["type"] == "http.response.body"
    )
    return int(status), json.loads(response_body.decode("utf-8"))


async def _post_without_file(path: str) -> tuple[int, dict[str, object]]:
    events: list[dict[str, object]] = []
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
            (b"content-length", b"0"),
        ],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive() -> dict[str, object]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": b"", "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, object]) -> None:
        events.append(message)

    await app(scope, receive, send)

    status = next(event["status"] for event in events if event["type"] == "http.response.start")
    response_body = b"".join(
        event.get("body", b"") for event in events if event["type"] == "http.response.body"
    )
    return int(status), json.loads(response_body.decode("utf-8"))


async def _post_two_multipart_files(path: str) -> tuple[int, dict[str, object]]:
    boundary = "gigmatch-test-boundary"
    first_file = make_test_pdf("First resume")
    second_file = make_test_pdf("Second resume")
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="first.pdf"\r\n'
        "Content-Type: application/pdf\r\n"
        "\r\n"
    ).encode("utf-8")
    body += first_file
    body += (
        f"\r\n--{boundary}\r\n"
        'Content-Disposition: form-data; name="extra"; filename="second.pdf"\r\n'
        "Content-Type: application/pdf\r\n"
        "\r\n"
    ).encode("utf-8")
    body += second_file
    body += f"\r\n--{boundary}--\r\n".encode("utf-8")

    events: list[dict[str, object]] = []
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
            (b"content-type", f"multipart/form-data; boundary={boundary}".encode("ascii")),
            (b"content-length", str(len(body)).encode("ascii")),
        ],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive() -> dict[str, object]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message: dict[str, object]) -> None:
        events.append(message)

    await app(scope, receive, send)

    status = next(event["status"] for event in events if event["type"] == "http.response.start")
    response_body = b"".join(
        event.get("body", b"") for event in events if event["type"] == "http.response.body"
    )
    return int(status), json.loads(response_body.decode("utf-8"))


class ResumeDocumentExtractionEndpointTests(unittest.TestCase):
    def test_valid_pdf_returns_extracted_text_and_metadata(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.pdf",
            file_bytes=make_test_pdf("GigMatch PDF Resume"),
            content_type="application/pdf",
        )

        self.assertEqual(status, 200)
        self.assertIn("GigMatch PDF Resume", data["text"])
        self.assertEqual(data["source"]["file_name"], "resume.pdf")
        self.assertEqual(data["source"]["file_type"], "pdf")
        self.assertEqual(data["source"]["page_count"], 1)
        self.assertIsNone(data["source"]["paragraph_count"])
        self.assertEqual(data["source"]["warnings"], [])

    def test_valid_docx_returns_extracted_text_and_metadata(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.docx",
            file_bytes=make_test_docx(["GigMatch DOCX Resume", "React FastAPI PostgreSQL"]),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertEqual(status, 200)
        self.assertIn("GigMatch DOCX Resume", data["text"])
        self.assertIn("React FastAPI PostgreSQL", data["text"])
        self.assertEqual(data["source"]["file_name"], "resume.docx")
        self.assertEqual(data["source"]["file_type"], "docx")
        self.assertIsNone(data["source"]["page_count"])
        self.assertEqual(data["source"]["paragraph_count"], 2)
        self.assertEqual(data["source"]["warnings"], [])

    def test_unsupported_file_type_is_rejected(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.txt",
            file_bytes=b"React FastAPI",
            content_type="text/plain",
        )

        self.assertEqual(status, 400)
        self.assertIn("Unsupported document type", data["detail"])

    def test_wrong_extension_is_rejected_even_with_pdf_content(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.txt",
            file_bytes=make_test_pdf("Actually a PDF"),
            content_type="application/pdf",
        )

        self.assertEqual(status, 400)
        self.assertIn("Unsupported document type", data["detail"])

    def test_multiple_uploaded_files_are_rejected(self):
        status, data = post_two_multipart_files("/parsing/resume/extract-document")

        self.assertEqual(status, 400)
        self.assertIn("Exactly one", data["detail"])

    def test_missing_file_is_rejected_by_validation(self):
        status, data = post_without_file("/parsing/resume/extract-document")

        self.assertEqual(status, 422)
        self.assertIn("detail", data)

    def test_empty_file_is_rejected(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.pdf",
            file_bytes=b"",
            content_type="application/pdf",
        )

        self.assertEqual(status, 400)
        self.assertIn("empty", data["detail"])

    def test_invalid_pdf_is_rejected_clearly(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.pdf",
            file_bytes=b"not a pdf",
            content_type="application/pdf",
        )

        self.assertEqual(status, 400)
        self.assertIn("PDF", data["detail"])

    def test_invalid_docx_is_rejected_clearly(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.docx",
            file_bytes=b"not a docx",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertEqual(status, 400)
        self.assertIn("DOCX", data["detail"])

    def test_oversized_file_is_rejected(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.pdf",
            file_bytes=b"x" * (5 * 1024 * 1024 + 1),
            content_type="application/pdf",
        )

        self.assertEqual(status, 413)
        self.assertIn("too large", data["detail"])

    def test_blank_scanned_style_pdf_is_rejected_with_manual_fallback_message(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.pdf",
            file_bytes=make_blank_pdf(),
            content_type="application/pdf",
        )

        self.assertEqual(status, 400)
        self.assertEqual(data["detail"], SCANNED_PDF_WARNING)

    def test_near_empty_docx_is_rejected_with_safe_message(self):
        status, data = post_multipart_file(
            "/parsing/resume/extract-document",
            file_name="resume.docx",
            file_bytes=make_test_docx(["", "   "]),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertEqual(status, 400)
        self.assertIn("did not contain readable paragraph text", data["detail"])

    def test_endpoint_does_not_call_skill_parser(self):
        with patch("app.api.routes.parsing.extract_skills", side_effect=AssertionError("parser called")):
            status, data = post_multipart_file(
                "/parsing/resume/extract-document",
                file_name="resume.pdf",
                file_bytes=make_test_pdf("Only extract document text"),
                content_type="application/pdf",
            )

        self.assertEqual(status, 200)
        self.assertIn("Only extract document text", data["text"])
